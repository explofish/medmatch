const express = require('express');
const router = express.Router();

/**
 * GET /api/dashboard/employer/:id
 * Employer dashboard stats
 *
 * Returns:
 * - Total active jobs
 * - Total applications received
 * - Applications by status breakdown
 * - Recent applications (last 7 days)
 * - Top performing jobs (most applications)
 * - Match score statistics
 */
router.get('/employer/:id', (req, res) => {
  const db = req.app.locals.db;
  const employerId = parseInt(req.params.id, 10);

  if (isNaN(employerId)) {
    return res.status(400).json({ error: 'Invalid employer ID' });
  }

  // Verify employer exists
  db.get('SELECT id, name FROM employers WHERE id = ? AND isDeleted = 0', [employerId], (err, employer) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!employer) {
      return res.status(404).json({ error: 'Employer not found' });
    }

    // Get all stats in parallel queries
    const stats = {
      employerId,
      employerName: employer.name,
      summary: {},
      jobs: {},
      applications: {},
      recentActivity: []
    };

    // 1. Total active jobs count
    db.get(`
      SELECT COUNT(*) as total FROM jobs 
      WHERE employerId = ? AND status = 'active' AND isDeleted = 0
    `, [employerId], (err, result) => {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      stats.summary.totalActiveJobs = result.total;

      // 2. Total applications received (for all employer jobs)
      db.get(`
        SELECT COUNT(*) as total 
        FROM applications a
        JOIN jobs j ON a.jobId = j.id
        WHERE j.employerId = ? AND a.isDeleted = 0
      `, [employerId], (err, result) => {
        if (err) {
          console.error('Database error:', err.message);
          return res.status(500).json({ error: 'Database error' });
        }
        stats.summary.totalApplications = result.total;

        // 3. Applications by status
        db.all(`
          SELECT a.status, COUNT(*) as count
          FROM applications a
          JOIN jobs j ON a.jobId = j.id
          WHERE j.employerId = ? AND a.isDeleted = 0
          GROUP BY a.status
        `, [employerId], (err, rows) => {
          if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: 'Database error' });
          }
          const byStatus = { pending: 0, reviewed: 0, accepted: 0, rejected: 0 };
          rows.forEach(row => {
            byStatus[row.status] = row.count;
          });
          stats.applications.byStatus = byStatus;

          // 4. Recent applications (last 7 days)
          db.all(`
            SELECT 
              a.id, a.status, a.appliedAt, a.matchScore,
              c.firstName || ' ' || c.lastName as candidateName,
              c.specialty as candidateSpecialty,
              j.title as jobTitle
            FROM applications a
            JOIN jobs j ON a.jobId = j.id
            JOIN candidates c ON a.candidateId = c.id
            WHERE j.employerId = ? AND a.isDeleted = 0
              AND a.appliedAt >= datetime('now', '-7 days')
            ORDER BY a.appliedAt DESC
            LIMIT 10
          `, [employerId], (err, rows) => {
            if (err) {
              console.error('Database error:', err.message);
              return res.status(500).json({ error: 'Database error' });
            }
            stats.recentActivity = rows;

            // 5. Top performing jobs (most applications)
            db.all(`
              SELECT 
                j.id, j.title, j.specialty, j.location,
                COUNT(a.id) as applicationCount,
                AVG(a.matchScore) as avgMatchScore
              FROM jobs j
              LEFT JOIN applications a ON j.id = a.jobId AND a.isDeleted = 0
              WHERE j.employerId = ? AND j.isDeleted = 0
              GROUP BY j.id
              ORDER BY applicationCount DESC
              LIMIT 5
            `, [employerId], (err, rows) => {
              if (err) {
                console.error('Database error:', err.message);
                return res.status(500).json({ error: 'Database error' });
              }
              stats.jobs.topPerforming = rows.map(r => ({
                ...r,
                avgMatchScore: r.avgMatchScore ? Math.round(r.avgMatchScore) : null
              }));

              // 6. Jobs needing attention (no applications in last 14 days)
              db.all(`
                SELECT 
                  j.id, j.title, j.specialty, j.location, j.postedAt,
                  MAX(a.appliedAt) as lastApplicationAt,
                  COUNT(a.id) as totalApplications
                FROM jobs j
                LEFT JOIN applications a ON j.id = a.jobId AND a.isDeleted = 0
                WHERE j.employerId = ? AND j.status = 'active' AND j.isDeleted = 0
                GROUP BY j.id
                HAVING lastApplicationAt IS NULL OR lastApplicationAt < datetime('now', '-14 days')
                ORDER BY j.postedAt DESC
                LIMIT 5
              `, [employerId], (err, rows) => {
                if (err) {
                  console.error('Database error:', err.message);
                  return res.status(500).json({ error: 'Database error' });
                }
                stats.jobs.needingAttention = rows;

                // 7. Match score statistics
                db.get(`
                  SELECT 
                    AVG(a.matchScore) as averageMatchScore,
                    MAX(a.matchScore) as highestMatchScore,
                    MIN(a.matchScore) as lowestMatchScore
                  FROM applications a
                  JOIN jobs j ON a.jobId = j.id
                  WHERE j.employerId = ? AND a.isDeleted = 0 AND a.matchScore IS NOT NULL
                `, [employerId], (err, result) => {
                  if (err) {
                    console.error('Database error:', err.message);
                    return res.status(500).json({ error: 'Database error' });
                  }
                  stats.applications.matchScoreStats = {
                    average: result.averageMatchScore ? Math.round(result.averageMatchScore) : 0,
                    highest: result.highestMatchScore || 0,
                    lowest: result.lowestMatchScore || 0
                  };

                  // 8. Weekly trend (applications per day for last 7 days)
                  db.all(`
                    SELECT 
                      date(a.appliedAt) as date,
                      COUNT(*) as count
                    FROM applications a
                    JOIN jobs j ON a.jobId = j.id
                    WHERE j.employerId = ? AND a.isDeleted = 0
                      AND a.appliedAt >= datetime('now', '-7 days')
                    GROUP BY date(a.appliedAt)
                    ORDER BY date
                  `, [employerId], (err, rows) => {
                    if (err) {
                      console.error('Database error:', err.message);
                      return res.status(500).json({ error: 'Database error' });
                    }
                    stats.applications.weeklyTrend = rows;

                    res.json(stats);
                  });
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
 * GET /api/dashboard/candidate/:id
 * Candidate dashboard stats
 *
 * Returns:
 * - Total applications sent
 * - Applications by status
 * - Match recommendations count
 * - Profile completion percentage
 * - Saved jobs count (if we add that feature later)
 * - Recent applications
 */
router.get('/candidate/:id', (req, res) => {
  const db = req.app.locals.db;
  const candidateId = parseInt(req.params.id, 10);

  if (isNaN(candidateId)) {
    return res.status(400).json({ error: 'Invalid candidate ID' });
  }

  // Verify candidate exists
  db.get('SELECT id, firstName, lastName FROM candidates WHERE id = ? AND isDeleted = 0', [candidateId], (err, candidate) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const stats = {
      candidateId,
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      summary: {},
      applications: {},
      recommendations: {},
      profile: {}
    };

    // 1. Total applications sent
    db.get(`
      SELECT COUNT(*) as total FROM applications 
      WHERE candidateId = ? AND isDeleted = 0
    `, [candidateId], (err, result) => {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      stats.summary.totalApplications = result.total;

      // 2. Applications by status
      db.all(`
        SELECT status, COUNT(*) as count
        FROM applications
        WHERE candidateId = ? AND isDeleted = 0
        GROUP BY status
      `, [candidateId], (err, rows) => {
        if (err) {
          console.error('Database error:', err.message);
          return res.status(500).json({ error: 'Database error' });
        }
        const byStatus = { pending: 0, reviewed: 0, accepted: 0, rejected: 0 };
        rows.forEach(row => {
          byStatus[row.status] = row.count;
        });
        stats.applications.byStatus = byStatus;

        // 3. Recent applications
        db.all(`
          SELECT 
            a.id, a.status, a.appliedAt, a.matchScore,
            j.title as jobTitle, j.specialty as jobSpecialty, j.location as jobLocation,
            j.salaryMin, j.salaryMax,
            e.name as employerName
          FROM applications a
          JOIN jobs j ON a.jobId = j.id
          JOIN employers e ON j.employerId = e.id
          WHERE a.candidateId = ? AND a.isDeleted = 0
          ORDER BY a.appliedAt DESC
          LIMIT 5
        `, [candidateId], (err, rows) => {
          if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: 'Database error' });
          }
          stats.applications.recent = rows;

          // 4. Application response rate
          db.get(`
            SELECT 
              COUNT(CASE WHEN status != 'pending' THEN 1 END) as responded,
              COUNT(*) as total
            FROM applications
            WHERE candidateId = ? AND isDeleted = 0
          `, [candidateId], (err, result) => {
            if (err) {
              console.error('Database error:', err.message);
              return res.status(500).json({ error: 'Database error' });
            }
            stats.applications.responseRate = result.total > 0
              ? Math.round((result.responded / result.total) * 100)
              : 0;

            // 5. Get candidate profile for completion calculation
            db.get(`
              SELECT 
                email, firstName, lastName, location, specialty,
                experienceYears, desiredSalaryMin, desiredSalaryMax,
                preferredJobType, preferredLocations, skills, cvUrl, portfolioUrl
              FROM candidates
              WHERE id = ?
            `, [candidateId], (err, profile) => {
              if (err) {
                console.error('Database error:', err.message);
                return res.status(500).json({ error: 'Database error' });
              }

              // Calculate profile completion percentage
              const fields = [
                profile.email,
                profile.firstName,
                profile.lastName,
                profile.location,
                profile.specialty,
                profile.experienceYears,
                profile.desiredSalaryMin,
                profile.preferredJobType,
                profile.preferredLocations,
                profile.skills,
                profile.cvUrl,
                profile.portfolioUrl
              ];
              const filledFields = fields.filter(f => f !== null && f !== undefined && f !== '').length;
              stats.profile.completionPercentage = Math.round((filledFields / fields.length) * 100);
              stats.profile.hasCv = !!profile.cvUrl;
              stats.profile.hasPortfolio = !!profile.portfolioUrl;

              // 6. Get match recommendations count
              db.get(`
                SELECT COUNT(*) as total 
                FROM jobs 
                WHERE status = 'active' AND isDeleted = 0
              `, [], (err, result) => {
                if (err) {
                  console.error('Database error:', err.message);
                  return res.status(500).json({ error: 'Database error' });
                }
                stats.recommendations.totalJobs = result.total;

                // Get number of jobs candidate has already applied to
                db.get(`
                  SELECT COUNT(DISTINCT jobId) as count 
                  FROM applications 
                  WHERE candidateId = ? AND isDeleted = 0
                `, [candidateId], (err, result) => {
                  if (err) {
                    console.error('Database error:', err.message);
                    return res.status(500).json({ error: 'Database error' });
                  }
                  stats.recommendations.appliedTo = result.count;
                  stats.recommendations.newOpportunities = stats.recommendations.totalJobs - result.count;

                  // 7. Weekly application trend
                  db.all(`
                    SELECT 
                      date(appliedAt) as date,
                      COUNT(*) as count
                    FROM applications
                    WHERE candidateId = ? AND isDeleted = 0
                      AND appliedAt >= datetime('now', '-30 days')
                    GROUP BY date(appliedAt)
                    ORDER BY date
                  `, [candidateId], (err, rows) => {
                    if (err) {
                      console.error('Database error:', err.message);
                      return res.status(500).json({ error: 'Database error' });
                    }
                    stats.applications.monthlyTrend = rows;

                    res.json(stats);
                  });
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
 * GET /api/dashboard/admin
 * System-wide stats (for internal use)
 *
 * Returns:
 * - Total candidates, employers, jobs, applications
 * - Recent activity (last 7 days)
 * - Top specialties in demand
 * - Top locations
 * - System health metrics
 */
router.get('/admin', (req, res) => {
  const db = req.app.locals.db;

  const stats = {
    totals: {},
    recentActivity: {},
    specialties: {},
    locations: {},
    systemHealth: {}
  };

  // 1. Total counts
  db.get('SELECT COUNT(*) as total FROM candidates WHERE isDeleted = 0', [], (err, result) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    stats.totals.candidates = result.total;

    db.get('SELECT COUNT(*) as total FROM employers WHERE isDeleted = 0', [], (err, result) => {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      stats.totals.employers = result.total;

      db.get('SELECT COUNT(*) as total FROM jobs WHERE isDeleted = 0', [], (err, result) => {
        if (err) {
          console.error('Database error:', err.message);
          return res.status(500).json({ error: 'Database error' });
        }
        stats.totals.jobs = result.total;

        db.get('SELECT COUNT(*) as total FROM applications WHERE isDeleted = 0', [], (err, result) => {
          if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: 'Database error' });
          }
          stats.totals.applications = result.total;

          // 2. Active jobs count
          db.get('SELECT COUNT(*) as total FROM jobs WHERE status = \'active\' AND isDeleted = 0', [], (err, result) => {
            if (err) {
              console.error('Database error:', err.message);
              return res.status(500).json({ error: 'Database error' });
            }
            stats.totals.activeJobs = result.total;

            // 3. Recent activity (last 7 days)
            db.get(`
              SELECT COUNT(*) as total 
              FROM applications 
              WHERE appliedAt >= datetime('now', '-7 days') AND isDeleted = 0
            `, [], (err, result) => {
              if (err) {
                console.error('Database error:', err.message);
                return res.status(500).json({ error: 'Database error' });
              }
              stats.recentActivity.applicationsLast7Days = result.total;

              db.get(`
                SELECT COUNT(*) as total 
                FROM jobs 
                WHERE postedAt >= datetime('now', '-7 days') AND isDeleted = 0
              `, [], (err, result) => {
                if (err) {
                  console.error('Database error:', err.message);
                  return res.status(500).json({ error: 'Database error' });
                }
                stats.recentActivity.jobsPostedLast7Days = result.total;

                db.get(`
                  SELECT COUNT(*) as total 
                  FROM candidates 
                  WHERE createdAt >= datetime('now', '-7 days') AND isDeleted = 0
                `, [], (err, result) => {
                  if (err) {
                    console.error('Database error:', err.message);
                    return res.status(500).json({ error: 'Database error' });
                  }
                  stats.recentActivity.newCandidatesLast7Days = result.total;

                  // 4. Top specialties in demand (by job count)
                  db.all(`
                    SELECT specialty, COUNT(*) as jobCount
                    FROM jobs
                    WHERE status = 'active' AND isDeleted = 0
                    GROUP BY specialty
                    ORDER BY jobCount DESC
                    LIMIT 10
                  `, [], (err, rows) => {
                    if (err) {
                      console.error('Database error:', err.message);
                      return res.status(500).json({ error: 'Database error' });
                    }
                    stats.specialties.topInDemand = rows;

                    // 5. Top candidate specialties
                    db.all(`
                      SELECT specialty, COUNT(*) as candidateCount
                      FROM candidates
                      WHERE isDeleted = 0 AND specialty IS NOT NULL
                      GROUP BY specialty
                      ORDER BY candidateCount DESC
                      LIMIT 10
                    `, [], (err, rows) => {
                      if (err) {
                        console.error('Database error:', err.message);
                        return res.status(500).json({ error: 'Database error' });
                      }
                      stats.specialties.topCandidateSpecialties = rows;

                      // 6. Top locations for jobs
                      db.all(`
                        SELECT location, COUNT(*) as jobCount
                        FROM jobs
                        WHERE status = 'active' AND isDeleted = 0
                        GROUP BY location
                        ORDER BY jobCount DESC
                        LIMIT 10
                      `, [], (err, rows) => {
                        if (err) {
                          console.error('Database error:', err.message);
                          return res.status(500).json({ error: 'Database error' });
                        }
                        stats.locations.topJobLocations = rows;

                        // 7. Top locations for candidates
                        db.all(`
                          SELECT location, COUNT(*) as candidateCount
                          FROM candidates
                          WHERE isDeleted = 0 AND location IS NOT NULL
                          GROUP BY location
                          ORDER BY candidateCount DESC
                          LIMIT 10
                        `, [], (err, rows) => {
                          if (err) {
                            console.error('Database error:', err.message);
                            return res.status(500).json({ error: 'Database error' });
                          }
                          stats.locations.topCandidateLocations = rows;

                          // 8. Application status distribution
                          db.all(`
                            SELECT status, COUNT(*) as count
                            FROM applications
                            WHERE isDeleted = 0
                            GROUP BY status
                          `, [], (err, rows) => {
                            if (err) {
                              console.error('Database error:', err.message);
                              return res.status(500).json({ error: 'Database error' });
                            }
                            const byStatus = { pending: 0, reviewed: 0, accepted: 0, rejected: 0 };
                            rows.forEach(row => {
                              byStatus[row.status] = row.count;
                            });
                            stats.recentActivity.applicationStatusDistribution = byStatus;

                            // 9. Average match score
                            db.get(`
                              SELECT AVG(matchScore) as avgScore
                              FROM applications
                              WHERE matchScore IS NOT NULL AND isDeleted = 0
                            `, [], (err, result) => {
                              if (err) {
                                console.error('Database error:', err.message);
                                return res.status(500).json({ error: 'Database error' });
                              }
                              stats.systemHealth.averageMatchScore = result.avgScore
                                ? Math.round(result.avgScore)
                                : 0;

                              // 10. Match score distribution
                              db.all(`
                                SELECT 
                                  CASE 
                                    WHEN matchScore >= 80 THEN 'high'
                                    WHEN matchScore >= 60 THEN 'good'
                                    WHEN matchScore >= 40 THEN 'fair'
                                    ELSE 'low'
                                  END as category,
                                  COUNT(*) as count
                                FROM applications
                                WHERE matchScore IS NOT NULL AND isDeleted = 0
                                GROUP BY category
                              `, [], (err, rows) => {
                                if (err) {
                                  console.error('Database error:', err.message);
                                  return res.status(500).json({ error: 'Database error' });
                                }
                                const distribution = { high: 0, good: 0, fair: 0, low: 0 };
                                rows.forEach(row => {
                                  distribution[row.category] = row.count;
                                });
                                stats.systemHealth.matchScoreDistribution = distribution;

                                res.json(stats);
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});

module.exports = router;
