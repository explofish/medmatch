const express = require('express');
const router = express.Router();
const { validate, schemas } = require('../middleware/validation');
const cache = require('../utils/cache');

/**
 * GET /api/jobs
 * List jobs with filters, pagination, sorting
 *
 * Query params:
 * - location: filter by location (partial match)
 * - specialty: filter by specialty
 * - employerId: filter by employer
 * - jobType: full-time, part-time, contract
 * - minSalary: minimum salary
 * - maxSalary: maximum salary
 * - minExperience: minimum experience required
 * - status: active, closed, draft
 * - page: page number (default: 1)
 * - limit: items per page (default: 20, max: 100)
 * - sortBy: match_score, posted_date, salary (default: postedAt)
 * - sortOrder: asc or desc (default: desc)
 */
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const {
    location,
    specialty,
    employerId,
    jobType,
    minSalary,
    maxSalary,
    minExperience,
    status = 'active',
    page = 1,
    limit = 20,
    sortBy = 'postedAt',
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

  // Generate cache key based on query parameters
  const cacheKey = `jobs:list:${JSON.stringify({
    location, specialty, employerId, jobType, minSalary, maxSalary, minExperience, status, page, limit, sortBy, sortOrder
  })}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    res.set('X-Cache', 'hit');
    return res.json(cached);
  }

  // Whitelist allowed sort columns
  const allowedSortColumns = ['id', 'title', 'specialty', 'location', 'salaryMin', 'salaryMax', 'postedAt', 'experienceRequired'];
  const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'postedAt';
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  // Build WHERE clause
  const conditions = ['j.isDeleted = 0'];
  const params = [];

  if (location) {
    conditions.push('j.location LIKE ?');
    params.push(`%${location}%`);
  }
  if (specialty) {
    conditions.push('j.specialty = ?');
    params.push(specialty);
  }
  if (employerId) {
    conditions.push('j.employerId = ?');
    params.push(parseInt(employerId, 10));
  }
  if (jobType) {
    conditions.push('j.jobType = ?');
    params.push(jobType);
  }
  if (minSalary !== undefined && !isNaN(parseInt(minSalary, 10))) {
    conditions.push('j.salaryMax >= ?');
    params.push(parseInt(minSalary, 10));
  }
  if (maxSalary !== undefined && !isNaN(parseInt(maxSalary, 10))) {
    conditions.push('j.salaryMin <= ?');
    params.push(parseInt(maxSalary, 10));
  }
  if (minExperience !== undefined && !isNaN(parseInt(minExperience, 10))) {
    conditions.push('j.experienceRequired <= ?');
    params.push(parseInt(minExperience, 10));
  }
  if (status) {
    conditions.push('j.status = ?');
    params.push(status);
  }

  const whereClause = conditions.join(' AND ');
  const offset = (pageNum - 1) * limitNum;

  // Get total count
  const countSql = `
    SELECT COUNT(*) as total 
    FROM jobs j
    WHERE ${whereClause}
  `;

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

    // Get paginated results with employer info
    const dataSql = `
      SELECT 
        j.id, j.employerId, j.title, j.specialty, j.location, 
        j.description, j.requirements, j.salaryMin, j.salaryMax,
        j.jobType, j.experienceRequired, j.postedAt, j.expiresAt, j.status,
        e.name as employerName, e.type as employerType
      FROM jobs j
      LEFT JOIN employers e ON j.employerId = e.id
      WHERE ${whereClause}
      ORDER BY j.${sortColumn} ${order}
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

      // Cache the response (short TTL for list endpoints)
      cache.set(cacheKey, response, 30 * 1000); // 30 seconds for job lists
      res.set('X-Cache', 'miss');

      res.json(response);
    });
  });
});

