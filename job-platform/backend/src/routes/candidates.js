const express = require('express');
const router = express.Router();
const { validate, schemas } = require('../middleware/validation');
const cache = require('../utils/cache');

/**
 * GET /api/candidates
 * List candidates with filters, pagination
 */
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const {
    location,
    specialty,
    minExperience,
    maxExperience,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Validation
  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100);

  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({
      error: {
        message: 'Invalid page number',
        code: 'ERR_VALIDATION',
        details: { page: 'Must be a positive integer' }
      }
    });
  }
  if (isNaN(limitNum) || limitNum < 1) {
    return res.status(400).json({
      error: {
        message: 'Invalid limit',
        code: 'ERR_VALIDATION',
        details: { limit: 'Must be a positive integer between 1 and 100' }
      }
    });
  }

  // Generate cache key
  const cacheKey = `candidates:list:${JSON.stringify({
    location, specialty, minExperience, maxExperience, page, limit, sortBy, sortOrder
  })}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    res.set('X-Cache', 'hit');
    return res.json(cached);
  }

  // Whitelist allowed sort columns
  const allowedSortColumns = ['id', 'firstName', 'lastName', 'location', 'specialty', 'experienceYears', 'createdAt'];
  const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'createdAt';
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  // Build WHERE clause
  const conditions = ['isDeleted = 0'];
  const params = [];

  if (location) {
    conditions.push('location LIKE ?');
    params.push(`%${location}%`);
  }
  if (specialty) {
    conditions.push('specialty = ?');
    params.push(specialty);
  }
  if (minExperience !== undefined && !isNaN(parseInt(minExperience, 10))) {
    conditions.push('experienceYears >= ?');
    params.push(parseInt(minExperience, 10));
  }
  if (maxExperience !== undefined && !isNaN(parseInt(maxExperience, 10))) {
    conditions.push('experienceYears <= ?');
    params.push(parseInt(maxExperience, 10));
  }

  const whereClause = conditions.join(' AND ');
  const offset = (pageNum - 1) * limitNum;

  // Get total count
  const countSql = `SELECT COUNT(*) as total FROM candidates WHERE ${whereClause}`;

  db.get(countSql, params, (err, countRow) => {
    if (err) {
      console.error('Database error (count):', err.message);
      return res.status(500).json({
        error: {
          message: 'Database error',
          code: 'ERR_INTERNAL',
          status: 500
        }
      });
    }

    const total = countRow.total;
    const totalPages = Math.ceil(total / limitNum);

    // Get paginated results
    const dataSql = `
      SELECT 
        id, email, firstName, lastName, location, specialty,
        experienceYears, desiredSalaryMin, desiredSalaryMax,
        preferredJobType, preferredLocations, skills, cvUrl, portfolioUrl,
        createdAt, updatedAt
      FROM candidates 
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${order}
      LIMIT ? OFFSET ?
    `;

    db.all(dataSql, [...params, limitNum, offset], (err, rows) => {
      if (err) {
        console.error('Database error (data):', err.message);
        return res.status(500).json({
          error: {
            message: 'Database error',
            code: 'ERR_INTERNAL',
            status: 500
          }
        });
      }

      const response = {
        data: rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      };

      // Cache the response
      cache.set(cacheKey, response, 30 * 1000);
      res.set('X-Cache', 'miss');

      res.json(response);
    });
  });
});

/**
 * GET /api/candidates/:id
 * Get single candidate profile
 */
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({
      error: {
        message: 'Invalid candidate ID',
        code: 'ERR_VALIDATION',
        details: { id: 'Must be a valid integer' }
      }
    });
  }

  // Check cache
  const cacheKey = `candidates:detail:${id}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    res.set('X-Cache', 'hit');
    return res.json(cached);
  }

  const sql = `
    SELECT 
      id, email, firstName, lastName, location, specialty,
      experienceYears, desiredSalaryMin, desiredSalaryMax,
      preferredJobType, preferredLocations, skills, cvUrl, portfolioUrl,
      createdAt, updatedAt
    FROM candidates 
    WHERE id = ? AND isDeleted = 0
  `;

  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({
        error: {
          message: 'Database error',
          code: 'ERR_INTERNAL',
          status: 500
        }
      });
    }

    if (!row) {
      return res.status(404).json({
        error: {
          message: 'Candidate not found',
          code: 'ERR_NOT_FOUND',
          status: 404
        }
      });
    }

    // Parse skills array
    if (row.skills) {
      row.skills = row.skills.split(',').map(s => s.trim());
    }

    const response = { data: row };

    // Cache the response
    cache.set(cacheKey, response, 5 * 60 * 1000);
    res.set('X-Cache', 'miss');

    res.json(response);
  });
});

