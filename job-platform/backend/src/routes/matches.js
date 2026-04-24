const express = require('express');
const router = express.Router();
const { calculateMatchScore, rankJobsForCandidate, filterByMinimumScore } = require('../matching/engine');
const { validate, schemas } = require('../middleware/validation');
const cache = require('../utils/cache');

/**
 * GET /api/matches
 * Get job matches for a candidate
 *
 * Query params:
 * - candidateId (required): ID of the candidate
 * - limit: Maximum number of matches to return (default: 10, max: 50)
 * - minScore: Minimum match score threshold (default: 0)
 * - specialty: Filter by specialty
 * - location: Filter by location
 * - jobType: Filter by job type (full-time, part-time, contract)
 */
router.get('/', validate({ query: schemas.matchQuery }), (req, res) => {
  const db = req.app.locals.db;
  const {
    candidateId,
    limit = 10,
    minScore = 0,
    specialty,
    location,
    jobType
  } = req.query;

  const candidateIdNum = parseInt(candidateId, 10);
  const limitNum = Math.min(parseInt(limit, 10) || 10, 50);
  const minScoreNum = parseInt(minScore, 10) || 0;

  // Check cache
  const cacheKey = `matches:candidate:${candidateIdNum}:${JSON.stringify({ limit, minScore, specialty, location, jobType })}`;
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

  db.get(candidateSql, [candidateIdNum], (err, candidate) => {
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
    if (candidate.preferredLocations) {
      candidate.preferredLocations = candidate.preferredLocations.split(',').map(s => s.trim());
    }
    if (candidate.skills) {
      candidate.skills = candidate.skills.split(',').map(s => s.trim());
    }

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

      // Calculate matches
      let matches = rankJobsForCandidate(candidate, jobs);

      // Apply minimum score filter
      if (minScoreNum > 0) {
        matches = filterByMinimumScore(matches, minScoreNum);
      }

      // Apply limit
      matches = matches.slice(0, limitNum);

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

      // Cache the response (1 minute TTL for matches)
      cache.set(cacheKey, response, 60 * 1000);
      res.set('X-Cache', 'miss');

      res.json(response);
    });
  });
});

/**
 * GET /api/matches/score
 * Calculate match score between a candidate and a specific job
 */
