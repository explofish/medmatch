const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Get all employers (public endpoint)
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { 
      industry,
      location,
      isVerified,
      limit = 20, 
      offset = 0 
    } = req.query;

    let query = `
      SELECT ep.*, u.email
      FROM employer_profiles ep
      JOIN users u ON ep.user_id = u.id
      WHERE u.is_active = true
    `;
    
    const params = [];
    let paramCount = 0;

    if (industry) {
      paramCount++;
      query += ` AND ep.industry ILIKE $${paramCount}`;
      params.push(`%${industry}%`);
    }

    if (location) {
      paramCount++;
      query += ` AND (ep.location_city ILIKE $${paramCount} OR ep.location_state ILIKE $${paramCount})`;
      params.push(`%${location}%`);
    }

    if (isVerified !== undefined) {
      paramCount++;
      query += ` AND ep.is_verified = $${paramCount}`;
      params.push(isVerified === 'true');
    }

    query += ` ORDER BY ep.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get employers error:', error);
    res.status(500).json({ error: 'Failed to get employers' });
  }
});

// Get employer by ID
router.get('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;

    const result = await db.query(
      `SELECT ep.*, u.email,
        (SELECT COUNT(*) FROM jobs WHERE employer_id = ep.id AND status = 'active') as active_jobs_count
      FROM employer_profiles ep
      JOIN users u ON ep.user_id = u.id
      WHERE ep.id = $1 AND u.is_active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get employer error:', error);
    res.status(500).json({ error: 'Failed to get employer' });
  }
});

// Update my employer profile (authenticated)
router.patch('/me', authenticateToken, [
  body('companyName').optional().trim(),
  body('companyDescription').optional().trim(),
  body('companyWebsite').optional().trim(),
  body('companySize').optional().isIn(['1-10', '11-50', '51-200', '201-1000', '1000+']),
  body('industry').optional().trim(),
  body('locationCity').optional().trim(),
  body('locationState').optional().trim(),
  body('contactPersonName').optional().trim(),
  body('contactPhone').optional().trim(),
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
      return res.status(403).json({ error: 'Only employers can update this profile' });
    }

    const {
      companyName,
      companyDescription,
      companyWebsite,
      companySize,
      industry,
      locationCity,
      locationState,
      contactPersonName,
      contactPhone
    } = req.body;

    const result = await db.query(
      `UPDATE employer_profiles 
       SET company_name = COALESCE($1, company_name),
           company_description = COALESCE($2, company_description),
           company_website = COALESCE($3, company_website),
           company_size = COALESCE($4, company_size),
           industry = COALESCE($5, industry),
           location_city = COALESCE($6, location_city),
           location_state = COALESCE($7, location_state),
           contact_person_name = COALESCE($8, contact_person_name),
           contact_phone = COALESCE($9, contact_phone),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $10
       RETURNING *`,
      [companyName, companyDescription, companyWebsite, companySize, industry,
       locationCity, locationState, contactPersonName, contactPhone, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      profile: result.rows[0]
    });
  } catch (error) {
    console.error('Update employer profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get my employer jobs
router.get('/me/jobs', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { userId } = req.user;

    // Get employer profile ID
    const profileResult = await db.query(
      'SELECT id FROM employer_profiles WHERE user_id = $1',
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employer profile not found' });
    }

    const employerId = profileResult.rows[0].id;

    const result = await db.query(
      `SELECT j.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'name', s.name
            )
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'
        ) as specializations,
        (SELECT COUNT(*) FROM applications WHERE job_id = j.id) as applications_count
      FROM jobs j
      LEFT JOIN job_specializations js ON j.id = js.job_id
      LEFT JOIN specializations s ON js.specialization_id = s.id
      WHERE j.employer_id = $1
      GROUP BY j.id
      ORDER BY j.created_at DESC`,
      [employerId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get employer jobs error:', error);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
});

module.exports = router;
