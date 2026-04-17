const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Get my applications (graduate view)
router.get('/my-applications', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { userId } = req.user;

    // Get graduate profile ID
    const profileResult = await db.query(
      'SELECT id FROM graduate_profiles WHERE user_id = $1',
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Graduate profile not found' });
    }

    const graduateId = profileResult.rows[0].id;

    const result = await db.query(
      `SELECT a.*, j.title as job_title, j.location_city, j.job_type,
        ep.company_name, j.salary_min, j.salary_max, j.salary_currency
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN employer_profiles ep ON j.employer_id = ep.id
      WHERE a.graduate_id = $1
      ORDER BY a.submitted_at DESC`,
      [graduateId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get my applications error:', error);
    res.status(500).json({ error: 'Failed to get applications' });
  }
});

// Get applications for my jobs (employer view)
router.get('/received', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { userId } = req.user;
    const { status, jobId } = req.query;

    // Get employer profile ID
    const profileResult = await db.query(
      'SELECT id FROM employer_profiles WHERE user_id = $1',
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employer profile not found' });
    }

    const employerId = profileResult.rows[0].id;

    let query = `
      SELECT a.*, j.title as job_title, j.location_city,
        gp.first_name, gp.last_name, gp.location_city as applicant_city,
        u.email as applicant_email
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN graduate_profiles gp ON a.graduate_id = gp.id
      JOIN users u ON gp.user_id = u.id
      WHERE j.employer_id = $1
    `;
    
    const params = [employerId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND a.status = $${paramCount}`;
      params.push(status);
    }

    if (jobId) {
      paramCount++;
      query += ` AND a.job_id = $${paramCount}`;
      params.push(jobId);
    }

    query += ` ORDER BY a.submitted_at DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get received applications error:', error);
    res.status(500).json({ error: 'Failed to get applications' });
  }
});

// Submit application (graduate only)
router.post('/', authenticateToken, [
  body('jobId').isUUID(),
  body('coverLetter').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = req.app.locals.db;
    const { userId } = req.user;
    const { jobId, coverLetter } = req.body;

    // Verify user is a graduate
    const userCheck = await db.query(
      'SELECT user_type FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0 || userCheck.rows[0].user_type !== 'graduate') {
      return res.status(403).json({ error: 'Only graduates can apply for jobs' });
    }

    // Get graduate profile ID
    const profileResult = await db.query(
      'SELECT id FROM graduate_profiles WHERE user_id = $1',
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Graduate profile not found' });
    }

    const graduateId = profileResult.rows[0].id;

    // Check if job exists and is active
    const jobCheck = await db.query(
      'SELECT status FROM jobs WHERE id = $1',
      [jobId]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (jobCheck.rows[0].status !== 'active') {
      return res.status(400).json({ error: 'This job is no longer accepting applications' });
    }

    // Check if already applied
    const existingApplication = await db.query(
      'SELECT id FROM applications WHERE job_id = $1 AND graduate_id = $2',
      [jobId, graduateId]
    );

    if (existingApplication.rows.length > 0) {
      return res.status(409).json({ error: 'You have already applied for this job' });
    }

    // Create application
    const result = await db.query(
      `INSERT INTO applications (id, job_id, graduate_id, cover_letter)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [uuidv4(), jobId, graduateId, coverLetter]
    );

    // Create notification for employer
    const employerResult = await db.query(
      `SELECT ep.user_id, j.title FROM jobs j
       JOIN employer_profiles ep ON j.employer_id = ep.id
       WHERE j.id = $1`,
      [jobId]
    );

    if (employerResult.rows.length > 0) {
      await db.query(
        `INSERT INTO notifications (id, user_id, type, title, message, related_entity_type, related_entity_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [uuidv4(), employerResult.rows[0].user_id, 'application_received', 
         'New Application Received', 
         `Someone applied for your job posting: ${employerResult.rows[0].title}`,
         'application', result.rows[0].id]
      );
    }

    res.status(201).json({
      message: 'Application submitted successfully',
      application: result.rows[0]
    });
  } catch (error) {
    console.error('Submit application error:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Update application status (employer only)
router.patch('/:id/status', authenticateToken, [
  body('status').isIn(['viewed', 'shortlisted', 'rejected', 'interview_scheduled', 'offer_made', 'hired']),
  body('employerNotes').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = req.app.locals.db;
    const { userId } = req.user;
    const { id } = req.params;
    const { status, employerNotes } = req.body;

    // Verify user is an employer and owns the job this application is for
    const ownershipCheck = await db.query(
      `SELECT a.id, j.title, gp.user_id as graduate_user_id
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       JOIN employer_profiles ep ON j.employer_id = ep.id
       JOIN graduate_profiles gp ON a.graduate_id = gp.id
       WHERE a.id = $1 AND ep.user_id = $2`,
      [id, userId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to update this application' });
    }

    const result = await db.query(
      `UPDATE applications 
       SET status = $1, employer_notes = COALESCE($2, employer_notes), updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, employerNotes, id]
    );

    // Notify graduate about status change
    const notificationType = status === 'interview_scheduled' ? 'interview_scheduled' : 
                            status === 'rejected' ? 'application_rejected' :
                            status === 'offer_made' ? 'offer_made' : 'application_viewed';
    
    await db.query(
      `INSERT INTO notifications (id, user_id, type, title, message, related_entity_type, related_entity_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [uuidv4(), ownershipCheck.rows[0].graduate_user_id, notificationType,
       `Application ${status.replace('_', ' ')}`,
       `Your application for "${ownershipCheck.rows[0].title}" has been ${status.replace('_', ' ')}`,
       'application', id]
    );

    res.json({
      message: 'Application status updated successfully',
      application: result.rows[0]
    });
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// Withdraw application (graduate only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { userId } = req.user;
    const { id } = req.params;

    // Get graduate profile ID
    const profileResult = await db.query(
      'SELECT id FROM graduate_profiles WHERE user_id = $1',
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Graduate profile not found' });
    }

    const graduateId = profileResult.rows[0].id;

    // Check ownership
    const ownershipCheck = await db.query(
      'SELECT id FROM applications WHERE id = $1 AND graduate_id = $2',
      [id, graduateId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to withdraw this application' });
    }

    await db.query(
      "UPDATE applications SET status = 'withdrawn', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );

    res.json({ message: 'Application withdrawn successfully' });
  } catch (error) {
    console.error('Withdraw application error:', error);
    res.status(500).json({ error: 'Failed to withdraw application' });
  }
});

module.exports = router;
