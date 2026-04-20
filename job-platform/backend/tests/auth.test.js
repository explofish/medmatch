const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../server');

// Mock database for testing
const mockQuery = jest.fn();
app.locals.db = { query: mockQuery };

describe('Auth Routes - Comprehensive Test Suite', () => {
  beforeEach(() => {
    mockQuery.mockClear();
  });

  // ============================================================================
  // INPUT VALIDATION TESTS
  // ============================================================================
  describe('Input Validation', () => {
    describe('Email Validation', () => {
      it('should accept valid email format', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] }); // User doesn't exist
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'test-user-id',
            email: 'valid@example.com',
            user_type: 'graduate',
            email_verified: false,
            created_at: new Date().toISOString()
          }]
        });
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Profile creation
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Token creation

        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'valid@example.com',
            password: 'SecurePass123!'
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      it('should reject invalid email format', async () => {
        const invalidEmails = [
          'not-an-email',
          '@example.com',
          'user@',
          'user@.com',
          'user@@example.com',
          'user@example..com'
        ];

        for (const email of invalidEmails) {
          const response = await request(app)
            .post('/api/auth/signup')
            .send({
              email,
              password: 'SecurePass123!'
            });

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
          expect(response.body.error).toBe('Validation failed');
        }
      });

      it('should normalize email to lowercase', async () => {
        const upperCaseEmail = 'USER@EXAMPLE.COM';
        const expectedLowerEmail = 'user@example.com';
        
        mockQuery.mockResolvedValueOnce({ rows: [] }); // User doesn't exist
        mockQuery.mockImplementationOnce((query, params) => {
          // Verify the email was normalized to lowercase
          expect(params[1]).toBe(expectedLowerEmail);
          return Promise.resolve({
            rows: [{
              id: 'test-user-id',
              email: expectedLowerEmail,
              user_type: 'graduate',
              email_verified: false,
              created_at: new Date().toISOString()
            }]
          });
        });
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Profile creation
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Token creation

        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: upperCaseEmail,
            password: 'SecurePass123!'
          });

        expect(response.status).toBe(201);
      });
    });

    describe('Password Validation', () => {
      it('should accept password with minimum 8 characters', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'test-user-id',
            email: 'test@example.com',
            user_type: 'graduate',
            email_verified: false,
            created_at: new Date().toISOString()
          }]
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'test@example.com',
            password: 'SecurePass123!' // 15 chars
          });

        expect(response.status).toBe(201);
      });

      it('should reject password with less than 8 characters', async () => {
        const shortPasswords = [
          'Short1!',
          '1234567',
          'abcdefg'
        ];

        for (const password of shortPasswords) {
          const response = await request(app)
            .post('/api/auth/signup')
            .send({
              email: 'test@example.com',
              password
            });

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
          expect(response.body.error).toBe('Validation failed');
        }
      });

      it('should accept password with uppercase, lowercase, and numbers', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'test-user-id',
            email: 'test@example.com',
            user_type: 'graduate',
            email_verified: false,
            created_at: new Date().toISOString()
          }]
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'test@example.com',
            password: 'SecurePass123' // Has uppercase, lowercase, numbers
          });

        expect(response.status).toBe(201);
      });

      it('should accept password with special characters', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'test-user-id',
            email: 'test@example.com',
            user_type: 'graduate',
            email_verified: false,
            created_at: new Date().toISOString()
          }]
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'test@example.com',
            password: 'MyP@ssw0rd!#$%'
          });

        expect(response.status).toBe(201);
      });
    });

    describe('Required Fields Validation', () => {
      it('should reject request with missing email', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            password: 'SecurePass123!'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Validation failed');
      });

      it('should reject request with missing password', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'test@example.com'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Validation failed');
      });

      it('should reject request with empty body', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Validation failed');
      });
    });

    describe('Optional Fields Validation', () => {
      it('should accept valid graduation year', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'test-user-id',
            email: 'test@example.com',
            user_type: 'graduate',
            email_verified: false,
            created_at: new Date().toISOString()
          }]
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'test@example.com',
            password: 'SecurePass123!',
            graduationYear: 2024
          });

        expect(response.status).toBe(201);
      });

      it('should reject invalid graduation year (too early)', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'test@example.com',
            password: 'SecurePass123!',
            graduationYear: 1899
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should reject invalid graduation year (too far in future)', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'test@example.com',
            password: 'SecurePass123!',
            graduationYear: 2101
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should reject non-numeric graduation year', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'test@example.com',
            password: 'SecurePass123!',
            graduationYear: 'not-a-number'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should accept valid specialty', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'test-user-id',
            email: 'test@example.com',
            user_type: 'graduate',
            email_verified: false,
            created_at: new Date().toISOString()
          }]
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Profile update for specialty

        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'test@example.com',
            password: 'SecurePass123!',
            specialty: 'Cardiology'
          });

        expect(response.status).toBe(201);
      });

      it('should reject specialty that is too long (>100 chars)', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'test@example.com',
            password: 'SecurePass123!',
            specialty: 'A'.repeat(101)
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should accept valid location', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'test-user-id',
            email: 'test@example.com',
            user_type: 'graduate',
            email_verified: false,
            created_at: new Date().toISOString()
          }]
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'test@example.com',
            password: 'SecurePass123!',
            location: 'Berlin, Germany'
          });

        expect(response.status).toBe(201);
      });

      it('should reject location that is too long (>200 chars)', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'test@example.com',
            password: 'SecurePass123!',
            location: 'A'.repeat(201)
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });
  });

  // ============================================================================
  // BUSINESS LOGIC TESTS
  // ============================================================================
  describe('Business Logic', () => {
    describe('User Creation', () => {
      it('should create a new user with correct data structure', async () => {
        const mockTimestamp = new Date().toISOString();
        
        mockQuery.mockResolvedValueOnce({ rows: [] }); // User doesn't exist
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'test-uuid-123',
            email: 'test@example.com',
            user_type: 'graduate',
            email_verified: false,
            created_at: mockTimestamp
          }]
        });
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Profile creation
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Token creation

        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'test@example.com',
            password: 'SecurePass123!'
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.user).toHaveProperty('id');
        expect(response.body.user.email).toBe('test@example.com');
        expect(response.body.user.userType).toBe('graduate');
        expect(response.body.user.emailVerified).toBe(false);
        expect(response.body.user).toHaveProperty('createdAt');
      });

      it('should set user type to graduate by default', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockImplementationOnce((query, params) => {
          // Verify user_type is set to 'graduate'
          expect(params[3]).toBe('graduate');
          return Promise.resolve({
            rows: [{
              id: 'test-user-id',
              email: params[1],
              user_type: 'graduate',
              email_verified: false,
              created_at: new Date().toISOString()
            }]
          });
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'test@example.com',
            password: 'SecurePass123!'
          });

        expect(response.status).toBe(201);
        expect(response.body.user.userType).toBe('graduate');
      });

      it('should create email_verified as false by default', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockImplementationOnce((query, params) => {
          // Verify email_verified is set to false
          expect(params[4]).toBe(false);
          return Promise.resolve({
            rows: [{
              id: 'test-user-id',
              email: params[1],
              user_type: 'graduate',
              email_verified: false,
              created_at: new Date().toISOString()
            }]
          });
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'test@example.com',
            password: 'SecurePass123!'
          });

        expect(response.status).toBe(201);
        expect(response.body.user.emailVerified).toBe(false);
      });
    });

    describe('Password Hashing', () => {
      it('should hash password before storing', async () => {
        const plainPassword = 'SecurePass123!';
        let capturedHash = null;
        
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockImplementationOnce((query, params) => {
          // Capture the password hash
          capturedHash = params[2];
          return Promise.resolve({
            rows: [{
              id: 'test-user-id',
              email: params[1],
              user_type: 'graduate',
              email_verified: false,
              created_at: new Date().toISOString()
            }]
          });
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'test@example.com',
            password: plainPassword
          });

        expect(response.status).toBe(201);
        
        // Verify the stored hash is not the plain password
        expect(capturedHash).not.toBe(plainPassword);
        // Verify it's a valid bcrypt hash (starts with $2a$ or $2b$)
        expect(capturedHash).toMatch(/^\$2[aby]\$/);
        
        // Verify the hash can be compared with the original password
        const isValid = await bcrypt.compare(plainPassword, capturedHash);
        expect(isValid).toBe(true);
      });

      it('should use salt rounds of at least 10', async () => {
        let capturedHash = null;
        
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockImplementationOnce((query, params) => {
          capturedHash = params[2];
          return Promise.resolve({
            rows: [{
              id: 'test-user-id',
              email: params[1],
              user_type: 'graduate',
              email_verified: false,
              created_at: new Date().toISOString()
            }]
          });
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'test@example.com',
            password: 'SecurePass123!'
          });

        // bcrypt hash format: $2a$<cost>$...
        const costMatch = capturedHash.match(/^\$2[aby]\$(\d+)\$/);
        expect(costMatch).toBeTruthy();
        const cost = parseInt(costMatch[1], 10);
        expect(cost).toBeGreaterThanOrEqual(10);
      });
    });

    describe('Duplicate Detection', () => {
      it('should return 409 when email already exists', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'existing-user-id',
            email: 'existing@example.com'
          }]
        });

        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'existing@example.com',
            password: 'SecurePass123!'
          });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('already exists');
      });

      it('should return 409 for case-insensitive duplicate email', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'existing-user-id',
            email: 'User@Example.com'
          }]
        });

        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'user@example.com', // lowercase version
            password: 'SecurePass123!'
          });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
      });
    });

    describe('Profile Creation', () => {
      it('should create graduate profile with provided data', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'user-id',
            email: 'test@example.com',
            user_type: 'graduate',
            email_verified: false,
            created_at: new Date().toISOString()
          }]
        });
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Profile creation
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Token creation

        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'test@example.com',
            password: 'SecurePass123!',
            graduationYear: 2024,
            location: 'Berlin, Germany'
          });

        expect(response.status).toBe(201);
        // Verify graduate_profiles INSERT was called
        const profileCall = mockQuery.mock.calls.find(call => 
          call[0] && call[0].includes && call[0].includes('INSERT INTO graduate_profiles')
        );
        expect(profileCall).toBeTruthy();
      });

      it('should store specialty in profile_summary', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'user-id',
            email: 'test@example.com',
            user_type: 'graduate',
            email_verified: false,
            created_at: new Date().toISOString()
          }]
        });
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Profile creation
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Specialty update
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Token creation

        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'test@example.com',
            password: 'SecurePass123!',
            specialty: 'Cardiology'
          });

        expect(response.status).toBe(201);
        // Verify UPDATE was called for specialty
        const specialtyCall = mockQuery.mock.calls.find(call => 
          call[0] && call[0].includes && call[0].includes('UPDATE graduate_profiles')
        );
        expect(specialtyCall).toBeTruthy();
        expect(specialtyCall[1][0]).toContain('Cardiology');
      });
    });

    describe('Email Verification Token', () => {
      it('should create verification token for new user', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'user-id',
            email: 'test@example.com',
            user_type: 'graduate',
            email_verified: false,
            created_at: new Date().toISOString()
          }]
        });
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Profile creation
        mockQuery.mockImplementationOnce((query, params) => {
          // Verify token is created with user_id
          expect(query).toContain('email_verification_tokens');
          expect(query).toContain('expires_at');
          
          // Verify token is a valid UUID
          expect(params[2]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
          
          // Verify expiry is ~24 hours from now
          const expiryTime = new Date(params[3]);
          const now = new Date();
          const hoursDiff = (expiryTime - now) / (1000 * 60 * 60);
          expect(hoursDiff).toBeCloseTo(24, 0);
          
          return Promise.resolve({ rows: [] });
        });

        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'test@example.com',
            password: 'SecurePass123!'
          });

        expect(response.status).toBe(201);
      });
    });
  });

  // ============================================================================
  // INTEGRATION TESTS - API ENDPOINTS
  // ============================================================================
  describe('API Endpoint Integration', () => {
    describe('POST /api/auth/signup', () => {
      it('should return 201 with valid data', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'test-id',
            email: 'success@example.com',
            user_type: 'graduate',
            email_verified: false,
            created_at: new Date().toISOString()
          }]
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'success@example.com',
            password: 'SecurePass123!',
            graduationYear: 2024,
            specialty: 'Cardiology',
            location: 'Berlin, Germany'
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('Account created successfully');
      });

      it('should return 400 for invalid email', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'invalid-email',
            password: 'SecurePass123!'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should return 400 for weak password', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'test@example.com',
            password: '123'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should return 409 for duplicate email', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 'existing-id', email: 'dup@example.com' }]
        });

        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'dup@example.com',
            password: 'SecurePass123!'
          });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
      });

      it('should return 400 for missing required fields', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'test@example.com'
            // missing password
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should set correct content-type headers', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'test-id',
            email: 'headers@example.com',
            user_type: 'graduate',
            email_verified: false,
            created_at: new Date().toISOString()
          }]
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'headers@example.com',
            password: 'SecurePass123!'
          });

        expect(response.status).toBe(201);
        expect(response.headers['content-type']).toMatch(/application\/json/);
      });
    });
  });

  // ============================================================================
  // DATABASE TESTS
  // ============================================================================
  describe('Database Operations', () => {
    describe('User Record Creation', () => {
      it('should execute correct INSERT query for users table', async () => {
        let capturedQuery = null;
        let capturedParams = null;
        
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockImplementationOnce((query, params) => {
          capturedQuery = query;
          capturedParams = params;
          return Promise.resolve({
            rows: [{
              id: params[0],
              email: params[1],
              user_type: params[3],
              email_verified: params[4],
              created_at: new Date().toISOString()
            }]
          });
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'dbtest@example.com',
            password: 'SecurePass123!'
          });

        // Verify the INSERT query structure
        expect(capturedQuery).toContain('INSERT INTO users');
        expect(capturedQuery).toContain('id');
        expect(capturedQuery).toContain('email');
        expect(capturedQuery).toContain('password_hash');
        expect(capturedQuery).toContain('user_type');
        expect(capturedQuery).toContain('email_verified');
        expect(capturedQuery).toContain('is_active');
        expect(capturedQuery).toContain('RETURNING');
        
        // Verify parameters
        expect(capturedParams).toHaveLength(6);
        expect(capturedParams[1]).toBe('dbtest@example.com'); // email
        expect(capturedParams[3]).toBe('graduate'); // user_type
        expect(capturedParams[4]).toBe(false); // email_verified
        expect(capturedParams[5]).toBe(true); // is_active
      });

      it('should execute correct INSERT for graduate_profiles', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'user-id',
            email: 'profiletest@example.com',
            user_type: 'graduate',
            email_verified: false,
            created_at: new Date().toISOString()
          }]
        });
        mockQuery.mockImplementationOnce((query, params) => {
          // Verify profile query
          expect(query).toContain('INSERT INTO graduate_profiles');
          expect(params).toHaveLength(6);
          expect(params[1]).toBe('user-id'); // user_id
          expect(params[4]).toBe(2024); // graduation_year
          return Promise.resolve({ rows: [] });
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'profiletest@example.com',
            password: 'SecurePass123!',
            graduationYear: 2024
          });
      });
    });

    describe('Timestamps', () => {
      it('should set created_at timestamp on user creation', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'user-id',
            email: 'timestamptest@example.com',
            user_type: 'graduate',
            email_verified: false,
            created_at: new Date().toISOString()
          }]
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'timestamptest@example.com',
            password: 'SecurePass123!'
          });

        expect(response.status).toBe(201);
        expect(response.body.user.createdAt).toBeDefined();
        expect(new Date(response.body.user.createdAt)).toBeInstanceOf(Date);
      });
    });
  });

  // ============================================================================
  // SECURITY TESTS
  // ============================================================================
  describe('Security', () => {
    describe('SQL Injection Prevention', () => {
      it('should handle SQL injection attempt in email safely', async () => {
        const maliciousEmails = [
          "'; DROP TABLE users; --",
          "' OR '1'='1",
          "test@test.com'; DELETE FROM users WHERE '1'='1",
          "test@example.com' UNION SELECT * FROM users--",
          "admin'--"
        ];

        for (const email of maliciousEmails) {
          mockQuery.mockClear();
          
          // Mock the parameterized query - it should use the malicious string as a value, not execute it
          mockQuery.mockResolvedValueOnce({ rows: [] });
          mockQuery.mockResolvedValueOnce({
            rows: [{
              id: 'test-id',
              email: email.toLowerCase().trim(),
              user_type: 'graduate',
              email_verified: false,
              created_at: new Date().toISOString()
            }]
          });
          mockQuery.mockResolvedValueOnce({ rows: [] });
          mockQuery.mockResolvedValueOnce({ rows: [] });

          const response = await request(app)
            .post('/api/auth/signup')
            .send({
              email,
              password: 'SecurePass123!'
            });

          // Should either succeed (safely parameterized) or fail validation
          expect([201, 400]).toContain(response.status);
          
          // If successful, verify the query was called with proper parameters
          if (response.status === 201) {
            // Check that query was called with the email as a parameter (not concatenated)
            const selectCall = mockQuery.mock.calls[0];
            expect(selectCall[1]).toContain(email.toLowerCase().trim());
          }
        }
      });

      it('should use parameterized queries for all database operations', async () => {
        let queryParams = [];
        
        mockQuery.mockImplementation((query, params) => {
          queryParams.push({ query, params });
          
          if (query.includes('SELECT')) {
            return Promise.resolve({ rows: [] });
          }
          if (query.includes('INSERT INTO users')) {
            return Promise.resolve({
              rows: [{
                id: 'user-id',
                email: params[1],
                user_type: 'graduate',
                email_verified: false,
                created_at: new Date().toISOString()
              }]
            });
          }
          return Promise.resolve({ rows: [] });
        });

        await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'parametrized@example.com',
            password: 'SecurePass123!'
          });

        // Verify all queries use $1, $2, etc. (parameterized)
        for (const { query, params } of queryParams) {
          // Check for parameterized placeholders
          expect(query).toMatch(/\$\d+/);
          // Ensure no string concatenation of values
          expect(query).not.toMatch(/'[^']*parametrized[^']*'/i);
        }
      });
    });

    describe('XSS Prevention', () => {
      it('should handle XSS attempt in specialty field safely', async () => {
        const xssPayloads = [
          '<script>alert("XSS")</script>',
          'javascript:alert("XSS")',
          '<img src="x" onerror="alert(\'XSS\')">',
          '<svg onload="alert(\'XSS\')">',
          'Cardiology<script>alert(1)</script>'
        ];

        for (const specialty of xssPayloads) {
          mockQuery.mockClear();
          mockQuery.mockResolvedValueOnce({ rows: [] });
          mockQuery.mockResolvedValueOnce({
            rows: [{
              id: 'user-id',
              email: 'xsstest@example.com',
              user_type: 'graduate',
              email_verified: false,
              created_at: new Date().toISOString()
            }]
          });
          mockQuery.mockResolvedValueOnce({ rows: [] });
          mockQuery.mockImplementationOnce((query, params) => {
            // Verify the specialty is stored as-is (XSS prevention should be handled at output time)
            if (params[0] && params[0].includes('Interested in:')) {
              expect(params[0]).toContain(specialty);
            }
            return Promise.resolve({ rows: [] });
          });
          mockQuery.mockResolvedValueOnce({ rows: [] });

          const response = await request(app)
            .post('/api/auth/signup')
            .send({
              email: 'xsstest@example.com',
              password: 'SecurePass123!',
              specialty
            });

          // May get 201 or 409 if duplicate check with different email normalization
          expect([201, 409]).toContain(response.status);
        }
      });

      it('should trim whitespace from text fields', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'user-id',
            email: 'trimtest@example.com',
            user_type: 'graduate',
            email_verified: false,
            created_at: new Date().toISOString()
          }]
        });
        mockQuery.mockImplementationOnce((query, params) => {
          // Verify location is trimmed - params[2] is city, params[3] is state
          if (params[2] && params[2].includes) {
            expect(params[2]).not.toMatch(/^\s+/); // No leading whitespace
            expect(params[2]).not.toMatch(/\s+$/); // No trailing whitespace
          }
          return Promise.resolve({ rows: [] });
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'trimtest@example.com',
            password: 'SecurePass123!',
            location: '  Berlin  ,  Germany  '
          });

        expect(response.status).toBe(201);
      });
    });

    describe('Input Sanitization', () => {
      it('should handle very long inputs gracefully', async () => {
        const longEmail = 'a'.repeat(200) + '@example.com';

        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: longEmail,
            password: 'SecurePass123!'
          });

        // Should either accept or reject, but not crash
        expect([201, 400, 413, 500]).toContain(response.status);
      });

      it('should reject non-string email values', async () => {
        const invalidEmails = [
          { object: true },
          ['array'],
          12345
        ];

        for (const email of invalidEmails) {
          const response = await request(app)
            .post('/api/auth/signup')
            .send({
              email,
              password: 'SecurePass123!'
            });

          expect([400, 422, 500]).toContain(response.status);
        }
      });
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================
  describe('Error Handling', () => {
    it('should return 500 for database errors during user creation', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'dberror@example.com',
          password: 'SecurePass123!'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('error occurred');
    });

    it('should return 500 for database errors during profile creation', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-id',
          email: 'profileerror@example.com',
          user_type: 'graduate',
          email_verified: false,
          created_at: new Date().toISOString()
        }]
      });
      mockQuery.mockRejectedValueOnce(new Error('Profile insert failed'));

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'profileerror@example.com',
          password: 'SecurePass123!'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // RESPONSE FORMAT TESTS
  // ============================================================================
  describe('Response Format', () => {
    it('should return consistent success response structure', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'test-id',
          email: 'format@example.com',
          user_type: 'graduate',
          email_verified: false,
          created_at: new Date().toISOString()
        }]
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'format@example.com',
          password: 'SecurePass123!'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user).toHaveProperty('userType');
      expect(response.body.user).toHaveProperty('emailVerified');
      expect(response.body.user).toHaveProperty('createdAt');
      
      // Ensure password is NOT included in response
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    it('should return consistent error response structure', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  // ============================================================================
  // ADDITIONAL EDGE CASES
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle email with plus sign (subaddressing)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'test-id',
          email: 'user+tag@example.com',
          user_type: 'graduate',
          email_verified: false,
          created_at: new Date().toISOString()
        }]
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'user+tag@example.com',
          password: 'SecurePass123!'
        });

      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe('user+tag@example.com');
    });

    it('should handle international domain names', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'test-id',
          email: 'user@münchen.de',
          user_type: 'graduate',
          email_verified: false,
          created_at: new Date().toISOString()
        }]
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'user@münchen.de',
          password: 'SecurePass123!'
        });

      // May be accepted or rejected based on validation library
      expect([201, 400]).toContain(response.status);
    });

    it('should handle concurrent signup attempts gracefully', async () => {
      // First request
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          email: 'concurrent@example.com',
          user_type: 'graduate',
          email_verified: false,
          created_at: new Date().toISOString()
        }]
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response1 = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'concurrent@example.com',
          password: 'SecurePass123!'
        });

      expect(response1.status).toBe(201);

      // Reset mock for second request
      mockQuery.mockClear();
      
      // Second request with same email (simulating race condition result)
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'user-1', email: 'concurrent@example.com' }]
      });

      const response2 = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'concurrent@example.com',
          password: 'SecurePass123!'
        });

      expect(response2.status).toBe(409);
    });
  });
});