/**
 * POST /api/candidates
 * Create new candidate profile
 */
router.post('/', validate({ body: schemas.candidate }), (req, res) => {
  const db = req.app.locals.db;
  const {
    email,
    firstName,
    lastName,
    location,
    specialty,
    experienceYears,
    desiredSalaryMin,
    desiredSalaryMax,
    preferredJobType,
    preferredLocations,
    skills,
    cvUrl,
    portfolioUrl
  } = req.body;

  const sql = `
    INSERT INTO candidates (
      email, firstName, lastName, location, specialty, experienceYears,
      desiredSalaryMin, desiredSalaryMax, preferredJobType, preferredLocations,
      skills, cvUrl, portfolioUrl
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const skillsString = Array.isArray(skills) ? skills.join(', ') : skills;

  db.run(sql, [
    email.toLowerCase().trim(),
    firstName.trim(),
    lastName.trim(),
    location || null,
    specialty || null,
    experienceYears || 0,
    desiredSalaryMin || null,
    desiredSalaryMax || null,
    preferredJobType || null,
    preferredLocations || null,
    skillsString || null,
    cvUrl || null,
    portfolioUrl || null
  ], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({
          error: {
            message: 'Email already exists',
            code: 'ERR_CONFLICT',
            status: 409
          }
        });
      }
      console.error('Database error:', err.message);
      return res.status(500).json({
        error: {
          message: 'Database error',
          code: 'ERR_INTERNAL',
          status: 500
        }
      });
    }

    const newId = this.lastID;

    // Invalidate candidate list caches
    cache.invalidateByPattern('candidates:list:');

    // Fetch the created candidate
    db.get(
      `SELECT id, email, firstName, lastName, location, specialty, experienceYears,
              desiredSalaryMin, desiredSalaryMax, preferredJobType, preferredLocations,
              skills, cvUrl, portfolioUrl, createdAt, updatedAt 
       FROM candidates WHERE id = ?`,
      [newId],
      (err, row) => {
        if (err || !row) {
          return res.status(201).json({
            message: 'Candidate created successfully',
            data: { id: newId }
          });
        }

        if (row.skills) {
          row.skills = row.skills.split(',').map(s => s.trim());
        }

        res.status(201).json({
          message: 'Candidate created successfully',
          data: row
        });
      }
    );
  });
});

/**
 * PATCH /api/candidates/:id
 * Update candidate profile (partial update)
 */
router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({
      error: {
        message: 'Invalid candidate ID',
        code: 'ERR_VALIDATION',
        details: { id: 'Must be a valid integer' }
      }
    });
  }

  const updates = [];
  const params = [];
  const fields = [
    'firstName', 'lastName', 'location', 'specialty', 'experienceYears',
    'desiredSalaryMin', 'desiredSalaryMax', 'preferredJobType',
    'preferredLocations', 'cvUrl', 'portfolioUrl'
  ];

  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  });

  // Handle skills separately (convert array to string)
  if (req.body.skills !== undefined) {
    updates.push('skills = ?');
    params.push(Array.isArray(req.body.skills) ? req.body.skills.join(', ') : req.body.skills);
  }

  // Handle email separately with validation
  if (req.body.email !== undefined) {
    if (typeof req.body.email !== 'string' || !req.body.email.includes('@')) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          code: 'ERR_VALIDATION',
          details: { email: 'Invalid email format' }
        }
      });
    }
    updates.push('email = ?');
    params.push(req.body.email.toLowerCase().trim());
  }

  if (updates.length === 0) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        code: 'ERR_VALIDATION',
        details: { fields: 'No fields to update' }
      }
    });
  }

  updates.push('updatedAt = CURRENT_TIMESTAMP');
  params.push(id);

  const sql = `UPDATE candidates SET ${updates.join(', ')} WHERE id = ? AND isDeleted = 0`;

  db.run(sql, params, function (err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({
          error: {
            message: 'Email already exists',
            code: 'ERR_CONFLICT',
            status: 409
          }
        });
      }
      console.error('Database error:', err.message);
      return res.status(500).json({
        error: {
          message: 'Database error',
          code: 'ERR_INTERNAL',
          status: 500
        }
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        error: {
          message: 'Candidate not found',
          code: 'ERR_NOT_FOUND',
          status: 404
        }
      });
    }

    // Invalidate caches
    cache.delete(`candidates:detail:${id}`);
    cache.invalidateByPattern('candidates:list:');

    // Fetch updated candidate
    db.get(
      `SELECT id, email, firstName, lastName, location, specialty, experienceYears,
              desiredSalaryMin, desiredSalaryMax, preferredJobType, preferredLocations,
              skills, cvUrl, portfolioUrl, createdAt, updatedAt 
       FROM candidates WHERE id = ?`,
      [id],
      (err, row) => {
        if (err || !row) {
          return res.json({
            message: 'Candidate updated successfully',
            data: { id }
          });
        }

        if (row.skills) {
          row.skills = row.skills.split(',').map(s => s.trim());
        }

        res.json({
          message: 'Candidate updated successfully',
          data: row
        });
      }
    );
  });
});

/**
 * DELETE /api/candidates/:id
 * Soft delete candidate
 */
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({
      error: {
        message: 'Invalid candidate ID',
        code: 'ERR_VALIDATION',
        details: { id: 'Must be a valid integer' }
      }
    });
  }

  const sql = 'UPDATE candidates SET isDeleted = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND isDeleted = 0';

  db.run(sql, [id], function (err) {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({
        error: {
          message: 'Database error',
          code: 'ERR_INTERNAL',
          status: 500
        }
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        error: {
          message: 'Candidate not found',
          code: 'ERR_NOT_FOUND',
          status: 404
        }
      });
    }

    // Invalidate caches
    cache.delete(`candidates:detail:${id}`);
    cache.invalidateByPattern('candidates:list:');

    res.json({
      message: 'Candidate deleted successfully',
      data: { id }
    });
  });
});

/**
 * GET /api/candidates/:id/applications
 * Get all applications for a candidate
 */
router.get('/:id/applications', (req, res) => {
  const db = req.app.locals.db;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({
      error: {
        message: 'Invalid candidate ID',
        code: 'ERR_VALIDATION',
        details: { id: 'Must be a valid integer' }
      }
    });
  }

  // Verify candidate exists
  db.get('SELECT id FROM candidates WHERE id = ? AND isDeleted = 0', [id], (err, candidate) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({
        error: {
          message: 'Database error',
          code: 'ERR_INTERNAL',
          status: 500
        }
      });
    }
    if (!candidate) {
      return res.status(404).json({
        error: {
          message: 'Candidate not found',
          code: 'ERR_NOT_FOUND',
          status: 404
        }
      });
    }

    const sql = `
      SELECT 
        a.id, a.jobId, a.status, a.coverLetter, a.cvUrl,
        a.matchScore, a.appliedAt, a.updatedAt,
        j.title as jobTitle, j.specialty as jobSpecialty, j.location as jobLocation,
        j.salaryMin, j.salaryMax, j.jobType,
        e.name as employerName, e.type as employerType
      FROM applications a
      JOIN jobs j ON a.jobId = j.id
      JOIN employers e ON j.employerId = e.id
      WHERE a.candidateId = ? AND a.isDeleted = 0
      ORDER BY a.appliedAt DESC
    `;

    db.all(sql, [id], (err, rows) => {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).json({
          error: {
            message: 'Database error',
            code: 'ERR_INTERNAL',
            status: 500
          }
        });
      }

      res.json({
        candidateId: id,
        data: rows,
        summary: {
          total: rows.length,
          byStatus: {
            pending: rows.filter(r => r.status === 'pending').length,
            reviewed: rows.filter(r => r.status === 'reviewed').length,
            accepted: rows.filter(r => r.status === 'accepted').length,
            rejected: rows.filter(r => r.status === 'rejected').length
          }
        }
      });
    });
  });
});

/**
 * PATCH /api/candidates/:id/profile
 * Update full candidate profile (convenience endpoint)
 */
router.patch('/:id/profile', (req, res) => {
  // Reuse the existing PATCH handler
  req.url = `/${req.params.id}`;
  router.handle(req, res);
});

/**
 * GET /api/candidates/:id/matches
 * Get job matches for candidate
 */
router.get('/:id/matches', (req, res) => {
  const db = req.app.locals.db;
  const id = parseInt(req.params.id, 10);
  const {
    limit = 10,
    minScore = 0,
    specialty,
    location,
    jobType,
    excludeApplied = 'true'
  } = req.query;

  if (isNaN(id)) {
    return res.status(400).json({
      error: {
        message: 'Invalid candidate ID',
        code: 'ERR_VALIDATION',
        details: { id: 'Must be a valid integer' }
      }
    });
  }

  const limitNum = Math.min(parseInt(limit, 10) || 10, 50);
  const minScoreNum = parseInt(minScore, 10) || 0;

  // Check cache
  const cacheKey = `candidates:${id}:matches:${JSON.stringify({ limit, minScore, specialty, location, jobType, excludeApplied })}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    res.set('X-Cache', 'hit');
    return res.json(cached);
  }

  // Get candidate profile
  const candidateSql = `
    SELECT 
      id, email, firstName, lastName, location, specialty,
      experienceYears, desiredSalaryMin, desiredSalaryMax,
      preferredJobType, preferredLocations, skills
    FROM candidates 
    WHERE id = ? AND isDeleted = 0
  `;

  db.get(candidateSql, [id], (err, candidate) => {
    if (err) {
      console.error('Database error (candidate):', err.message);
      return res.status(500).json({
        error: {
          message: 'Database error',
          code: 'ERR_INTERNAL',
          status: 500
        }
      });
    }

    if (!candidate) {
      return res.status(404).json({
        error: {
          message: 'Candidate not found',
          code: 'ERR_NOT_FOUND',
          status: 404
        }
      });
    }

    // Parse comma-separated fields
    if (candidate.skills) {
      candidate.skills = candidate.skills.split(',').map(s => s.trim());
    }

    // Get jobs already applied to
    let appliedJobIds = [];
    if (excludeApplied === 'true') {
      db.all('SELECT jobId FROM applications WHERE candidateId = ? AND isDeleted = 0', [id], (err, rows) => {
        if (!err && rows) {
          appliedJobIds = rows.map(r => r.jobId);
        }
        continueWithMatches();
      });
    } else {
      continueWithMatches();
    }

    function continueWithMatches() {
      // Build job filters
      const jobConditions = ['j.isDeleted = 0', 'j.status = ?'];
      const jobParams = ['active'];

      if (specialty) {
        jobConditions.push('j.specialty = ?');
        jobParams.push(specialty);
      }
      if (location) {
        jobConditions.push('j.location LIKE ?');
        jobParams.push(`%${location}%`);
      }
      if (jobType) {
        jobConditions.push('j.jobType = ?');
        jobParams.push(jobType);
      }

      // Exclude applied jobs
      if (appliedJobIds.length > 0) {
        jobConditions.push(`j.id NOT IN (${appliedJobIds.map(() => '?').join(',')})`);
        jobParams.push(...appliedJobIds);
      }

      // Get active jobs
      const jobsSql = `
        SELECT 
          j.id, j.employerId, j.title, j.specialty, j.location,
          j.description, j.requirements, j.salaryMin, j.salaryMax,
          j.jobType, j.experienceRequired, j.postedAt,
          e.name as employerName, e.type as employerType
        FROM jobs j
        LEFT JOIN employers e ON j.employerId = e.id
        WHERE ${jobConditions.join(' AND ')}
        ORDER BY j.postedAt DESC
      `;

      db.all(jobsSql, jobParams, (err, jobs) => {
        if (err) {
          console.error('Database error (jobs):', err.message);
          return res.status(500).json({
            error: {
              message: 'Database error',
              code: 'ERR_INTERNAL',
              status: 500
            }
          });
        }

        const { rankJobsForCandidate, filterByMinimumScore } = require('../matching/engine');

        // Calculate matches
        let matches = rankJobsForCandidate(candidate, jobs);

        // Apply minimum score filter
        if (minScoreNum > 0) {
          matches = filterByMinimumScore(matches, minScoreNum);
        }

        // Apply limit
        matches = matches.slice(0, limitNum);

        function getMatchGrade(score) {
          if (score >= 80) {return 'A';}
          if (score >= 60) {return 'B';}
          if (score >= 40) {return 'C';}
          if (score >= 20) {return 'D';}
          return 'F';
        }

        // Prepare response
        const response = {
          candidate: {
            id: candidate.id,
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            specialty: candidate.specialty,
            location: candidate.location,
            experienceYears: candidate.experienceYears
          },
          filters: {
            excludeApplied: excludeApplied === 'true',
            excludedJobCount: appliedJobIds.length
          },
          matches: matches.map(match => ({
            job: {
              id: match.id,
              title: match.title,
              specialty: match.specialty,
              location: match.location,
              employerName: match.employerName,
              employerType: match.employerType,
              salaryMin: match.salaryMin,
              salaryMax: match.salaryMax,
              jobType: match.jobType,
              experienceRequired: match.experienceRequired,
              postedAt: match.postedAt
            },
            matchScore: match.matchScore,
            matchGrade: getMatchGrade(match.matchScore),
            matchReasons: match.matchReasons,
            matchMismatches: match.matchMismatches,
            matchDetails: match.matchDetails
          })),
          summary: {
            totalMatches: matches.length,
            averageScore: matches.length > 0
              ? Math.round(matches.reduce((sum, m) => sum + m.matchScore, 0) / matches.length)
              : 0,
            highMatches: matches.filter(m => m.matchScore >= 80).length,
            goodMatches: matches.filter(m => m.matchScore >= 60 && m.matchScore < 80).length
          }
        };

        // Cache matches (short TTL as matching is dynamic)
        cache.set(cacheKey, response, 60 * 1000); // 1 minute
        res.set('X-Cache', 'miss');

        res.json(response);
      });
    }
  });
});

module.exports = router;
