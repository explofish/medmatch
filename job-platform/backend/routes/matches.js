const express = require('express');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Get my matches (graduate view)
router.get('/my-matches', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { userId } = req.user;
    const { minScore = 50, limit = 20 } = req.query;

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
      `SELECT m.*, j.title, j.description, j.location_city, j.location_state,
        j.is_remote, j.is_hybrid, j.job_type, j.salary_min, j.salary_max, j.salary_currency,
        j.status as job_status, ep.company_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'name', s.name
            )
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'
        ) as specializations
      FROM matches m
      JOIN jobs j ON m.job_id = j.id
      JOIN employer_profiles ep ON j.employer_id = ep.id
      LEFT JOIN job_specializations js ON j.id = js.job_id
      LEFT JOIN specializations s ON js.specialization_id = s.id
      WHERE m.graduate_id = $1 AND m.match_score >= $2 AND j.status = 'active'
      GROUP BY m.id, j.id, ep.company_name
      ORDER BY m.match_score DESC, m.created_at DESC
      LIMIT $3`,
      [graduateId, minScore, parseInt(limit)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ error: 'Failed to get matches' });
  }
});

// Get matches for my jobs (employer view)
router.get('/job-matches', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { userId } = req.user;
    const { jobId, minScore = 50, limit = 20 } = req.query;

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
      SELECT m.*, gp.first_name, gp.last_name, gp.location_city, gp.education_level,
        gp.university, gp.graduation_year, gp.is_open_to_work,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'name', s.name,
              'proficiencyLevel', gs.proficiency_level
            )
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'
        ) as specializations
      FROM matches m
      JOIN graduate_profiles gp ON m.graduate_id = gp.id
      JOIN jobs j ON m.job_id = j.id
      LEFT JOIN graduate_specializations gs ON gp.id = gs.graduate_id
      LEFT JOIN specializations s ON gs.specialization_id = s.id
      WHERE j.employer_id = $1 AND m.match_score >= $2
    `;
    
    const params = [employerId, minScore];
    let paramCount = 2;

    if (jobId) {
      paramCount++;
      query += ` AND m.job_id = $${paramCount}`;
      params.push(jobId);
    }

    query += ` GROUP BY m.id, gp.id ORDER BY m.match_score DESC LIMIT $${++paramCount}`;
    params.push(parseInt(limit));

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get job matches error:', error);
    res.status(500).json({ error: 'Failed to get matches' });
  }
});

// Mark match as viewed
router.patch('/:id/viewed', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { userId } = req.user;
    const { id } = req.params;
    const { userType } = req.user;

    let updateField = userType === 'graduate' ? 'is_viewed_by_graduate' : 'is_viewed_by_employer';

    await db.query(
      `UPDATE matches SET ${updateField} = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Match marked as viewed' });
  } catch (error) {
    console.error('Update match error:', error);
    res.status(500).json({ error: 'Failed to update match' });
  }
});

// Save/unsave match (graduate only)
router.patch('/:id/save', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { userId } = req.user;
    const { id } = req.params;
    const { saved } = req.body;

    // Verify graduate owns this match
    const profileResult = await db.query(
      `SELECT gp.id FROM matches m
       JOIN graduate_profiles gp ON m.graduate_id = gp.id
       WHERE m.id = $1 AND gp.user_id = $2`,
      [id, userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.query(
      'UPDATE matches SET is_saved_by_graduate = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [saved, id]
    );

    res.json({ message: saved ? 'Match saved' : 'Match unsaved' });
  } catch (error) {
    console.error('Save match error:', error);
    res.status(500).json({ error: 'Failed to save match' });
  }
});

// Generate matches for a graduate (manual trigger or scheduled job)
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { userId } = req.user;

    // Get graduate profile
    const profileResult = await db.query(
      `SELECT gp.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'name', s.name
            )
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'
        ) as specializations
      FROM graduate_profiles gp
      LEFT JOIN graduate_specializations gs ON gp.id = gs.graduate_id
      LEFT JOIN specializations s ON gs.specialization_id = s.id
      WHERE gp.user_id = $1
      GROUP BY gp.id`,
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Graduate profile not found' });
    }

    const graduate = profileResult.rows[0];

    // Get active jobs
    const jobsResult = await db.query(
      `SELECT j.*, 
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
      LEFT JOIN job_specializations js ON j.id = js.job_id
      LEFT JOIN specializations s ON js.specialization_id = s.id
      WHERE j.status = 'active'
      GROUP BY j.id`,
    );

    const matches = [];

    for (const job of jobsResult.rows) {
      let score = 0;
      const reasons = [];

      // Calculate specialization match (40 points max)
      const graduateSpecIds = graduate.specializations.map(s => s.id);
      const jobSpecs = job.specializations || [];
      const matchingSpecs = jobSpecs.filter(js => graduateSpecIds.includes(js.id));
      
      if (matchingSpecs.length > 0) {
        const specScore = Math.min(40, matchingSpecs.length * 10);
        score += specScore;
        reasons.push(`${matchingSpecs.length} matching specialization(s)`);
      }

      // Location match (30 points max)
      if (job.is_remote) {
        score += 30;
        reasons.push('Remote position');
      } else if (job.location_city && graduate.location_city && 
                 job.location_city.toLowerCase() === graduate.location_city.toLowerCase()) {
        score += 30;
        reasons.push('Same city');
      } else if (job.location_state && graduate.location_state && 
                 job.location_state.toLowerCase() === graduate.location_state.toLowerCase()) {
        score += 20;
        reasons.push('Same state/region');
      }

      // Job type preference (20 points)
      const preferredTypes = graduate.preferred_job_types || [];
      if (preferredTypes.includes(job.job_type)) {
        score += 20;
        reasons.push('Preferred job type');
      }

      // Salary match (10 points)
      if (job.salary_min && graduate.expected_salary_max && 
          job.salary_min >= graduate.expected_salary_min * 0.8) {
        score += 10;
        reasons.push('Salary in expected range');
      }

      // Minimum score threshold
      if (score >= 30) {
        matches.push({
          graduateId: graduate.id,
          jobId: job.id,
          score: Math.min(100, score),
          reasons
        });
      }
    }

    // Insert or update matches
    for (const match of matches) {
      await db.query(
        `INSERT INTO matches (id, graduate_id, job_id, match_score, match_reasons)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (graduate_id, job_id) 
         DO UPDATE SET match_score = $4, match_reasons = $5, updated_at = CURRENT_TIMESTAMP`,
        [uuidv4(), match.graduateId, match.jobId, match.score, JSON.stringify(match.reasons)]
      );
    }

    res.json({
      message: `Generated ${matches.length} matches`,
      matchesFound: matches.length
    });
  } catch (error) {
    console.error('Generate matches error:', error);
    res.status(500).json({ error: 'Failed to generate matches' });
  }
});

module.exports = router;
