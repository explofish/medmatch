const express = require('express');
const router = express.Router();
const cache = require('../utils/cache');

/**
 * GET /api/applications
 * List applications with filters, pagination
 */
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const {
    candidateId,
    jobId,
    employerId,
    status,
    page = 1,
    limit = 20,
    sortBy = 'appliedAt',
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

  // Whitelist allowed sort columns
  const allowedSortColumns = ['id', 'appliedAt', 'status', 'matchScore'];
  const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'appliedAt';
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  // Build WHERE clause
  const conditions = ['a.isDeleted = 0'];
  const params = [];

  if (candidateId) {
    conditions.push('a.candidateId = ?');
    params.push(parseInt(candidateId, 10));
  }
  if (jobId) {
    conditions.push('a.jobId = ?');
    params.push(parseInt(jobId, 10));
  }
  if (employerId) {
    conditions.push('j.employerId = ?');
    params.push(parseInt(employerId, 10));
  }
  if (status) {
    conditions.push('a.status = ?');
    params.push(status);
  }

  const whereClause = conditions.join(' AND ');
  const offset = (pageNum - 1) * limitNum;

  // Get total count
  const countSql = `
    SELECT COUNT(*) as total 
    FROM applications a
    JOIN jobs j ON a.jobId = j.id
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

    // Get paginated results with candidate and job info
    const dataSql = `
      SELECT 
        a.id, a.candidateId, a.jobId, a.status, a.coverLetter, a.cvUrl,
        a.matchScore, a.appliedAt, a.updatedAt,
        c.firstName as candidateFirstName, c.lastName as candidateLastName,
        c.email as candidateEmail, c.specialty as candidateSpecialty,
        j.title as jobTitle, j.specialty as jobSpecialty, j.location as jobLocation,
        e.name as employerName, e.id as employerId
      FROM applications a
      JOIN candidates c ON a.candidateId = c.id
      JOIN jobs j ON a.jobId = j.id
      JOIN employers e ON j.employerId = e.id
      WHERE ${whereClause}
      ORDER BY a.${sortColumn} ${order}
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

      res.json({
        data: rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      });
    });
  });
});