/**
 * GET /api/jobs/:id
 * Get single job posting
 */
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({
      error: {
        message: 'Invalid job ID',
        code: 'ERR_VALIDATION',
        details: { id: 'Must be a valid integer' }
      }
    });
  }

  // Check cache
  const cacheKey = `jobs:detail:${id}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    res.set('X-Cache', 'hit');
    return res.json(cached);
  }

  const sql = `
    SELECT 
      j.id, j.employerId, j.title, j.specialty, j.location,
      j.description, j.requirements, j.salaryMin, j.salaryMax,
      j.jobType, j.experienceRequired, j.postedAt, j.expiresAt, j.status,
      e.name as employerName, e.type as employerType, e.location as employerLocation
    FROM jobs j
    LEFT JOIN employers e ON j.employerId = e.id
    WHERE j.id = ? AND j.isDeleted = 0
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
          message: 'Job not found',
          code: 'ERR_NOT_FOUND',
          status: 404
        }
      });
    }

    const response = { data: row };

    // Cache individual job (longer TTL for single items)
    cache.set(cacheKey, response, 5 * 60 * 1000); // 5 minutes
    res.set('X-Cache', 'miss');

    res.json(response);
  });
});

/**
 * POST /api/jobs
 * Create job posting
 */
router.post('/', validate({ body: schemas.job }), (req, res) => {
  const db = req.app.locals.db;
  const {
    employerId,
    title,
    specialty,
    location,
    description,
    requirements,
    salaryMin,
    salaryMax,
    jobType,
    experienceRequired,
    expiresAt
  } = req.body;

  // Verify employer exists
  db.get('SELECT id FROM employers WHERE id = ? AND isDeleted = 0', [employerId], (err, employer) => {
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
    if (!employer) {
      return res.status(404).json({
        error: {
          message: 'Employer not found',
          code: 'ERR_NOT_FOUND',
          status: 404
        }
      });
    }

    const sql = `
      INSERT INTO jobs (employerId, title, specialty, location, description, requirements, 
                        salaryMin, salaryMax, jobType, experienceRequired, expiresAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [
      parseInt(employerId, 10),
      title.trim(),
      specialty.trim(),
      location.trim(),
      description || null,
      requirements || null,
      salaryMin || null,
      salaryMax || null,
      jobType,
      experienceRequired || 0,
      expiresAt || null
    ], function (err) {
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

      const newId = this.lastID;

      // Invalidate job list caches
      cache.invalidateByPattern('jobs:list:');

      // Fetch the created job with employer info
      db.get(
        `SELECT j.*, e.name as employerName, e.type as employerType
         FROM jobs j
         LEFT JOIN employers e ON j.employerId = e.id
         WHERE j.id = ?`,
        [newId],
        (err, row) => {
          if (err || !row) {
            return res.status(201).json({
              message: 'Job created successfully',
              data: { id: newId }
            });
          }

          res.status(201).json({
            message: 'Job created successfully',
            data: row
          });
        }
      );
    });
  });
});

/**
 * PATCH /api/jobs/:id
 * Update job posting (partial update)
 */
router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({
      error: {
        message: 'Invalid job ID',
        code: 'ERR_VALIDATION',
        details: { id: 'Must be a valid integer' }
      }
    });
  }

  const {
    title,
    specialty,
    location,
    description,
    requirements,
    salaryMin,
    salaryMax,
    jobType,
    experienceRequired,
    status,
    expiresAt
  } = req.body;

  // Build dynamic update
  const updates = [];
  const params = [];

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          code: 'ERR_VALIDATION',
          details: { title: 'Title cannot be empty' }
        }
      });
    }
    updates.push('title = ?');
    params.push(title.trim());
  }

  if (specialty !== undefined) {
    updates.push('specialty = ?');
    params.push(specialty);
  }

  if (location !== undefined) {
    updates.push('location = ?');
    params.push(location);
  }

  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description || null);
  }

  if (requirements !== undefined) {
    updates.push('requirements = ?');
    params.push(requirements || null);
  }

  if (salaryMin !== undefined) {
    updates.push('salaryMin = ?');
    params.push(salaryMin !== null ? parseInt(salaryMin, 10) : null);
  }

  if (salaryMax !== undefined) {
    updates.push('salaryMax = ?');
    params.push(salaryMax !== null ? parseInt(salaryMax, 10) : null);
  }

  if (jobType !== undefined) {
    if (!['full-time', 'part-time', 'contract'].includes(jobType)) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          code: 'ERR_VALIDATION',
          details: { jobType: 'Job type must be one of: full-time, part-time, contract' }
        }
      });
    }
    updates.push('jobType = ?');
    params.push(jobType);
  }

  if (experienceRequired !== undefined) {
    updates.push('experienceRequired = ?');
    params.push(parseInt(experienceRequired, 10));
  }

  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }

  if (expiresAt !== undefined) {
    updates.push('expiresAt = ?');
    params.push(expiresAt || null);
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

  params.push(id);

  const sql = `UPDATE jobs SET ${updates.join(', ')} WHERE id = ? AND isDeleted = 0`;

  db.run(sql, params, function (err) {
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
          message: 'Job not found',
          code: 'ERR_NOT_FOUND',
          status: 404
        }
      });
    }

    // Invalidate caches
    cache.delete(`jobs:detail:${id}`);
    cache.invalidateByPattern('jobs:list:');

    // Fetch the updated job
    db.get(
      `SELECT j.*, e.name as employerName, e.type as employerType
       FROM jobs j
       LEFT JOIN employers e ON j.employerId = e.id
       WHERE j.id = ?`,
      [id],
      (err, row) => {
        if (err || !row) {
          return res.json({
            message: 'Job updated successfully',
            data: { id }
          });
        }

        res.json({
          message: 'Job updated successfully',
          data: row
        });
      }
    );
  });
});

/**
 * DELETE /api/jobs/:id
 * Soft delete job
 */
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({
      error: {
        message: 'Invalid job ID',
        code: 'ERR_VALIDATION',
        details: { id: 'Must be a valid integer' }
      }
    });
  }

  const sql = 'UPDATE jobs SET isDeleted = 1 WHERE id = ? AND isDeleted = 0';

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
          message: 'Job not found',
          code: 'ERR_NOT_FOUND',
          status: 404
        }
      });
    }

    // Invalidate caches
    cache.delete(`jobs:detail:${id}`);
    cache.invalidateByPattern('jobs:list:');

    res.json({
      message: 'Job deleted successfully',
      data: { id }
    });
  });
});

/**
 * GET /api/jobs/:id/applications
 * Get all applications for a job (employer only)
 */
router.get('/:id/applications', (req, res) => {
  const db = req.app.locals.db;
  const jobId = parseInt(req.params.id, 10);

  if (isNaN(jobId)) {
    return res.status(400).json({
      error: {
        message: 'Invalid job ID',
        code: 'ERR_VALIDATION',
        details: { id: 'Must be a valid integer' }
      }
    });
  }

  // Verify job exists
  db.get('SELECT id FROM jobs WHERE id = ? AND isDeleted = 0', [jobId], (err, job) => {
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
    if (!job) {
      return res.status(404).json({
        error: {
          message: 'Job not found',
          code: 'ERR_NOT_FOUND',
          status: 404
        }
      });
    }

    const sql = `
      SELECT 
        a.id, a.candidateId, a.status, a.coverLetter, a.cvUrl,
        a.matchScore, a.appliedAt, a.updatedAt,
        c.firstName as candidateFirstName, c.lastName as candidateLastName,
        c.email as candidateEmail, c.specialty as candidateSpecialty,
        c.experienceYears as candidateExperience,
        c.location as candidateLocation
      FROM applications a
      JOIN candidates c ON a.candidateId = c.id
      WHERE a.jobId = ? AND a.isDeleted = 0
      ORDER BY a.appliedAt DESC
    `;

    db.all(sql, [jobId], (err, rows) => {
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
        jobId,
        data: rows,
        summary: {
          total: rows.length,
          byStatus: {
            pending: rows.filter(r => r.status === 'pending').length,
            reviewed: rows.filter(r => r.status === 'reviewed').length,
            accepted: rows.filter(r => r.status === 'accepted').length,
            rejected: rows.filter(r => r.status === 'rejected').length
          },
          averageMatchScore: rows.length > 0
            ? Math.round(rows.reduce((sum, r) => sum + (r.matchScore || 0), 0) / rows.length)
            : 0
        }
      });
    });
  });
});

module.exports = router;
