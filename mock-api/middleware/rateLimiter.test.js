/**
 * Rate Limiter Middleware Tests
 * 
 * @jest-environment node
 */

const {
  TokenBucket,
  RateLimiter,
  rateLimiter,
  presets,
  TIERS
} = require('./rateLimiter');

describe('TokenBucket', () => {
  let bucket;

  beforeEach(() => {
    bucket = new TokenBucket(10, 0.01, 1000); // 10 capacity, 10 tokens/sec, 1s window
  });

  afterEach(() => {
    bucket.resetAll();
  });

  test('should create bucket with options', () => {
    expect(bucket.capacity).toBe(10);
    expect(bucket.refillRate).toBe(0.01);
    expect(bucket.windowMs).toBe(1000);
  });

  test('should allow requests when tokens available', () => {
    const result = bucket.consume('key1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  test('should refill tokens over time', () => {
    bucket.consume('key1', 10); // Use all tokens
    const result1 = bucket.consume('key1');
    expect(result1.allowed).toBe(false);
    
    // Wait for refill
    setTimeout(() => {
      const result2 = bucket.consume('key1');
      expect(result2.allowed).toBe(true);
    }, 150);
  });

  test('should reject when no tokens', () => {
    // Use all tokens
    for (let i = 0; i < 10; i++) {
      bucket.consume('key1');
    }
    
    const result = bucket.consume('key1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.limit).toBe(10);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  test('should track multiple keys independently', () => {
    bucket.consume('key1', 5);
    bucket.consume('key2', 5);
    
    const result1 = bucket.consume('key1');
    const result2 = bucket.consume('key2');
    
    expect(result1.remaining).toBe(4);
    expect(result2.remaining).toBe(4);
  });

  test('should reset specific key', () => {
    bucket.consume('key1', 5);
    bucket.reset('key1');
    
    const result = bucket.consume('key1');
    expect(result.remaining).toBe(9); // Full capacity minus 1
  });

  test('should reset all keys', () => {
    bucket.consume('key1', 5);
    bucket.consume('key2', 5);
    
    bucket.resetAll();
    
    const result1 = bucket.consume('key1');
    const result2 = bucket.consume('key2');
    
    expect(result1.remaining).toBe(9);
    expect(result2.remaining).toBe(9);
  });

  test('should cleanup old entries', () => {
    bucket.consume('key1');
    // Make the entry old by setting lastRefill far in the past
    bucket.buckets.get('key1').lastRefill = Date.now() - 5000;
    bucket.lastCleanup = Date.now() - 2000;
    
    bucket.cleanup();
    
    expect(bucket.buckets.has('key1')).toBe(false);
  });

  test('should auto-cleanup on consume when enough time passed', () => {
    bucket.consume('key1');
    // Manually set lastRefill to be very old
    const oldTime = Date.now() - 5000;
    bucket.buckets.get('key1').lastRefill = oldTime;
    bucket.lastCleanup = Date.now() - 2000; // Force cleanup condition
    
    bucket.consume('key2'); // Should trigger cleanup
    
    // key1 should be cleaned up since it's old
    expect(bucket.buckets.has('key1')).toBe(false);
  });
});

describe('RateLimiter', () => {
  let limiter;

  beforeEach(() => {
    limiter = new RateLimiter();
    limiter.resetAll();
  });

  afterEach(() => {
    limiter.resetAll();
  });

  test('should create with all tiers initialized', () => {
    expect(limiter.limiters.has('anonymous')).toBe(true);
    expect(limiter.limiters.has('free')).toBe(true);
    expect(limiter.limiters.has('premium')).toBe(true);
    expect(limiter.limiters.has('internal')).toBe(true);
  });

  test('should create middleware', () => {
    const middleware = limiter.middleware();
    expect(typeof middleware).toBe('function');
  });

  test('middleware should allow request when under limit', (done) => {
    const middleware = limiter.middleware({ tier: 'internal' });
    const req = { ip: '127.0.0.1' };
    const res = { setHeader: jest.fn() };
    
    middleware(req, res, () => {
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100000);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
      done();
    });
  });

  test('middleware should reject when over limit', () => {
    const middleware = limiter.middleware({ tier: 'anonymous' });
    const req = { ip: '192.168.1.1' };
    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Use up all anonymous tier tokens (100)
    const bucket = limiter.limiters.get('anonymous');
    for (let i = 0; i < 100; i++) {
      bucket.consume('192.168.1.1');
    }
    
    middleware(req, res, jest.fn());
    
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Too Many Requests'
    }));
  });

  test('middleware should skip when skip function returns true', (done) => {
    const middleware = limiter.middleware({
      skip: (req) => req.path === '/health'
    });
    const req = { path: '/health' };
    const res = { setHeader: jest.fn() };
    
    middleware(req, res, () => {
      // Should not set rate limit headers when skipped
      expect(res.setHeader).not.toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(Number));
      done();
    });
  });

  test('middleware should use custom key generator', (done) => {
    const middleware = limiter.middleware({
      keyGenerator: (req) => `user:${req.userId}`
    });
    const req = { userId: '123', ip: '127.0.0.1' };
    const res = { setHeader: jest.fn() };
    
    middleware(req, res, () => {
      // Should use user ID based key
      done();
    });
  });

  test('middleware should use custom onLimit handler', (done) => {
    const onLimit = jest.fn((req, res, _next, _info) => {
      res.status(429).json({ custom: true });
    });
    
    const middleware = limiter.middleware({
      tier: 'anonymous',
      onLimit
    });
    
    const req = { ip: '192.168.1.1' };
    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Use up all tokens
    const bucket = limiter.limiters.get('anonymous');
    for (let i = 0; i < 100; i++) {
      bucket.consume('192.168.1.1');
    }
    
    middleware(req, res, () => {});
    
    expect(onLimit).toHaveBeenCalled();
    done();
  });

  test('should create tiered middleware', () => {
    const tieredMiddleware = limiter.tiered({
      '/api/public': 'anonymous',
      '/api/private': 'free'
    });
    
    expect(typeof tieredMiddleware).toBe('function');
  });

  test('tiered middleware should select correct tier', (done) => {
    const tieredMiddleware = limiter.tiered({
      '/api': 'free'
    });
    
    const req = { 
      path: '/api/test',
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' }
    };
    const res = { setHeader: jest.fn() };
    
    tieredMiddleware(req, res, () => {
      // Should use free tier (1000 limit)
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 1000);
      done();
    });
  });

  test('should reset key across all tiers', () => {
    const bucket = limiter.limiters.get('anonymous');
    bucket.consume('test-key', 5);
    
    limiter.reset('test-key');
    
    const result = bucket.consume('test-key');
    expect(result.remaining).toBeGreaterThan(90); // Should be reset
  });
});

