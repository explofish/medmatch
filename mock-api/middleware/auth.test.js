/**
 * Auth Middleware Tests
 * 
 * @jest-environment node
 */

const { requireAuth, optionalAuth, generateApiKey, constantTimeCompare } = require('./auth');

describe('constantTimeCompare', () => {
  test('should return true for equal strings', () => {
    expect(constantTimeCompare('test', 'test')).toBe(true);
  });

  test('should return false for different strings', () => {
    expect(constantTimeCompare('test', 'different')).toBe(false);
  });

  test('should return false for different lengths', () => {
    expect(constantTimeCompare('test', 'testing')).toBe(false);
  });

  test('should return false for non-string inputs', () => {
    expect(constantTimeCompare(null, 'test')).toBe(false);
    expect(constantTimeCompare('test', null)).toBe(false);
    expect(constantTimeCompare(123, 'test')).toBe(false);
  });

  test('should work with long keys for timing attack prevention', () => {
    const key1 = 'a'.repeat(64);
    const key2 = 'b'.repeat(64);
    
    // Should complete without error
    expect(constantTimeCompare(key1, key1)).toBe(true);
    expect(constantTimeCompare(key1, key2)).toBe(false);
  });
});

describe('generateApiKey', () => {
  test('should generate key of specified length', () => {
    const key = generateApiKey(32);
    // Base64 encoding increases length
    expect(key.length).toBeGreaterThan(32);
  });

  test('should generate unique keys', () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    expect(key1).not.toBe(key2);
  });
});

describe('requireAuth', () => {
  let mockReq;
  let mockRes;
  let nextFn;

  beforeEach(() => {
    mockReq = {
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFn = jest.fn();
    delete process.env.AUTH_API_KEY;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    delete process.env.AUTH_API_KEY;
    delete process.env.NODE_ENV;
  });

  test('should block access in production when no API key configured', () => {
    process.env.NODE_ENV = 'production';
    
    const middleware = requireAuth();
    middleware(mockReq, mockRes, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(503);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Authentication not configured',
      message: 'Server misconfiguration: API key not set'
    });
    expect(nextFn).not.toHaveBeenCalled();
  });

  test('should allow with warning in development when no API key configured', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    const middleware = requireAuth();
    middleware(mockReq, mockRes, nextFn);

    expect(consoleSpy).toHaveBeenCalled();
    expect(mockReq.auth).toEqual({ skipAuth: true, reason: 'API_KEY_NOT_SET' });
    expect(nextFn).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  test('should return 401 when API key header is missing', () => {
    process.env.AUTH_API_KEY = 'test-key';
    
    const middleware = requireAuth();
    middleware(mockReq, mockRes, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Authentication required',
      message: 'Missing x-api-key header'
    });
    expect(nextFn).not.toHaveBeenCalled();
  });

  test('should return 401 when API key is invalid', () => {
    process.env.AUTH_API_KEY = 'valid-key';
    mockReq.headers['x-api-key'] = 'invalid-key';
    
    const middleware = requireAuth();
    middleware(mockReq, mockRes, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Authentication failed',
      message: 'Invalid API key'
    });
    expect(nextFn).not.toHaveBeenCalled();
  });

  test('should allow access with valid API key', () => {
    process.env.AUTH_API_KEY = 'valid-key';
    mockReq.headers['x-api-key'] = 'valid-key';
    
    const middleware = requireAuth();
    middleware(mockReq, mockRes, nextFn);

    expect(mockReq.auth).toEqual({
      authenticated: true,
      timestamp: expect.any(String)
    });
    expect(nextFn).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  test('should support custom header name', () => {
    process.env.AUTH_API_KEY = 'valid-key';
    mockReq.headers['custom-auth'] = 'valid-key';
    
    const middleware = requireAuth({ header: 'custom-auth' });
    middleware(mockReq, mockRes, nextFn);

    expect(nextFn).toHaveBeenCalled();
  });

  test('should support custom environment variable', () => {
    process.env.MY_CUSTOM_KEY = 'valid-key';
    mockReq.headers['x-api-key'] = 'valid-key';
    
    const middleware = requireAuth({ envVar: 'MY_CUSTOM_KEY' });
    middleware(mockReq, mockRes, nextFn);

    expect(nextFn).toHaveBeenCalled();
  });

  test('should check header with lowercase key', () => {
    // Node.js lowercases all headers
    process.env.AUTH_API_KEY = 'valid-key';
    mockReq.headers['x-api-key'] = 'valid-key';
    
    const middleware = requireAuth();
    middleware(mockReq, mockRes, nextFn);

    expect(nextFn).toHaveBeenCalled();
  });
});

describe('optionalAuth', () => {
  let mockReq;
  let mockRes;
  let nextFn;

  beforeEach(() => {
    mockReq = {
      headers: {}
    };
    mockRes = {};
    nextFn = jest.fn();
    delete process.env.AUTH_API_KEY;
  });

  afterEach(() => {
    delete process.env.AUTH_API_KEY;
  });

  test('should mark unauthenticated when no API key configured', () => {
    const middleware = optionalAuth();
    middleware(mockReq, mockRes, nextFn);

    expect(mockReq.auth).toEqual({ authenticated: false });
    expect(nextFn).toHaveBeenCalled();
  });

  test('should mark unauthenticated when no header provided', () => {
    process.env.AUTH_API_KEY = 'valid-key';
    
    const middleware = optionalAuth();
    middleware(mockReq, mockRes, nextFn);

    expect(mockReq.auth).toEqual({ authenticated: false });
    expect(nextFn).toHaveBeenCalled();
  });

  test('should mark authenticated with valid key', () => {
    process.env.AUTH_API_KEY = 'valid-key';
    mockReq.headers['x-api-key'] = 'valid-key';
    
    const middleware = optionalAuth();
    middleware(mockReq, mockRes, nextFn);

    expect(mockReq.auth).toEqual({
      authenticated: true,
      timestamp: expect.any(String)
    });
    expect(nextFn).toHaveBeenCalled();
  });

  test('should mark unauthenticated with invalid key', () => {
    process.env.AUTH_API_KEY = 'valid-key';
    mockReq.headers['x-api-key'] = 'invalid-key';
    
    const middleware = optionalAuth();
    middleware(mockReq, mockRes, nextFn);

    expect(mockReq.auth).toEqual({ authenticated: false });
    expect(nextFn).toHaveBeenCalled();
  });
});