/**
 * GET /api/applications/:id
 * Get single application details
 */
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({
      error: {
        message: 'Invalid application ID',
        code: 'ERR_VALIDATION',
        details: { id: 'Must be a valid integer' }
      }
    });
  }

  const sql = `
    SELECT 
      a.id, a.candidateId, a.jobId, a.status, a.coverLetter, a.cvUrl,
      a.matchScore, a.appliedAt, a.updatedAt,
      c.firstName as candidateFirstName, c.lastName as candidateLastName,
      c.email as candidateEmail, c.specialty as candidateSpecialty,
      c.experienceYears as candidateExperience,
      j.title as jobTitle, j.specialty as jobSpecialty, j.location as jobLocation,
      j.description as jobDescription, j.requirements as jobRequirements,
      j.salaryMin, j.salaryMax, j.jobType, j.experienceRequired,
      e.name as employerName, e.type as employerType, e.id as employerId
    FROM applications a
    JOIN candidates c ON a.candidateId = c.id
    JOIN jobs j ON a.jobId = j.id
    JOIN employers e ON j.employerId = e.id
    WHERE a.id = ? AND a.isDeleted = 0
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
          message: 'Application not found',
          code: 'ERR_NOT_FOUND',
          status: 404
        }
      });
    }

    res.json({ data: row });
  });
});

/**
 * POST /api/applications
 * Submit job application
 */
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { candidateId, jobId, coverLetter, cvUrl } = req.body;

  // Validation
  const errors = [];
  if (!candidateId || isNaN(parseInt(candidateId, 10))) {
    errors.push('candidateId is required and must be a number');
  }
  if (!jobId || isNaN(parseInt(jobId, 10))) {
    errors.push('jobId is required and must be a number');
  }

  if (errors.length > 0) {
    return res.status(422).json({
      error: {
        message: 'Validation failed',
        code: 'ERR_VALIDATION',
        details: errors
      }
    });
  }

  const candidateIdNum = parseInt(candidateId, 10);
  const jobIdNum = parseInt(jobId, 10);

  // Check candidate exists
  db.get('SELECT id FROM candidates WHERE id = ? AND isDeleted = 0', [candidateIdNum], (err, candidate) => {
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

    // Check job exists and is active
    db.get('SELECT id, status FROM jobs WHERE id = ? AND isDeleted = 0', [jobIdNum], (err, job) => {
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
      if (job.status !== 'active') {
        return res.status(409).json({
          error: {
            message: 'Job is not active',
            code: 'ERR_CONFLICT',
            status: 409
          }
        });
      }

      // Check not already applied
      db.get('SELECT id FROM applications WHERE candidateId = ? AND jobId = ? AND isDeleted = 0',
        [candidateIdNum, jobIdNum], (err, existing) => {
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
          if (existing) {
            return res.status(409).json({
              error: {
                message: 'Already applied to this job',
                code: 'ERR_CONFLICT',
                status: 409
              }
            });
          }

          // Calculate match score
          const { calculateMatchScore } = require('../matching/engine');

          db.get(`
          SELECT 
            id, email, firstName, lastName, location, specialty,
            experienceYears, desiredSalaryMin, desiredSalaryMax,
            preferredJobType, preferredLocations, skills
          FROM candidates WHERE id = ?
        `, [candidateIdNum], (err, candidateData) => {
            if (err) {
              console.error('Database error:', err.message);
            }

            db.get(`
            SELECT 
              j.*, e.name as employerName, e.type as employerType
            FROM jobs j
            LEFT JOIN employers e ON j.employerId = e.id
            WHERE j.id = ?
          `, [jobIdNum], (err, jobData) => {
              if (err) {
                console.error('Database error:', err.message);
              }

              let matchScore = null;
              if (candidateData && jobData) {
                const match = calculateMatchScore(candidateData, jobData);
                matchScore = match.score;
              }

              // Insert application
              const sql = `
              INSERT INTO applications (candidateId, jobId, coverLetter, cvUrl, status, matchScore, appliedAt)
              VALUES (?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP)
            `;

              db.run(sql, [candidateIdNum, jobIdNum, coverLetter || null, cvUrl || null, matchScore], function (err) {
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

                // Create notification for employer
                createNotification(db, 'employer', jobData?.employerId, 'new_application',
                  `New application received for ${jobData?.title || 'job'}`);

                // Create notification for candidate
                createNotification(db, 'candidate', candidateIdNum, 'application_submitted',
                  'Your application has been submitted successfully');

                // Invalidate candidate matches cache
                cache.invalidateByPattern(`candidates:${candidateIdNum}:matches:`);

                // Fetch the created application
                db.get(`
                SELECT 
                  a.id, a.candidateId, a.jobId, a.status, a.coverLetter, a.cvUrl,
                  a.matchScore, a.appliedAt,
                  c.firstName as candidateFirstName, c.lastName as candidateLastName,
                  j.title as jobTitle, e.name as employerName
                FROM applications a
                JOIN candidates c ON a.candidateId = c.id
                JOIN jobs j ON a.jobId = j.id
                JOIN employers e ON j.employerId = e.id
                WHERE a.id = ?
              `, [newId], (err, row) => {
                  if (err || !row) {
                    return res.status(201).json({
                      message: 'Application submitted successfully',
                      data: { id: newId, status: 'pending' }
                    });
                  }

                  res.status(201).json({
                    message: 'Application submitted successfully',
                    data: row
                  });
                });
              });
            });
          });
        });
    });
  });
});

/**
 * PATCH /api/applications/:id
 * Update application status (employer only)
 */
router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = parseInt(req.params.id, 10);
  const { status, notes } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({
      error: {
        message: 'Invalid application ID',
        code: 'ERR_VALIDATION',
        details: { id: 'Must be a valid integer' }
      }
    });
  }

  // Validate status
  const validStatuses = ['pending', 'reviewed', 'accepted', 'rejected'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(422).json({
      error: {
        message: 'Validation failed',
        code: 'ERR_VALIDATION',
        details: {
          status: 'Invalid status. Must be one of: pending, reviewed, accepted, rejected'
        }
      }
    });
  }

  // Get current application to check status change and notify candidate
  db.get(`
    SELECT a.*, j.title as jobTitle, c.id as candidateId
    FROM applications a
    JOIN jobs j ON a.jobId = j.id
    JOIN candidates c ON a.candidateId = c.id
    WHERE a.id = ? AND a.isDeleted = 0
  `, [id], (err, currentApp) => {
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
    if (!currentApp) {
      return res.status(404).json({
        error: {
          message: 'Application not found',
          code: 'ERR_NOT_FOUND',
          status: 404
        }
      });
    }

    const updates = ['status = ?', 'updatedAt = CURRENT_TIMESTAMP'];
    const params = [status];

    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    params.push(id);

    const sql = `UPDATE applications SET ${updates.join(', ')} WHERE id = ? AND isDeleted = 0`;

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
            message: 'Application not found',
            code: 'ERR_NOT_FOUND',
            status: 404
          }
        });
      }

      // Create notification for status change
      if (currentApp.status !== status) {
        let message;
        switch (status) {
        case 'reviewed':
          message = `Your application for "${currentApp.jobTitle}" is being reviewed`;
          break;
        case 'accepted':
          message = `Congratulations! Your application for "${currentApp.jobTitle}" has been accepted`;
          break;
        case 'rejected':
          message = `Your application for "${currentApp.jobTitle}" was not selected at this time`;
          break;
        default:
          message = `Application status updated to ${status}`;
        }
        createNotification(db, 'candidate', currentApp.candidateId, 'status_changed', message);
      }

      // Fetch updated application
      db.get(`
        SELECT 
          a.id, a.candidateId, a.jobId, a.status, a.coverLetter, a.cvUrl,
          a.matchScore, a.appliedAt, a.updatedAt,
          c.firstName as candidateFirstName, c.lastName as candidateLastName,
          j.title as jobTitle, e.name as employerName
        FROM applications a
        JOIN candidates c ON a.candidateId = c.id
        JOIN jobs j ON a.jobId = j.id
        JOIN employers e ON j.employerId = e.id
        WHERE a.id = ?
      `, [id], (err, row) => {
        if (err || !row) {
          return res.json({
            message: 'Application updated successfully',
            data: { id, status }
          });
        }

        res.json({
          message: 'Application updated successfully',
          data: row
        });
      });
    });
  });
});

/**
 * DELETE /api/applications/:id
 * Soft delete application (candidate can withdraw their application)
 */
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({
      error: {
        message: 'Invalid application ID',
        code: 'ERR_VALIDATION',
        details: { id: 'Must be a valid integer' }
      }
    });
  }

  const sql = 'UPDATE applications SET isDeleted = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND isDeleted = 0';

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
          message: 'Application not found',
          code: 'ERR_NOT_FOUND',
          status: 404
        }
      });
    }

    res.json({
      message: 'Application withdrawn successfully',
      data: { id }
    });
  });
});

/**
 * GET /api/applications/candidate/:candidateId
 * Get all applications for a candidate
 */
router.get('/candidate/:candidateId', (req, res) => {
  const db = req.app.locals.db;
  const candidateId = parseInt(req.params.candidateId, 10);

  if (isNaN(candidateId)) {
    return res.status(400).json({
      error: {
        message: 'Invalid candidate ID',
        code: 'ERR_VALIDATION',
        details: { candidateId: 'Must be a valid integer' }
      }
    });
  }

  // Verify candidate exists
  db.get('SELECT id FROM candidates WHERE id = ? AND isDeleted = 0', [candidateId], (err, candidate) => {
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

    db.all(sql, [candidateId], (err, rows) => {
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
        candidateId,
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
 * GET /api/applications/job/:jobId
 * Get all applications for a job (employer only)
 */
router.get('/job/:jobId', (req, res) => {
  const db = req.app.locals.db;
  const jobId = parseInt(req.params.jobId, 10);

  if (isNaN(jobId)) {
    return res.status(400).json({
      error: {
        message: 'Invalid job ID',
        code: 'ERR_VALIDATION',
        details: { jobId: 'Must be a valid integer' }
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

/**
 * Helper: Create notification
 */
function createNotification(db, userType, userId, type, message) {
  if (!userId) {return;}

  const sql = `
    INSERT INTO notifications (userType, userId, type, message, read, createdAt)
    VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
  `;

  db.run(sql, [userType, userId, type, message], function (err) {
    if (err) {
      console.error('Error creating notification:', err.message);
    }
  });
}

module.exports = router;