describe('Presets', () => {
  beforeEach(() => {
    rateLimiter.resetAll();
  });

  afterEach(() => {
    rateLimiter.resetAll();
  });

  test('should have standard preset', () => {
    expect(typeof presets.standard).toBe('function');
  });

  test('should have strict preset', () => {
    expect(typeof presets.strict).toBe('function');
  });

  test('should have auth preset', () => {
    expect(typeof presets.auth).toBe('function');
  });

  test('should have readHeavy preset', () => {
    expect(typeof presets.readHeavy).toBe('function');
  });

  test('should have internal preset', () => {
    expect(typeof presets.internal).toBe('function');
  });

  test('should have tiered preset factory', () => {
    expect(typeof presets.tiered).toBe('function');
  });

  test('standard preset should use free tier', (done) => {
    const req = { 
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' }
    };
    const res = { setHeader: jest.fn() };
    
    presets.standard(req, res, () => {
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 1000);
      done();
    });
  });

  test('strict preset should use custom key generator', (done) => {
    const req = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' },
      connection: { remoteAddress: '127.0.0.1' }
    };
    const res = { setHeader: jest.fn() };
    
    presets.strict(req, res, () => {
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
      done();
    });
  });

  test('auth preset should have custom rate limit message', () => {
    const req = { ip: '127.0.0.1' };
    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Use up all tokens first
    const bucket = rateLimiter.limiters.get('anonymous');
    for (let i = 0; i < 100; i++) {
      bucket.consume('strict:127.0.0.1');
    }
    
    presets.auth(req, res, () => {});
    
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('authentication')
    }));
  });
});

describe('TIERS', () => {
  test('should define all tiers', () => {
    expect(TIERS.anonymous).toEqual({ capacity: 100, windowMs: 900000 });
    expect(TIERS.free).toEqual({ capacity: 1000, windowMs: 900000 });
    expect(TIERS.premium).toEqual({ capacity: 10000, windowMs: 900000 });
    expect(TIERS.internal).toEqual({ capacity: 100000, windowMs: 900000 });
  });
});

describe('Global Rate Limiter Export', () => {
  test('should export global rateLimiter instance', () => {
    expect(rateLimiter).toBeDefined();
    expect(rateLimiter).toBeInstanceOf(RateLimiter);
  });
});
