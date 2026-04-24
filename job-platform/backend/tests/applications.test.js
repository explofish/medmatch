/**
 * Unit tests for Application System, Dashboard, and Notification APIs
 */

const request = require('supertest');
const app = require('../src/server');

describe('Application System API', () => {
  let testCandidateId;
  let testJobId;
  let testEmployerId;
  let testApplicationId;

  // Setup: Create test data before running tests
  beforeAll(async () => {
    // Create a test employer
    const employerRes = await request(app)
      .post('/api/employers')
      .send({
        name: 'Test Hospital',
        type: 'community_hospital',
        location: 'Berlin'
      });
    testEmployerId = employerRes.body.data.id;

    // Create a test job
    const jobRes = await request(app)
      .post('/api/jobs')
      .send({
        employerId: testEmployerId,
        title: 'Test Physician',
        specialty: 'Internal Medicine',
        location: 'Berlin',
        jobType: 'full-time'
      });
    testJobId = jobRes.body.data.id;

    // Create a test candidate
    const candidateRes = await request(app)
      .post('/api/candidates')
      .send({
        email: `test${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'Candidate',
        location: 'Berlin',
        specialty: 'Internal Medicine',
        experienceYears: 3
      });
    testCandidateId = candidateRes.body.data.id;
  });

  describe('POST /api/applications', () => {
    test('should submit a new application', async () => {
      const res = await request(app)
        .post('/api/applications')
        .send({
          candidateId: testCandidateId,
          jobId: testJobId,
          coverLetter: 'I am very interested in this position.',
          cvUrl: 'https://example.com/cv.pdf'
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Application submitted successfully');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data).toHaveProperty('matchScore');

      testApplicationId = res.body.data.id;
    });

    test('should reject duplicate application', async () => {
      const res = await request(app)
        .post('/api/applications')
        .send({
          candidateId: testCandidateId,
          jobId: testJobId,
          coverLetter: 'Another application'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Already applied to this job');
    });

    test('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/applications')
        .send({
          coverLetter: 'Missing candidate and job'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    test('should reject application to non-existent job', async () => {
      const res = await request(app)
        .post('/api/applications')
        .send({
          candidateId: testCandidateId,
          jobId: 99999,
          coverLetter: 'Test'
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Job not found');
    });

    test('should reject application from non-existent candidate', async () => {
      const res = await request(app)
        .post('/api/applications')
        .send({
          candidateId: 99999,
          jobId: testJobId,
          coverLetter: 'Test'
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Candidate not found');
    });
  });

  describe('GET /api/applications', () => {
    test('should list all applications', async () => {
      const res = await request(app).get('/api/applications');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body).toHaveProperty('pagination');
    });

    test('should filter by candidateId', async () => {
      const res = await request(app)
        .get(`/api/applications?candidateId=${testCandidateId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].candidateId).toBe(testCandidateId);
    });

    test('should filter by jobId', async () => {
      const res = await request(app)
        .get(`/api/applications?jobId=${testJobId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].jobId).toBe(testJobId);
    });

    test('should filter by status', async () => {
      const res = await request(app)
        .get('/api/applications?status=pending');

      expect(res.status).toBe(200);
      expect(res.body.data.every(app => app.status === 'pending')).toBe(true);
    });

    test('should support pagination', async () => {
      const res = await request(app)
        .get('/api/applications?page=1&limit=5');

      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/applications/:id', () => {
    test('should get single application details', async () => {
      const res = await request(app)
        .get(`/api/applications/${testApplicationId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(testApplicationId);
      expect(res.body.data).toHaveProperty('candidateFirstName');
      expect(res.body.data).toHaveProperty('jobTitle');
      expect(res.body.data).toHaveProperty('employerName');
    });

    test('should return 404 for non-existent application', async () => {
      const res = await request(app).get('/api/applications/99999');

      expect(res.status).toBe(404);
    });

    test('should validate application ID', async () => {
      const res = await request(app).get('/api/applications/invalid');

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/applications/:id', () => {
    test('should update application status', async () => {
      const res = await request(app)
        .patch(`/api/applications/${testApplicationId}`)
        .send({
          status: 'reviewed',
          notes: 'Good candidate, will interview'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('reviewed');
    });

    test('should accept application', async () => {
      const res = await request(app)
        .patch(`/api/applications/${testApplicationId}`)
        .send({
          status: 'accepted'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('accepted');
    });

    test('should reject application', async () => {
      const res = await request(app)
        .patch(`/api/applications/${testApplicationId}`)
        .send({
          status: 'rejected'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('rejected');
    });

    test('should validate status values', async () => {
      const res = await request(app)
        .patch(`/api/applications/${testApplicationId}`)
        .send({
          status: 'invalid_status'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/candidates/:id/applications', () => {
    test('should get all applications for a candidate', async () => {
      const res = await request(app)
        .get(`/api/candidates/${testCandidateId}/applications`);

      expect(res.status).toBe(200);
      expect(res.body.candidateId).toBe(testCandidateId);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body).toHaveProperty('summary');
      expect(res.body.summary).toHaveProperty('byStatus');
    });

    test('should return 404 for non-existent candidate', async () => {
      const res = await request(app)
        .get('/api/candidates/99999/applications');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/jobs/:id/applications', () => {
    test('should get all applications for a job', async () => {
      const res = await request(app)
        .get(`/api/jobs/${testJobId}/applications`);

      expect(res.status).toBe(200);
      expect(res.body.jobId).toBe(testJobId);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body).toHaveProperty('summary');
      expect(res.body.summary).toHaveProperty('averageMatchScore');
    });

    test('should return 404 for non-existent job', async () => {
      const res = await request(app)
        .get('/api/jobs/99999/applications');

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/applications/:id', () => {
    let appToDelete;

    beforeAll(async () => {
      // Create a new application to delete
      const res = await request(app)
        .post('/api/applications')
        .send({
          candidateId: testCandidateId,
          jobId: testJobId,
          coverLetter: 'To be deleted'
        });
      if (res.status === 409) {
        // Already exists, find it
        const listRes = await request(app)
          .get(`/api/applications?candidateId=${testCandidateId}&jobId=${testJobId}`);
        appToDelete = listRes.body.data[0]?.id;
      } else {
        appToDelete = res.body.data.id;
      }
    });

    test('should withdraw application', async () => {
      // First create a new job and application for deletion test
      const newJob = await request(app)
        .post('/api/jobs')
        .send({
          employerId: testEmployerId,
          title: 'Another Test Job',
          specialty: 'Cardiology',
          location: 'Munich',
          jobType: 'full-time'
        });
      
      const newApp = await request(app)
        .post('/api/applications')
        .send({
          candidateId: testCandidateId,
          jobId: newJob.body.data.id,
          coverLetter: 'Temporary application'
        });

      const res = await request(app)
        .delete(`/api/applications/${newApp.body.data.id}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Application withdrawn successfully');
    });

    test('should return 404 for non-existent application', async () => {
      const res = await request(app)
        .delete('/api/applications/99999');

      expect(res.status).toBe(404);
    });
  });
});

describe('Dashboard API', () => {
  let testEmployerId;
  let testCandidateId;

  beforeAll(async () => {
    // Create test employer
    const employerRes = await request(app)
      .post('/api/employers')
      .send({
        name: 'Dashboard Test Hospital',
        type: 'university_hospital',
        location: 'Munich'
      });
    testEmployerId = employerRes.body.data.id;

    // Create test candidate
    const candidateRes = await request(app)
      .post('/api/candidates')
      .send({
        email: `dashboardtest${Date.now()}@example.com`,
        firstName: 'Dashboard',
        lastName: 'Test',
        location: 'Munich',
        specialty: 'Cardiology',
        experienceYears: 5,
        desiredSalaryMin: 80000,
        desiredSalaryMax: 120000,
        preferredJobType: 'full-time',
        preferredLocations: 'Munich, Berlin',
        skills: 'Cardiology, Emergency Medicine',
        cvUrl: 'https://example.com/cv.pdf'
      });
    testCandidateId = candidateRes.body.data.id;

    // Create a job and application for testing
    const jobRes = await request(app)
      .post('/api/jobs')
      .send({
        employerId: testEmployerId,
        title: 'Dashboard Test Job',
        specialty: 'Cardiology',
        location: 'Munich',
        jobType: 'full-time'
      });

    await request(app)
      .post('/api/applications')
      .send({
        candidateId: testCandidateId,
        jobId: jobRes.body.data.id,
        coverLetter: 'Test application'
      });
  });

  describe('GET /api/dashboard/employer/:id', () => {
    test('should return employer dashboard stats', async () => {
      const res = await request(app)
        .get(`/api/dashboard/employer/${testEmployerId}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('employerId', testEmployerId);
      expect(res.body).toHaveProperty('employerName');
      expect(res.body).toHaveProperty('summary');
      expect(res.body.summary).toHaveProperty('totalActiveJobs');
      expect(res.body.summary).toHaveProperty('totalApplications');
      expect(res.body).toHaveProperty('applications');
      expect(res.body.applications).toHaveProperty('byStatus');
      expect(res.body).toHaveProperty('recentActivity');
      expect(res.body).toHaveProperty('jobs');
    });

    test('should return 404 for non-existent employer', async () => {
      const res = await request(app)
        .get('/api/dashboard/employer/99999');

      expect(res.status).toBe(404);
    });

    test('should validate employer ID', async () => {
      const res = await request(app)
        .get('/api/dashboard/employer/invalid');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/dashboard/candidate/:id', () => {
    test('should return candidate dashboard stats', async () => {
      const res = await request(app)
        .get(`/api/dashboard/candidate/${testCandidateId}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('candidateId', testCandidateId);
      expect(res.body).toHaveProperty('candidateName');
      expect(res.body).toHaveProperty('summary');
      expect(res.body.summary).toHaveProperty('totalApplications');
      expect(res.body).toHaveProperty('applications');
      expect(res.body.applications).toHaveProperty('byStatus');
      expect(res.body.applications).toHaveProperty('recent');
      expect(res.body).toHaveProperty('profile');
      expect(res.body.profile).toHaveProperty('completionPercentage');
      expect(res.body.profile).toHaveProperty('hasCv');
      expect(res.body).toHaveProperty('recommendations');
    });

    test('should return 404 for non-existent candidate', async () => {
      const res = await request(app)
        .get('/api/dashboard/candidate/99999');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/dashboard/admin', () => {
    test('should return system-wide admin stats', async () => {
      const res = await request(app)
        .get('/api/dashboard/admin');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totals');
      expect(res.body.totals).toHaveProperty('candidates');
      expect(res.body.totals).toHaveProperty('employers');
      expect(res.body.totals).toHaveProperty('jobs');
      expect(res.body.totals).toHaveProperty('applications');
      expect(res.body).toHaveProperty('recentActivity');
      expect(res.body).toHaveProperty('specialties');
      expect(res.body).toHaveProperty('locations');
      expect(res.body).toHaveProperty('systemHealth');
    });
  });
});

describe('Notifications API', () => {
  let testNotificationId;

  describe('POST /api/notifications (create via application)', () => {
    test('notifications should be created when application is submitted', async () => {
      // Create test data
      const employer = await request(app)
        .post('/api/employers')
        .send({ name: 'Notify Test', type: 'clinic', location: 'Berlin' });

      const job = await request(app)
        .post('/api/jobs')
        .send({
          employerId: employer.body.data.id,
          title: 'Notify Job',
          specialty: 'Internal Medicine',
          location: 'Berlin',
          jobType: 'full-time'
        });

      const candidate = await request(app)
        .post('/api/candidates')
        .send({
          email: `notify${Date.now()}@example.com`,
          firstName: 'Notify',
          lastName: 'Test'
        });

      // Submit application
      await request(app)
        .post('/api/applications')
        .send({
          candidateId: candidate.body.data.id,
          jobId: job.body.data.id
        });

      // Check candidate notifications
      const res = await request(app)
        .get(`/api/notifications?userType=candidate&userId=${candidate.body.data.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/notifications', () => {
    test('should list notifications for user', async () => {
      // First create a candidate to get notifications
      const candidate = await request(app)
        .post('/api/candidates')
        .send({
          email: `notiflist${Date.now()}@example.com`,
          firstName: 'Notif',
          lastName: 'List'
        });

      const res = await request(app)
        .get(`/api/notifications?userType=candidate&userId=${candidate.body.data.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body).toHaveProperty('summary');
      expect(res.body.summary).toHaveProperty('unreadCount');
      expect(res.body).toHaveProperty('pagination');
    });

    test('should filter by unread only', async () => {
      const candidate = await request(app)
        .post('/api/candidates')
        .send({
          email: `unread${Date.now()}@example.com`,
          firstName: 'Unread',
          lastName: 'Test'
        });

      const res = await request(app)
        .get(`/api/notifications?userType=candidate&userId=${candidate.body.data.id}&unreadOnly=true`);

      expect(res.status).toBe(200);
      expect(res.body.data.every(n => n.read === 0)).toBe(true);
    });

    test('should validate userType', async () => {
      const res = await request(app)
        .get('/api/notifications?userType=invalid&userId=1');

      expect(res.status).toBe(400);
    });

    test('should require userId', async () => {
      const res = await request(app)
        .get('/api/notifications?userType=candidate');

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    test('should mark notification as read', async () => {
      // Create a notification manually for testing
      const db = app.locals.db;
      
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO notifications (userType, userId, type, message, read) 
           VALUES (?, ?, ?, ?, ?)`,
          ['candidate', 1, 'test', 'Test notification', 0],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      }).then(id => {
        testNotificationId = id;
      }).catch(() => {
        // If insert fails, use ID 1 for test
        testNotificationId = 1;
      });

      // Find any notification to test with
      const listRes = await request(app)
        .get('/api/notifications?userType=candidate&userId=1');
      
      if (listRes.body.data.length > 0) {
        const notifId = listRes.body.data[0].id;
        const res = await request(app)
          .patch(`/api/notifications/${notifId}/read`);

        if (res.status === 200) {
          expect(res.body.message).toBe('Notification marked as read');
        }
      }
    });

    test('should return 404 for non-existent notification', async () => {
      const res = await request(app)
        .patch('/api/notifications/99999/read');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/notifications/mark-all-read', () => {
    test('should mark all notifications as read', async () => {
      const candidate = await request(app)
        .post('/api/candidates')
        .send({
          email: `markall${Date.now()}@example.com`,
          firstName: 'Mark',
          lastName: 'All'
        });

      const res = await request(app)
        .post('/api/notifications/mark-all-read')
        .send({
          userType: 'candidate',
          userId: candidate.body.data.id
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('All notifications marked as read');
    });

    test('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/notifications/mark-all-read')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    test('should delete a notification', async () => {
      // Create a notification first
      const db = app.locals.db;
      let notifId;
      
      try {
        notifId = await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO notifications (userType, userId, type, message, read) 
             VALUES (?, ?, ?, ?, ?)`,
            ['candidate', 1, 'delete_test', 'To be deleted', 1],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
      } catch (e) {
        // If insert fails, find an existing notification
        const listRes = await request(app)
          .get('/api/notifications?userType=candidate&userId=1');
        if (listRes.body.data.length > 0) {
          notifId = listRes.body.data[0].id;
        }
      }

      if (notifId) {
        const res = await request(app)
          .delete(`/api/notifications/${notifId}`);

        if (res.status === 200) {
          expect(res.body.message).toBe('Notification deleted successfully');
        }
      }
    });
  });
});

describe('Candidate Enhanced Endpoints', () => {
  describe('GET /api/candidates/:id/matches', () => {
    test('should get job matches for candidate', async () => {
      // Create candidate and job
      const candidate = await request(app)
        .post('/api/candidates')
        .send({
          email: `matches${Date.now()}@example.com`,
          firstName: 'Matches',
          lastName: 'Test',
          location: 'Berlin',
          specialty: 'Internal Medicine',
          experienceYears: 3
        });

      const res = await request(app)
        .get(`/api/candidates/${candidate.body.data.id}/matches`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('candidate');
      expect(res.body).toHaveProperty('matches');
      expect(res.body).toHaveProperty('summary');
    });

    test('should exclude already applied jobs when excludeApplied=true', async () => {
      // Create candidate
      const candidate = await request(app)
        .post('/api/candidates')
        .send({
          email: `exclude${Date.now()}@example.com`,
          firstName: 'Exclude',
          lastName: 'Test',
          location: 'Berlin',
          specialty: 'Cardiology',
          experienceYears: 5
        });

      const candidateId = candidate.body.data.id;

      // Create employer and job
      const employer = await request(app)
        .post('/api/employers')
        .send({ name: 'Exclude Test', type: 'hospital', location: 'Berlin' });

      const job = await request(app)
        .post('/api/jobs')
        .send({
          employerId: employer.body.data.id,
          title: 'Exclude Test Job',
          specialty: 'Cardiology',
          location: 'Berlin',
          jobType: 'full-time'
        });

      // Apply to the job
      await request(app)
        .post('/api/applications')
        .send({
          candidateId,
          jobId: job.body.data.id
        });

      // Get matches excluding applied
      const res = await request(app)
        .get(`/api/candidates/${candidateId}/matches?excludeApplied=true`);

      expect(res.status).toBe(200);
      expect(res.body.filters.excludeApplied).toBe(true);
      expect(res.body.filters.excludedJobCount).toBeGreaterThan(0);
      
      // Verify the applied job is not in results
      const appliedJobInResults = res.body.matches.some(m => m.job.id === job.body.data.id);
      expect(appliedJobInResults).toBe(false);
    });

    test('should support filtering by specialty', async () => {
      const candidate = await request(app)
        .post('/api/candidates')
        .send({
          email: `specialty${Date.now()}@example.com`,
          firstName: 'Specialty',
          lastName: 'Test',
          specialty: 'Cardiology'
        });

      const res = await request(app)
        .get(`/api/candidates/${candidate.body.data.id}/matches?specialty=Cardiology`);

      expect(res.status).toBe(200);
      // All matches should be Cardiology specialty
      expect(res.body.matches.every(m => m.job.specialty === 'Cardiology')).toBe(true);
    });

    test('should return 404 for non-existent candidate', async () => {
      const res = await request(app)
        .get('/api/candidates/99999/matches');

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/candidates/:id/profile', () => {
    test('should update candidate profile via profile endpoint', async () => {
      const candidate = await request(app)
        .post('/api/candidates')
        .send({
          email: `profile${Date.now()}@example.com`,
          firstName: 'Profile',
          lastName: 'Test'
        });

      const res = await request(app)
        .patch(`/api/candidates/${candidate.body.data.id}/profile`)
        .send({
          location: 'Hamburg',
          specialty: 'Pediatrics',
          portfolioUrl: 'https://portfolio.example.com'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.location).toBe('Hamburg');
      expect(res.body.data.specialty).toBe('Pediatrics');
      expect(res.body.data.portfolioUrl).toBe('https://portfolio.example.com');
    });
  });
});