router.get('/score', (req, res) => {
  const db = req.app.locals.db;
  const { candidateId, jobId } = req.query;

  if (!candidateId || !jobId) {
    return res.status(400).json({
      error: {
        message: 'Both candidateId and jobId are required',
        code: 'ERR_VALIDATION',
        details: {
          example: '/api/matches/score?candidateId=123&jobId=456'
        }
      }
    });
  }

  const candidateIdNum = parseInt(candidateId, 10);
  const jobIdNum = parseInt(jobId, 10);

  if (isNaN(candidateIdNum) || isNaN(jobIdNum)) {
    return res.status(400).json({
      error: {
        message: 'Both IDs must be numbers',
        code: 'ERR_VALIDATION'
      }
    });
  }

  // Check cache
  const cacheKey = `matches:score:${candidateIdNum}:${jobIdNum}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    res.set('X-Cache', 'hit');
    return res.json(cached);
  }

  // Get candidate
  const candidateSql = `
    SELECT 
      id, firstName, lastName, location, specialty,
      experienceYears, desiredSalaryMin, desiredSalaryMax,
      preferredJobType, preferredLocations
    FROM candidates 
    WHERE id = ? AND isDeleted = 0
  `;

  db.get(candidateSql, [candidateIdNum], (err, candidate) => {
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

    // Get job
    const jobSql = `
      SELECT 
        j.*, e.name as employerName, e.type as employerType
      FROM jobs j
      LEFT JOIN employers e ON j.employerId = e.id
      WHERE j.id = ? AND j.isDeleted = 0
    `;

    db.get(jobSql, [jobIdNum], (err, job) => {
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

      // Calculate match
      const match = calculateMatchScore(candidate, job);

      const response = {
        candidate: {
          id: candidate.id,
          name: `${candidate.firstName} ${candidate.lastName}`,
          specialty: candidate.specialty,
          location: candidate.location,
          experienceYears: candidate.experienceYears,
          desiredSalaryMin: candidate.desiredSalaryMin,
          desiredSalaryMax: candidate.desiredSalaryMax,
          preferredJobType: candidate.preferredJobType,
          preferredLocations: candidate.preferredLocations
        },
        job: {
          id: job.id,
          title: job.title,
          specialty: job.specialty,
          location: job.location,
          employerName: job.employerName,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          jobType: job.jobType,
          experienceRequired: job.experienceRequired
        },
        matchScore: match.score,
        matchGrade: getMatchGrade(match.score),
        matchReasons: match.matchReasons,
        matchMismatches: match.mismatches,
        matchDetails: match.details,
        recommendation: getRecommendation(match.score, match.matchReasons.length, match.mismatches?.length || 0)
      };

      // Cache the response (5 minutes for individual scores)
      cache.set(cacheKey, response, 5 * 60 * 1000);
      res.set('X-Cache', 'miss');

      res.json(response);
    });
  });
});

/**
 * POST /api/matches/batch
 * Get matches for multiple candidates at once
 */
router.post('/batch', (req, res) => {
  const db = req.app.locals.db;
  const { jobId, candidateIds } = req.body;

  if (!jobId || !candidateIds || !Array.isArray(candidateIds)) {
    return res.status(400).json({
      error: {
        message: 'jobId and candidateIds array are required',
        code: 'ERR_VALIDATION'
      }
    });
  }

  const jobIdNum = parseInt(jobId, 10);
  if (isNaN(jobIdNum)) {
    return res.status(400).json({
      error: {
        message: 'jobId must be a number',
        code: 'ERR_VALIDATION'
      }
    });
  }

  // Get job
  const jobSql = `
    SELECT j.*, e.name as employerName
    FROM jobs j
    LEFT JOIN employers e ON j.employerId = e.id
    WHERE j.id = ? AND j.isDeleted = 0
  `;

  db.get(jobSql, [jobIdNum], (err, job) => {
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

    // Get candidates
    const placeholders = candidateIds.map(() => '?').join(',');
    const candidateSql = `
      SELECT 
        id, firstName, lastName, location, specialty,
        experienceYears, desiredSalaryMin, desiredSalaryMax,
        preferredJobType, preferredLocations
      FROM candidates 
      WHERE id IN (${placeholders}) AND isDeleted = 0
    `;

    db.all(candidateSql, candidateIds.map(id => parseInt(id, 10)), (err, candidates) => {
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

      // Calculate match for each candidate
      const matches = candidates.map(candidate => {
        const match = calculateMatchScore(candidate, job);
        return {
          candidate: {
            id: candidate.id,
            name: `${candidate.firstName} ${candidate.lastName}`,
            specialty: candidate.specialty,
            location: candidate.location,
            experienceYears: candidate.experienceYears
          },
          matchScore: match.score,
          matchGrade: getMatchGrade(match.score),
          matchReasons: match.matchReasons
        };
      });

      // Sort by score descending
      matches.sort((a, b) => b.matchScore - a.matchScore);

      res.json({
        job: {
          id: job.id,
          title: job.title,
          specialty: job.specialty,
          employerName: job.employerName
        },
        matches,
        summary: {
          totalCandidates: matches.length,
          topMatch: matches[0] || null,
          averageScore: matches.length > 0
            ? Math.round(matches.reduce((sum, m) => sum + m.matchScore, 0) / matches.length)
            : 0,
          strongMatches: matches.filter(m => m.matchScore >= 70).length
        }
      });
    });
  });
});

/**
 * Helper: Get match grade based on score
 */
function getMatchGrade(score) {
  if (score >= 80) {return 'A';}
  if (score >= 60) {return 'B';}
  if (score >= 40) {return 'C';}
  if (score >= 20) {return 'D';}
  return 'F';
}

/**
 * Helper: Get recommendation based on match
 */
function getRecommendation(score, reasonCount, mismatchCount) {
  if (score >= 80) {
    return 'Excellent match - Highly recommended to apply';
  } else if (score >= 60) {
    return 'Good match - Recommended to apply';
  } else if (score >= 40) {
    return 'Fair match - Consider if other options limited';
  } else if (reasonCount > 0 && mismatchCount <= 1) {
    return 'Partial match - May still be worth considering';
  } else {
    return 'Low match - Not recommended';
  }
}

module.exports = router;
