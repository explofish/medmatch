const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Get all jobs (public endpoint with filters)
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { 
      specialization,
      location,
      jobType,
      isRemote,
      salaryMin,
      status = 'active',
      limit = 20, 
      offset = 0 
    } = req.query;

    let query = `
      SELECT j.*, ep.company_name, ep.location_city as employer_city,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'name', s.name,
              'isRequired', js.is_required
            )
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'
        ) as specializations
      FROM jobs j
      JOIN employer_profiles ep ON j.employer_id = ep.id
      JOIN users u ON ep.user_id = u.id
      LEFT JOIN job_specializations js ON j.id = js.job_id
      LEFT JOIN specializations s ON js.specialization_id = s.id
      WHERE u.is_active = true
    `;
    
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND j.status = $${paramCount}`;
      params.push(status);
    }

    if (specialization) {
      paramCount++;
      query += ` AND EXISTS (
        SELECT 1 FROM job_specializations js2
        JOIN specializations s2 ON js2.specialization_id = s2.id
        WHERE js2.job_id = j.id AND s2.name = $${paramCount}
      )`;
      params.push(specialization);
    }

    if (location) {
      paramCount++;
      query += ` AND (j.location_city ILIKE $${paramCount} OR j.location_state ILIKE $${paramCount})`;
      params.push(`%${location}%`);
    }

    if (jobType) {
      paramCount++;
      query += ` AND j.job_type = $${paramCount}`;
      params.push(jobType);
    }

    if (isRemote !== undefined) {
      paramCount++;
      query += ` AND j.is_remote = $${paramCount}`;
      params.push(isRemote === 'true');
    }

    if (salaryMin) {
      paramCount++;
      query += ` AND j.salary_max >= $${paramCount}`;
      params.push(parseInt(salaryMin));
    }

    query += ` GROUP BY j.id, ep.company_name, ep.location_city ORDER BY j.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
});

// Get job by ID
router.get('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;

    const result = await db.query(
      `SELECT j.*, ep.company_name, ep.company_description, ep.company_website, 
        ep.location_city as employer_city, ep.location_state as employer_state,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'name', s.name,
              'category', s.category,
              'isRequired', js.is_required
            )
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'
        ) as specializations
      FROM jobs j
      JOIN employer_profiles ep ON j.employer_id = ep.id
      JOIN users u ON ep.user_id = u.id
      LEFT JOIN job_specializations js ON j.id = js.job_id
      LEFT JOIN specializations s ON js.specialization_id = s.id
      WHERE j.id = $1 AND u.is_active = true
      GROUP BY j.id, ep.company_name, ep.company_description, ep.company_website, ep.location_city, ep.location_state`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Failed to get job' });
  }
});

// Create new job (employer only)
router.post('/', authenticateToken, [
  body('title').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('jobType').isIn(['full_time', 'part_time', 'locum', 'contract', 'internship']),
  body('locationCity').optional().trim(),
  body('salaryMin').optional().isInt(),
  body('salaryMax').optional().isInt(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = req.app.locals.db;
    const { userId } = req.user;

    // Verify user is an employer
    const userCheck = await db.query(
      'SELECT user_type FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0 || userCheck.rows[0].user_type !== 'employer') {
      return res.status(403).json({ error: 'Only employers can post jobs' });
    }

    // Get employer profile ID
    const profileResult = await db.query(
      'SELECT id FROM employer_profiles WHERE user_id = $1',
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employer profile not found' });
    }

    const employerId = profileResult.rows[0].id;

    const {
      title,
      description,
      requirements,
      responsibilities,
      locationCity,
      locationState,
      isRemote,
      isHybrid,
      jobType,
      salaryMin,
      salaryMax,
      applicationDeadline,
      startDate,
      specializations = []
    } = req.body;

    const jobId = uuidv4();

    // Insert job
    const jobResult = await db.query(
      `INSERT INTO jobs (id, employer_id, title, description, requirements, responsibilities, 
       location_city, location_state, is_remote, is_hybrid, job_type, salary_min, salary_max, 
       application_deadline, start_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [jobId, employerId, title, description, requirements, responsibilities,
       locationCity, locationState, isRemote || false, isHybrid || false, jobType,
       salaryMin, salaryMax, applicationDeadline, startDate]
    );

    // Add specializations if provided
    if (specializations.length > 0) {
      for (const spec of specializations) {
        await db.query(
          `INSERT INTO job_specializations (job_id, specialization_id, is_required)
           VALUES ($1, $2, $3)`,
          [jobId, spec.id, spec.isRequired || true]
        );
      }
    }

    res.status(201).json({
      message: 'Job created successfully',
      job: jobResult.rows[0]
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Update job (employer only, must own the job)
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { userId } = req.user;
    const { id } = req.params;

    // Verify user is an employer and owns this job
    const ownershipCheck = await db.query(
      `SELECT j.id FROM jobs j
       JOIN employer_profiles ep ON j.employer_id = ep.id
       WHERE j.id = $1 AND ep.user_id = $2`,
      [id, userId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to update this job' });
    }

    const {
      title,
      description,
      requirements,
      responsibilities,
      locationCity,
      locationState,
      isRemote,
      isHybrid,
      jobType,
      salaryMin,
      salaryMax,
      status,
      applicationDeadline,
      startDate
    } = req.body;

    const result = await db.query(
      `UPDATE jobs 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           requirements = COALESCE($3, requirements),
           responsibilities = COALESCE($4, responsibilities),
           location_city = COALESCE($5, location_city),
           location_state = COALESCE($6, location_state),
           is_remote = COALESCE($7, is_remote),
           is_hybrid = COALESCE($8, is_hybrid),
           job_type = COALESCE($9, job_type),
           salary_min = COALESCE($10, salary_min),
           salary_max = COALESCE($11, salary_max),
           status = COALESCE($12, status),
           application_deadline = COALESCE($13, application_deadline),
           start_date = COALESCE($14, start_date),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $15
       RETURNING *`,
      [title, description, requirements, responsibilities, locationCity, locationState,
       isRemote, isHybrid, jobType, salaryMin, salaryMax, status, applicationDeadline, startDate, id]
    );

    res.json({
      message: 'Job updated successfully',
      job: result.rows[0]
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Delete job (employer only, must own the job)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { userId } = req.user;
    const { id } = req.params;

    // Verify user is an employer and owns this job
    const ownershipCheck = await db.query(
      `SELECT j.id FROM jobs j
       JOIN employer_profiles ep ON j.employer_id = ep.id
       WHERE j.id = $1 AND ep.user_id = $2`,
      [id, userId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to delete this job' });
    }

    await db.query('DELETE FROM jobs WHERE id = $1', [id]);

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

module.exports = router;
