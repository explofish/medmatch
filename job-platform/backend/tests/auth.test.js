const request = require('supertest');
const app = require('../server');

// Mock database for testing
const mockQuery = jest.fn();
app.locals.db = { query: mockQuery };

describe('Auth Routes', () => {
  beforeEach(() => {
    mockQuery.mockClear();
  });

  describe('POST /api/auth/signup', () => {
    it('should create a new candidate account successfully', async () => {
      // Mock existing user check (user doesn't exist)
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      // Mock user creation
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'test-user-id',
          email: 'test@example.com',
          user_type: 'graduate',
          email_verified: false,
          created_at: new Date().toISOString()
        }]
      });
      
      // Mock profile creation
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      // Mock profile update for specialty
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      // Mock verification token creation
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          graduationYear: 2024,
          specialty: 'Cardiology',
          location: 'Berlin, Germany'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.userType).toBe('graduate');
    });

    it('should return 409 if email already exists', async () => {
      // Mock existing user check (user exists)
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'existing-user-id', email: 'existing@example.com' }]
      });

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'existing@example.com',
          password: 'SecurePass123!',
          graduationYear: 2024,
          specialty: 'Cardiology',
          location: 'Berlin, Germany'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
          graduationYear: 2024,
          specialty: 'Cardiology',
          location: 'Berlin, Germany'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for short password', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'short',
          graduationYear: 2024,
          specialty: 'Cardiology',
          location: 'Berlin, Germany'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should create account with minimal required fields', async () => {
      // Mock existing user check
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      // Mock user creation
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'test-user-id',
          email: 'minimal@example.com',
          user_type: 'graduate',
          email_verified: false,
          created_at: new Date().toISOString()
        }]
      });
      
      // Mock profile creation
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      // Mock verification token creation
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'minimal@example.com',
          password: 'SecurePass123!'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid graduation year', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          graduationYear: 1800
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      // Mock finding valid token
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'token-id',
          user_id: 'user-id',
          email: 'test@example.com'
        }]
      });
      
      // Mock marking token as used
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      // Mock marking user as verified
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/auth/verify-email')
        .query({ token: 'valid-token' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('verified successfully');
    });

    it('should return 400 for missing token', async () => {
      const response = await request(app)
        .get('/api/auth/verify-email');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('token is required');
    });

    it('should return 400 for invalid or expired token', async () => {
      // Mock finding token (not found)
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/auth/verify-email')
        .query({ token: 'invalid-token' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid or expired');
    });
  });
});
