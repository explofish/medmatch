const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Get all graduates (public endpoint with filters)
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { 
      specialization, 
      location, 
      educationLevel, 
      isOpenToWork,
      limit = 20, 
      offset = 0 
    } = req.query;

    let query = `
      SELECT gp.*, u.email,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'name', s.name,
              'category', s.category
            )
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'
        ) as specializations
      FROM graduate_profiles gp
      JOIN users u ON gp.user_id = u.id
      LEFT JOIN graduate_specializations gs ON gp.id = gs.graduate_id
      LEFT JOIN specializations s ON gs.specialization_id = s.id
      WHERE u.is_active = true
    `;
    
    const params = [];
    let paramCount = 0;

    if (specialization) {
      paramCount++;
      query += ` AND EXISTS (
        SELECT 1 FROM graduate_specializations gs2
        JOIN specializations s2 ON gs2.specialization_id = s2.id
        WHERE gs2.graduate_id = gp.id AND s2.name = $${paramCount}
      )`;
      params.push(specialization);
    }

    if (location) {
      paramCount++;
      query += ` AND (gp.location_city ILIKE $${paramCount} OR gp.location_state ILIKE $${paramCount})`;
      params.push(`%${location}%`);
    }

    if (educationLevel) {
      paramCount++;
      query += ` AND gp.education_level = $${paramCount}`;
      params.push(educationLevel);
    }

    if (isOpenToWork !== undefined) {
      paramCount++;
      query += ` AND gp.is_open_to_work = $${paramCount}`;
      params.push(isOpenToWork === 'true');
    }

    query += ` GROUP BY gp.id, u.email ORDER BY gp.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get graduates error:', error);
    res.status(500).json({ error: 'Failed to get graduates' });
  }
});

// Get graduate by ID
router.get('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;

    const result = await db.query(
      `SELECT gp.*, u.email,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'name', s.name,
              'category', s.category,
              'proficiencyLevel', gs.proficiency_level,
              'yearsExperience', gs.years_experience
            )
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'
        ) as specializations
      FROM graduate_profiles gp
      JOIN users u ON gp.user_id = u.id
      LEFT JOIN graduate_specializations gs ON gp.id = gs.graduate_id
      LEFT JOIN specializations s ON gs.specialization_id = s.id
      WHERE gp.id = $1 AND u.is_active = true
      GROUP BY gp.id, u.email`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Graduate not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get graduate error:', error);
    res.status(500).json({ error: 'Failed to get graduate' });
  }
});

// Update my graduate profile (authenticated)
router.patch('/me', authenticateToken, [
  body('firstName').optional().trim(),
  body('lastName').optional().trim(),
  body('phone').optional().trim(),
  body('locationCity').optional().trim(),
  body('locationState').optional().trim(),
  body('educationLevel').optional().isIn(['student', 'graduate', 'resident', 'specialist']),
  body('university').optional().trim(),
  body('graduationYear').optional().isInt(),
  body('profileSummary').optional().trim(),
  body('isOpenToWork').optional().isBoolean(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = req.app.locals.db;
    const { userId } = req.user;

    // Verify user is a graduate
    const userCheck = await db.query(
      'SELECT user_type FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0 || userCheck.rows[0].user_type !== 'graduate') {
      return res.status(403).json({ error: 'Only graduates can update this profile' });
    }

    const {
      firstName,
      lastName,
      phone,
      locationCity,
      locationState,
      educationLevel,
      university,
      graduationYear,
      profileSummary,
      isOpenToWork
    } = req.body;

    const result = await db.query(
      `UPDATE graduate_profiles 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone = COALESCE($3, phone),
           location_city = COALESCE($4, location_city),
           location_state = COALESCE($5, location_state),
           education_level = COALESCE($6, education_level),
           university = COALESCE($7, university),
           graduation_year = COALESCE($8, graduation_year),
           profile_summary = COALESCE($9, profile_summary),
           is_open_to_work = COALESCE($10, is_open_to_work),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $11
       RETURNING *`,
      [firstName, lastName, phone, locationCity, locationState, educationLevel, 
       university, graduationYear, profileSummary, isOpenToWork, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      profile: result.rows[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Add specialization to my profile
router.post('/me/specializations', authenticateToken, [
  body('specializationId').isUUID(),
  body('proficiencyLevel').optional().isIn(['beginner', 'intermediate', 'advanced', 'expert']),
  body('yearsExperience').optional().isInt({ min: 0 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = req.app.locals.db;
    const { userId } = req.user;
    const { specializationId, proficiencyLevel = 'intermediate', yearsExperience = 0 } = req.body;

    // Get graduate profile ID
    const profileResult = await db.query(
      'SELECT id FROM graduate_profiles WHERE user_id = $1',
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Graduate profile not found' });
    }

    const graduateId = profileResult.rows[0].id;

    // Add specialization
    await db.query(
      `INSERT INTO graduate_specializations (graduate_id, specialization_id, proficiency_level, years_experience)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (graduate_id, specialization_id) 
       DO UPDATE SET proficiency_level = $3, years_experience = $4`,
      [graduateId, specializationId, proficiencyLevel, yearsExperience]
    );

    res.json({ message: 'Specialization added successfully' });
  } catch (error) {
    console.error('Add specialization error:', error);
    res.status(500).json({ error: 'Failed to add specialization' });
  }
});

// Remove specialization from my profile
router.delete('/me/specializations/:specializationId', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { userId } = req.user;
    const { specializationId } = req.params;

    // Get graduate profile ID
    const profileResult = await db.query(
      'SELECT id FROM graduate_profiles WHERE user_id = $1',
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Graduate profile not found' });
    }

    const graduateId = profileResult.rows[0].id;

    await db.query(
      'DELETE FROM graduate_specializations WHERE graduate_id = $1 AND specialization_id = $2',
      [graduateId, specializationId]
    );

    res.json({ message: 'Specialization removed successfully' });
  } catch (error) {
    console.error('Remove specialization error:', error);
    res.status(500).json({ error: 'Failed to remove specialization' });
  }
});

module.exports = router;
