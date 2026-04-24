/**
 * MedMatch API Tests
 * 
 * Run with: npm test
 * 
 * Tests for all API endpoints:
 * - Candidates: GET, POST, PATCH, DELETE /api/candidates
 * - Employers: GET, POST, PATCH /api/employers
 * - Jobs: GET, POST, PATCH, DELETE /api/jobs
 * - Matches: GET /api/matches
 * - Job Matching Algorithm
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Use test database - MUST be set before importing server
const TEST_DB_DIR = path.join(__dirname, '.data-test');
const TEST_DB_PATH = path.join(TEST_DB_DIR, 'medmatch-test.db');
process.env.TEST_DB_PATH = TEST_DB_PATH;

// Clean up and recreate test database directory
if (fs.existsSync(TEST_DB_PATH)) {
  fs.unlinkSync(TEST_DB_PATH);
}
if (fs.existsSync(TEST_DB_DIR)) {
  fs.rmSync(TEST_DB_DIR, { recursive: true });
}
fs.mkdirSync(TEST_DB_DIR, { recursive: true });

// Clear module cache to ensure server uses test database
delete require.cache[require.resolve('./server')];

// Import app after setting up test environment
const { app, calculateMatchScore } = require('./server');

// Wait for database initialization (tables are created asynchronously)
const waitForDatabase = () => new Promise(resolve => setTimeout(resolve, 500));

beforeAll(async () => {
  await waitForDatabase();
});

describe('Candidate API', () => {
  let testCandidateId;

  const validCandidate = {
    email: 'test.candidate@example.com',
    firstName: 'John',
    lastName: 'Doe',
    location: 'Berlin',
    specialty: 'Kardiologie',
    experienceYears: 5,
    cvUrl: 'https://example.com/cv.pdf',
    preferences: {
      jobType: 'full-time',
      minSalary: 80000,
      willingToRelocate: true
    }
  };

  describe('POST /api/candidates', () => {
    it('should create a new candidate with valid data', async () => {
      const res = await request(app)
        .post('/api/candidates')
        .send(validCandidate)
        .expect(201);

      expect(res.body.message).toBe('Candidate created successfully');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.email).toBe(validCandidate.email.toLowerCase());
      expect(res.body.data.firstName).toBe(validCandidate.firstName);
      expect(res.body.data.lastName).toBe(validCandidate.lastName);
      expect(res.body.data.location).toBe(validCandidate.location);
      expect(res.body.data.specialty).toBe(validCandidate.specialty);
      expect(res.body.data.experienceYears).toBe(validCandidate.experienceYears);
      expect(res.body.data.cvUrl).toBe(validCandidate.cvUrl);
      expect(res.body.data.preferences).toEqual(validCandidate.preferences);

      testCandidateId = res.body.data.id;
    });

    it('should reject duplicate email', async () => {
      await request(app)
        .post('/api/candidates')
        .send(validCandidate)
        .expect(409);
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/candidates')
        .send({ location: 'Berlin' })
        .expect(400);

      expect(res.body.error).toBe('Validation failed');
      expect(res.body.errors).toContain('email is required and must be a valid email');
      expect(res.body.errors).toContain('firstName is required');
      expect(res.body.errors).toContain('lastName is required');
    });

    it('should create candidate with minimal required fields', async () => {
      const res = await request(app)
        .post('/api/candidates')
        .send({
          email: 'minimal@example.com',
          firstName: 'Jane',
          lastName: 'Smith'
        })
        .expect(201);

      expect(res.body.data.email).toBe('minimal@example.com');
      expect(res.body.data.firstName).toBe('Jane');
    });
  });

  describe('GET /api/candidates', () => {
    it('should list candidates with pagination', async () => {
      const res = await request(app)
        .get('/api/candidates')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter by location', async () => {
      const res = await request(app)
        .get('/api/candidates?location=Berlin')
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach(candidate => {
        expect(candidate.location).toContain('Berlin');
      });
    });

    it('should filter by specialty', async () => {
      const res = await request(app)
        .get('/api/candidates?specialty=Kardiologie')
        .expect(200);

      res.body.data.forEach(candidate => {
        expect(candidate.specialty).toContain('Kardiologie');
      });
    });
  });

  describe('GET /api/candidates/:id', () => {
    it('should get a single candidate by ID', async () => {
      const res = await request(app)
        .get(`/api/candidates/${testCandidateId}`)
        .expect(200);

      expect(res.body.data).toHaveProperty('id', testCandidateId);
      expect(res.body.data.email).toBe(validCandidate.email.toLowerCase());
    });

    it('should return 404 for non-existent candidate', async () => {
      await request(app)
        .get('/api/candidates/99999')
        .expect(404);
    });
  });

  describe('PATCH /api/candidates/:id', () => {
    it('should update candidate with valid data', async () => {
      const res = await request(app)
        .patch(`/api/candidates/${testCandidateId}`)
        .send({ firstName: 'Updated', location: 'Munich' })
        .expect(200);

      expect(res.body.message).toBe('Candidate updated successfully');
      expect(res.body.data.firstName).toBe('Updated');
      expect(res.body.data.location).toBe('Munich');
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .patch(`/api/candidates/${testCandidateId}`)
        .send({ email: 'not-an-email' })
        .expect(400);

      expect(res.body.error).toBe('Invalid email format');
    });

    it('should reject empty firstName', async () => {
      const res = await request(app)
        .patch(`/api/candidates/${testCandidateId}`)
        .send({ firstName: '' })
        .expect(400);

      expect(res.body.error).toBe('firstName cannot be empty');
    });

    it('should reject empty lastName', async () => {
      const res = await request(app)
        .patch(`/api/candidates/${testCandidateId}`)
        .send({ lastName: '' })
        .expect(400);

      expect(res.body.error).toBe('lastName cannot be empty');
    });

    it('should reject negative experienceYears', async () => {
      const res = await request(app)
        .patch(`/api/candidates/${testCandidateId}`)
        .send({ experienceYears: -1 })
        .expect(400);

      expect(res.body.error).toBe('experienceYears must be a non-negative number');
    });

    it('should return 404 for non-existent candidate', async () => {
      const res = await request(app)
        .patch('/api/candidates/99999')
        .send({ firstName: 'Updated' })
        .expect(404);

      expect(res.body.error).toBe('Candidate not found');
    });

    it('should reject update with no fields', async () => {
      const res = await request(app)
        .patch(`/api/candidates/${testCandidateId}`)
        .send({})
        .expect(400);

      expect(res.body.error).toBe('No fields to update');
    });

    it('should reject duplicate email on update', async () => {
      // Create another candidate first
      const otherRes = await request(app)
        .post('/api/candidates')
        .send({
          email: 'other@example.com',
          firstName: 'Other',
          lastName: 'User'
        });
      
      const otherEmail = otherRes.body.data.email;

      // Try to update first candidate with second candidate's email
      const res = await request(app)
        .patch(`/api/candidates/${testCandidateId}`)
        .send({ email: otherEmail })
        .expect(409);

      expect(res.body.error).toBe('Email already exists');
    });

    it('should update all candidate fields', async () => {
      const res = await request(app)
        .patch(`/api/candidates/${testCandidateId}`)
        .send({
          email: 'fully.updated@example.com',
          firstName: 'Fully',
          lastName: 'Updated',
          location: 'Stuttgart',
          specialty: 'Neurologie',
          experienceYears: 10,
          cvUrl: 'https://example.com/new-cv.pdf',
          preferences: { minSalary: 100000, jobType: 'part-time' }
        })
        .expect(200);

      expect(res.body.message).toBe('Candidate updated successfully');
      expect(res.body.data.email).toBe('fully.updated@example.com');
      expect(res.body.data.firstName).toBe('Fully');
      expect(res.body.data.lastName).toBe('Updated');
      expect(res.body.data.location).toBe('Stuttgart');
      expect(res.body.data.specialty).toBe('Neurologie');
      expect(res.body.data.experienceYears).toBe(10);
      expect(res.body.data.cvUrl).toBe('https://example.com/new-cv.pdf');
      expect(res.body.data.preferences).toEqual({ minSalary: 100000, jobType: 'part-time' });
    });

    it('should handle null values for optional fields', async () => {
      const res = await request(app)
        .patch(`/api/candidates/${testCandidateId}`)
        .send({
          location: null,
          specialty: null,
          cvUrl: null,
          preferences: null
        })
        .expect(200);

      expect(res.body.message).toBe('Candidate updated successfully');
      expect(res.body.data.location).toBeNull();
      expect(res.body.data.specialty).toBeNull();
    });
  });

  describe('DELETE /api/candidates/:id', () => {
    it('should soft delete a candidate', async () => {
      // Create a candidate to delete
      const createRes = await request(app)
        .post('/api/candidates')
        .send({
          email: 'delete.test@example.com',
          firstName: 'Delete',
          lastName: 'Test'
        });
      
      const deleteId = createRes.body.data.id;

      const res = await request(app)
        .delete(`/api/candidates/${deleteId}`)
        .expect(200);

      expect(res.body.message).toBe('Candidate deleted successfully');

      // Verify it's deleted
      await request(app)
        .get(`/api/candidates/${deleteId}`)
        .expect(404);
    });

    it('should return 404 for non-existent candidate', async () => {
      const res = await request(app)
        .delete('/api/candidates/99999')
        .expect(404);

      expect(res.body.error).toBe('Candidate not found');
    });

    it('should return 400 for invalid candidate ID', async () => {
      const res = await request(app)
        .delete('/api/candidates/invalid')
        .expect(400);

      expect(res.body.error).toBe('Invalid candidate ID');
    });
  });

  describe('GET /api/candidates - pagination validation', () => {
    it('should reject invalid page number', async () => {
      const res = await request(app)
        .get('/api/candidates?page=0')
        .expect(400);

      expect(res.body.error).toBe('Invalid page number');
    });

    it('should reject invalid limit', async () => {
      const res = await request(app)
        .get('/api/candidates?limit=0')
        .expect(400);

      expect(res.body.error).toBe('Invalid limit');
    });

    it('should filter by experience range', async () => {
      const res = await request(app)
        .get('/api/candidates?minExperience=0&maxExperience=10')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
    });

    it('should sort by different fields', async () => {
      const res = await request(app)
        .get('/api/candidates?sortBy=firstName&sortOrder=asc')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should sort by experienceYears', async () => {
      const res = await request(app)
        .get('/api/candidates?sortBy=experienceYears&sortOrder=desc')
        .expect(200);

      expect(res.body).toHaveProperty('data');
    });

    it('should handle invalid sortBy gracefully', async () => {
      const res = await request(app)
        .get('/api/candidates?sortBy=invalidField')
        .expect(200);

      expect(res.body).toHaveProperty('data');
    });
  });

  describe('POST /api/candidates - validation', () => {
    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/candidates')
        .send({
          email: 'not-an-email',
          firstName: 'Test',
          lastName: 'User'
        })
        .expect(400);

      expect(res.body.error).toBe('Validation failed');
      expect(res.body.errors).toContain('email is required and must be a valid email');
    });

    it('should reject negative experienceYears', async () => {
      const res = await request(app)
        .post('/api/candidates')
        .send({
          email: 'exp.test@example.com',
          firstName: 'Test',
          lastName: 'User',
          experienceYears: -5
        })
        .expect(400);

      expect(res.body.error).toBe('Validation failed');
      expect(res.body.errors).toContain('experienceYears must be a non-negative number');
    });
  });
});

describe('Employer API', () => {
  let testEmployerId;

  const validEmployer = {
    name: 'Test Hospital',
    description: 'A leading medical institution',
    location: 'Berlin',
    website: 'https://testhospital.de',
    hospitalType: 'University Hospital',
    size: 'Large'
  };

  describe('POST /api/employers', () => {
    it('should create a new employer with valid data', async () => {
      const res = await request(app)
        .post('/api/employers')
        .send(validEmployer)
        .expect(201);

      expect(res.body.message).toBe('Employer created successfully');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe(validEmployer.name);

      testEmployerId = res.body.data.id;
    });

    it('should reject missing name', async () => {
      const res = await request(app)
        .post('/api/employers')
        .send({ location: 'Berlin' })
        .expect(400);

      expect(res.body.error).toBe('name is required');
    });
  });

  describe('GET /api/employers', () => {
    it('should list employers with pagination', async () => {
      const res = await request(app)
        .get('/api/employers')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter by location', async () => {
      const res = await request(app)
        .get('/api/employers?location=Berlin')
        .expect(200);

      res.body.data.forEach(employer => {
        expect(employer.location).toContain('Berlin');
      });
    });
  });

  describe('GET /api/employers/:id', () => {
    it('should get employer with jobs', async () => {
      const res = await request(app)
        .get(`/api/employers/${testEmployerId}`)
        .expect(200);

      expect(res.body.data).toHaveProperty('id', testEmployerId);
      expect(res.body.data).toHaveProperty('jobs');
      expect(Array.isArray(res.body.data.jobs)).toBe(true);
    });
  });

  describe('PATCH /api/employers/:id', () => {
    it('should update employer', async () => {
      const res = await request(app)
        .patch(`/api/employers/${testEmployerId}`)
        .send({ description: 'Updated description' })
        .expect(200);

      expect(res.body.message).toBe('Employer updated successfully');
      expect(res.body.data.description).toBe('Updated description');
    });
  });
});

describe('Jobs API', () => {
  let testJobId;
  let employerId;

  beforeAll(async () => {
    // Create an employer for job tests
    const res = await request(app)
      .post('/api/employers')
      .send({
        name: 'Job Test Hospital',
        location: 'Munich',
        hospitalType: 'City Hospital'
      });
    employerId = res.body.data.id;
  });

  const validJob = {
    employerId: null, // Will be set in tests
    title: 'Facharzt Kardiologie',
    specialty: 'Kardiologie',
    location: 'Munich',
    description: 'Exciting cardiology position',
    requirements: 'Facharztanerkennung',
    salaryMin: 70000,
    salaryMax: 90000,
    jobType: 'full-time',
    experienceRequired: 3
  };

  describe('POST /api/jobs', () => {
    it('should create a new job with valid data', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .send({ ...validJob, employerId })
        .expect(201);

      expect(res.body.message).toBe('Job created successfully');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe(validJob.title);

      testJobId = res.body.data.id;
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .send({ location: 'Berlin' })
        .expect(400);

      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/jobs', () => {
    it('should list jobs with pagination', async () => {
      const res = await request(app)
        .get('/api/jobs')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter by specialty', async () => {
      const res = await request(app)
        .get('/api/jobs?specialty=Kardiologie')
        .expect(200);

      res.body.data.forEach(job => {
        expect(job.specialty).toContain('Kardiologie');
      });
    });

    it('should filter by salary range', async () => {
      const res = await request(app)
        .get('/api/jobs?minSalary=60000&maxSalary=100000')
        .expect(200);

      res.body.data.forEach(job => {
        expect(job.salaryMax).toBeGreaterThanOrEqual(60000);
        expect(job.salaryMin).toBeLessThanOrEqual(100000);
      });
    });
  });

  describe('GET /api/jobs/:id', () => {
    it('should get a single job', async () => {
      const res = await request(app)
        .get(`/api/jobs/${testJobId}`)
        .expect(200);

      expect(res.body.data).toHaveProperty('id', testJobId);
      expect(res.body.data).toHaveProperty('employerName');
    });
  });

  describe('PATCH /api/jobs/:id', () => {
    it('should update job', async () => {
      const res = await request(app)
        .patch(`/api/jobs/${testJobId}`)
        .send({ salaryMax: 95000 })
        .expect(200);

      expect(res.body.message).toBe('Job updated successfully');
      expect(res.body.data.salaryMax).toBe(95000);
    });
  });

  describe('DELETE /api/jobs/:id', () => {
    it('should soft delete a job', async () => {
      const res = await request(app)
        .delete(`/api/jobs/${testJobId}`)
        .expect(200);

      expect(res.body.message).toBe('Job deleted successfully');
    });

    it('should return 404 for deleted job', async () => {
      await request(app)
        .get(`/api/jobs/${testJobId}`)
        .expect(404);
    });
  });
});

describe('Job Matching Algorithm', () => {
  describe('calculateMatchScore function', () => {
    it('should return perfect score for exact match', () => {
      const candidate = {
        specialty: 'Kardiologie',
        location: 'Berlin',
        experienceYears: 5,
        preferences: { minSalary: 80000 }
      };
      const job = {
        specialty: 'Kardiologie',
        location: 'Berlin',
        experienceRequired: 3,
        salaryMax: 90000
      };

      const result = calculateMatchScore(candidate, job);
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.matchedCriteria).toBeGreaterThan(0);
    });

    it('should return lower score for partial specialty match', () => {
      const candidate = { specialty: 'Innere Medizin' };
      const job = { specialty: 'Kardiologie' };

      const result = calculateMatchScore(candidate, job);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThan(70);
    });

    it('should consider experience match', () => {
      const candidate = { experienceYears: 5 };
      const jobLow = { experienceRequired: 2 };
      const jobHigh = { experienceRequired: 10 };

      const resultLow = calculateMatchScore(candidate, jobLow);
      const resultHigh = calculateMatchScore(candidate, jobHigh);

      expect(resultLow.score).toBeGreaterThan(resultHigh.score);
    });

    it('should consider salary match', () => {
      const candidate = { preferences: { minSalary: 80000 } };
      const jobGood = { salaryMax: 90000 };
      const jobLow = { salaryMax: 50000 };

      const resultGood = calculateMatchScore(candidate, jobGood);
      const resultLow = calculateMatchScore(candidate, jobLow);

      expect(resultGood.score).toBeGreaterThan(resultLow.score);
    });

    it('should handle missing candidate data gracefully', () => {
      const candidate = {};
      const job = {
        specialty: 'Kardiologie',
        location: 'Berlin',
        experienceRequired: 3,
        salaryMax: 90000
      };

      const result = calculateMatchScore(candidate, job);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.reasons)).toBe(true);
    });

    it('should handle partial location match', () => {
      const candidate = { location: 'Berlin, Germany' };
      const job = { location: 'Berlin' };

      const result = calculateMatchScore(candidate, job);
      expect(result.score).toBeGreaterThan(0);
      expect(result.reasons.some(r => r.includes('Location'))).toBe(true);
    });

    it('should handle candidate with location containing job location', () => {
      const candidate = { location: 'Munich' };
      const job = { location: 'Munich, Bavaria' };

      const result = calculateMatchScore(candidate, job);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle exact location match', () => {
      const candidate = { location: 'Hamburg' };
      const job = { location: 'Hamburg' };

      const result = calculateMatchScore(candidate, job);
      expect(result.score).toBeGreaterThanOrEqual(25); // Full location weight
      expect(result.reasons.some(r => r.includes('exact match'))).toBe(true);
    });

    it('should score lower for significantly below required experience', () => {
      const candidate = { experienceYears: 1 };
      const job = { experienceRequired: 5 };

      const result = calculateMatchScore(candidate, job);
      expect(result.score).toBeLessThan(30);
    });

    it('should give bonus points for experience exceeding requirements', () => {
      const candidate = { 
        specialty: 'Kardiologie',
        location: 'Berlin',
        experienceYears: 10,
        preferences: { minSalary: 80000 }
      };
      const job = { 
        specialty: 'Kardiologie',
        location: 'Berlin',
        experienceRequired: 3,
        salaryMax: 90000
      };

      const result = calculateMatchScore(candidate, job);
      expect(result.score).toBeGreaterThan(90);
    });

    it('should handle job with no salary data', () => {
      const candidate = { 
        specialty: 'Kardiologie',
        preferences: { minSalary: 80000 }
      };
      const job = { specialty: 'Kardiologie' };

      const result = calculateMatchScore(candidate, job);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle candidate with no salary preferences', () => {
      const candidate = { specialty: 'Kardiologie' };
      const job = { 
        specialty: 'Kardiologie',
        salaryMax: 90000
      };

      const result = calculateMatchScore(candidate, job);
      expect(result.score).toBeGreaterThan(0);
      expect(result.reasons.some(r => r.includes('Specialty'))).toBe(true);
    });
  });
});

describe('Matches API', () => {
  let candidateId;
  let employerId;

  beforeAll(async () => {
    // Create test candidate
    const candidateRes = await request(app)
      .post('/api/candidates')
      .send({
        email: 'match.test@example.com',
        firstName: 'Match',
        lastName: 'Tester',
        location: 'Berlin',
        specialty: 'Kardiologie',
        experienceYears: 5,
        preferences: { minSalary: 70000 }
      });
    candidateId = candidateRes.body.data.id;

    // Create test employer
    const employerRes = await request(app)
      .post('/api/employers')
      .send({
        name: 'Match Test Hospital',
        location: 'Berlin',
        hospitalType: 'University Hospital'
      });
    employerId = employerRes.body.data.id;

    // Create test jobs
    await request(app)
      .post('/api/jobs')
      .send({
        employerId,
        title: 'Facharzt Kardiologie',
        specialty: 'Kardiologie',
        location: 'Berlin',
        salaryMin: 75000,
        salaryMax: 95000,
        experienceRequired: 3
      });

    await request(app)
      .post('/api/jobs')
      .send({
        employerId,
        title: 'Assistenzarzt Chirurgie',
        specialty: 'Chirurgie',
        location: 'Munich',
        salaryMin: 50000,
        salaryMax: 60000,
        experienceRequired: 0
      });
  });

  describe('GET /api/matches', () => {
    it('should return matches for a candidate', async () => {
      const res = await request(app)
        .get(`/api/matches?candidateId=${candidateId}`)
        .expect(200);

      expect(res.body).toHaveProperty('candidate');
      expect(res.body).toHaveProperty('matches');
      expect(Array.isArray(res.body.matches)).toBe(true);
      expect(res.body.matches.length).toBeGreaterThan(0);
    });

    it('should rank matches by score', async () => {
      const res = await request(app)
        .get(`/api/matches?candidateId=${candidateId}`)
        .expect(200);

      // Kardiologie job in Berlin should rank higher
      const kardioMatch = res.body.matches.find(m => m.job.specialty === 'Kardiologie');
      const chirurgieMatch = res.body.matches.find(m => m.job.specialty === 'Chirurgie');

      if (kardioMatch && chirurgieMatch) {
        expect(kardioMatch.matchScore).toBeGreaterThanOrEqual(chirurgieMatch.matchScore);
      }
    });

    it('should filter by minimum score', async () => {
      const res = await request(app)
        .get(`/api/matches?candidateId=${candidateId}&minScore=50`)
        .expect(200);

      res.body.matches.forEach(match => {
        expect(match.matchScore).toBeGreaterThanOrEqual(50);
      });
    });

    it('should return 400 without candidateId', async () => {
      await request(app)
        .get('/api/matches')
        .expect(400);
    });

    it('should return 404 for non-existent candidate', async () => {
      await request(app)
        .get('/api/matches?candidateId=99999')
        .expect(404);
    });

    it('should include match reasons', async () => {
      const res = await request(app)
        .get(`/api/matches?candidateId=${candidateId}`)
        .expect(200);

      res.body.matches.forEach(match => {
        expect(match).toHaveProperty('matchReasons');
        expect(Array.isArray(match.matchReasons)).toBe(true);
        expect(match).toHaveProperty('matchedCriteria');
        expect(typeof match.matchedCriteria).toBe('number');
      });
    });
  });
});

describe('Seed Data API', () => {
  it('should seed employers and jobs', async () => {
    const res = await request(app)
      .post('/api/seed')
      .expect(200);

    expect(res.body).toHaveProperty('employersInserted');
    expect(res.body).toHaveProperty('jobsInserted');
  });

  it('should handle multiple seed calls gracefully', async () => {
    // Second call should not duplicate (uses INSERT OR IGNORE)
    const res = await request(app)
      .post('/api/seed')
      .expect(200);

    expect(res.body).toHaveProperty('employersInserted');
    expect(res.body).toHaveProperty('jobsInserted');
  });
});

describe('Health Check', () => {
  it('should return health status', async () => {
    const res = await request(app)
      .get('/api/health')
      .expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body.service).toBe('medmatch-api');
  });
});

describe('Signup / Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new candidate', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'signup.test@example.com',
          firstName: 'Signup',
          lastName: 'Test',
          yearOfGraduation: '2024',
          specialization: 'Kardiologie',
          state: 'Bayern'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Successfully joined the waitlist!');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.email).toBe('signup.test@example.com');
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          yearOfGraduation: '2024'
        })
        .expect(400);

      expect(res.body.error).toBe('Missing required fields');
      expect(res.body.required).toContain('email');
      expect(res.body.required).toContain('firstName');
      expect(res.body.required).toContain('lastName');
    });

    it('should reject duplicate email', async () => {
      // First signup
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          firstName: 'First',
          lastName: 'User'
        });

      // Duplicate signup
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          firstName: 'Second',
          lastName: 'User'
        })
        .expect(409);

      expect(res.body.error).toBe('Email already registered');
    });
  });

  describe('GET /api/signups', () => {
    it('should list all signups', async () => {
      const res = await request(app)
        .get('/api/signups')
        .expect(200);

      expect(res.body).toHaveProperty('count');
      expect(res.body).toHaveProperty('signups');
      expect(Array.isArray(res.body.signups)).toBe(true);
      expect(res.body.signups.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/signups/count', () => {
    it('should return signup count', async () => {
      const res = await request(app)
        .get('/api/signups/count')
        .expect(200);

      expect(res.body).toHaveProperty('count');
      expect(typeof res.body.count).toBe('number');
      expect(res.body.count).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Employer API - Extended', () => {
  let testEmployerId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/employers')
      .send({
        name: 'Extended Test Hospital',
        location: 'Hamburg',
        hospitalType: 'City Hospital',
        size: 'Medium'
      });
    testEmployerId = res.body.data.id;
  });

  describe('GET /api/employers - pagination validation', () => {
    it('should reject invalid page number', async () => {
      const res = await request(app)
        .get('/api/employers?page=0')
        .expect(400);

      expect(res.body.error).toBe('Invalid page number');
    });

    it('should reject invalid limit', async () => {
      const res = await request(app)
        .get('/api/employers?limit=0')
        .expect(400);

      expect(res.body.error).toBe('Invalid limit');
    });

    it('should filter by hospitalType', async () => {
      const res = await request(app)
        .get('/api/employers?hospitalType=City%20Hospital')
        .expect(200);

      res.body.data.forEach(employer => {
        expect(employer.hospitalType).toBe('City Hospital');
      });
    });
  });

  describe('GET /api/employers/:id - error cases', () => {
    it('should return 404 for non-existent employer', async () => {
      const res = await request(app)
        .get('/api/employers/99999')
        .expect(404);

      expect(res.body.error).toBe('Employer not found');
    });

    it('should return 400 for invalid employer ID', async () => {
      const res = await request(app)
        .get('/api/employers/invalid')
        .expect(400);

      expect(res.body.error).toBe('Invalid employer ID');
    });
  });

  describe('PATCH /api/employers/:id - validation', () => {
    it('should reject empty name', async () => {
      const res = await request(app)
        .patch(`/api/employers/${testEmployerId}`)
        .send({ name: '' })
        .expect(400);

      expect(res.body.error).toBe('name cannot be empty');
    });

    it('should return 404 for non-existent employer', async () => {
      const res = await request(app)
        .patch('/api/employers/99999')
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(res.body.error).toBe('Employer not found');
    });

    it('should reject update with no fields', async () => {
      const res = await request(app)
        .patch(`/api/employers/${testEmployerId}`)
        .send({})
        .expect(400);

      expect(res.body.error).toBe('No fields to update');
    });

    it('should update all employer fields', async () => {
      const res = await request(app)
        .patch(`/api/employers/${testEmployerId}`)
        .send({
          name: 'Fully Updated Hospital',
          description: 'New description',
          location: 'Berlin',
          website: 'https://updated.de',
          hospitalType: 'University Hospital',
          size: 'Large'
        })
        .expect(200);

      expect(res.body.message).toBe('Employer updated successfully');
      expect(res.body.data.name).toBe('Fully Updated Hospital');
      expect(res.body.data.description).toBe('New description');
      expect(res.body.data.location).toBe('Berlin');
      expect(res.body.data.website).toBe('https://updated.de');
      expect(res.body.data.hospitalType).toBe('University Hospital');
      expect(res.body.data.size).toBe('Large');
    });

    it('should handle null values for optional fields', async () => {
      const res = await request(app)
        .patch(`/api/employers/${testEmployerId}`)
        .send({
          description: null,
          website: null
        })
        .expect(200);

      expect(res.body.message).toBe('Employer updated successfully');
    });
  });
});

describe('Jobs API - Extended', () => {
  let testJobId;
  let employerId;

  beforeAll(async () => {
    const employerRes = await request(app)
      .post('/api/employers')
      .send({
        name: 'Job Extended Hospital',
        location: 'Frankfurt',
        hospitalType: 'University Hospital'
      });
    employerId = employerRes.body.data.id;

    const jobRes = await request(app)
      .post('/api/jobs')
      .send({
        employerId,
        title: 'Extended Test Job',
        specialty: 'Neurologie',
        location: 'Frankfurt',
        jobType: 'part-time',
        salaryMin: 60000,
        salaryMax: 80000,
        experienceRequired: 2
      });
    testJobId = jobRes.body.data.id;
  });

  describe('GET /api/jobs - filtering', () => {
    it('should filter by employerId', async () => {
      const res = await request(app)
        .get(`/api/jobs?employerId=${employerId}`)
        .expect(200);

      res.body.data.forEach(job => {
        expect(job.employerId).toBe(employerId);
      });
    });

    it('should filter by jobType', async () => {
      const res = await request(app)
        .get('/api/jobs?jobType=part-time')
        .expect(200);

      res.body.data.forEach(job => {
        expect(job.jobType).toBe('part-time');
      });
    });

    it('should filter by location', async () => {
      const res = await request(app)
        .get('/api/jobs?location=Frankfurt')
        .expect(200);

      res.body.data.forEach(job => {
        expect(job.location).toContain('Frankfurt');
      });
    });

    it('should filter by experience range', async () => {
      const res = await request(app)
        .get('/api/jobs?minExperience=1&maxExperience=5')
        .expect(200);

      res.body.data.forEach(job => {
        expect(job.experienceRequired).toBeGreaterThanOrEqual(1);
        expect(job.experienceRequired).toBeLessThanOrEqual(5);
      });
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/jobs?status=active')
        .expect(200);

      res.body.data.forEach(job => {
        expect(job.status).toBe('active');
      });
    });

    it('should sort by different fields', async () => {
      const res = await request(app)
        .get('/api/jobs?sortBy=title&sortOrder=asc')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should reject invalid page number', async () => {
      const res = await request(app)
        .get('/api/jobs?page=0')
        .expect(400);

      expect(res.body.error).toBe('Invalid page number');
    });

    it('should reject invalid limit', async () => {
      const res = await request(app)
        .get('/api/jobs?limit=0')
        .expect(400);

      expect(res.body.error).toBe('Invalid limit');
    });
  });

  describe('GET /api/jobs/:id - error cases', () => {
    it('should return 404 for non-existent job', async () => {
      const res = await request(app)
        .get('/api/jobs/99999')
        .expect(404);

      expect(res.body.error).toBe('Job not found');
    });

    it('should return 400 for invalid job ID', async () => {
      const res = await request(app)
        .get('/api/jobs/invalid')
        .expect(400);

      expect(res.body.error).toBe('Invalid job ID');
    });
  });

  describe('POST /api/jobs - validation', () => {
    it('should reject job with non-existent employer', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .send({
          employerId: 99999,
          title: 'Test Job'
        })
        .expect(404);

      expect(res.body.error).toBe('Employer not found');
    });

    it('should reject invalid employerId format', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .send({
          employerId: 'invalid',
          title: 'Test Job'
        })
        .expect(400);

      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('PATCH /api/jobs/:id - validation', () => {
    it('should reject empty title', async () => {
      const res = await request(app)
        .patch(`/api/jobs/${testJobId}`)
        .send({ title: '' })
        .expect(400);

      expect(res.body.error).toBe('title cannot be empty');
    });

    it('should return 404 for non-existent job', async () => {
      const res = await request(app)
        .patch('/api/jobs/99999')
        .send({ title: 'Updated Title' })
        .expect(404);

      expect(res.body.error).toBe('Job not found');
    });

    it('should reject update with no fields', async () => {
      const res = await request(app)
        .patch(`/api/jobs/${testJobId}`)
        .send({})
        .expect(400);

      expect(res.body.error).toBe('No fields to update');
    });

    it('should update all job fields', async () => {
      const res = await request(app)
        .patch(`/api/jobs/${testJobId}`)
        .send({
          title: 'Senior Neurologist',
          specialty: 'Neurologie',
          location: 'Berlin',
          description: 'Updated description',
          requirements: 'Updated requirements',
          salaryMin: 80000,
          salaryMax: 100000,
          jobType: 'full-time',
          experienceRequired: 5,
          status: 'active',
          expiresAt: '2025-12-31'
        })
        .expect(200);

      expect(res.body.message).toBe('Job updated successfully');
      expect(res.body.data.title).toBe('Senior Neurologist');
      expect(res.body.data.salaryMin).toBe(80000);
      expect(res.body.data.salaryMax).toBe(100000);
      expect(res.body.data.experienceRequired).toBe(5);
      expect(res.body.data.status).toBe('active');
    });

    it('should handle null values for optional fields', async () => {
      const res = await request(app)
        .patch(`/api/jobs/${testJobId}`)
        .send({
          salaryMin: null,
          salaryMax: null,
          experienceRequired: null,
          expiresAt: null
        })
        .expect(200);

      expect(res.body.message).toBe('Job updated successfully');
    });
  });

  describe('DELETE /api/jobs/:id - error cases', () => {
    it('should return 404 for already deleted job', async () => {
      // Create and delete a job
      const createRes = await request(app)
        .post('/api/jobs')
        .send({
          employerId,
          title: 'To Delete'
        });
      
      const deleteJobId = createRes.body.data.id;
      await request(app).delete(`/api/jobs/${deleteJobId}`);

      // Try to delete again
      const res = await request(app)
        .delete(`/api/jobs/${deleteJobId}`)
        .expect(404);

      expect(res.body.error).toBe('Job not found');
    });

    it('should return 400 for invalid job ID', async () => {
      const res = await request(app)
        .delete('/api/jobs/invalid')
        .expect(400);

      expect(res.body.error).toBe('Invalid job ID');
    });
  });
});
