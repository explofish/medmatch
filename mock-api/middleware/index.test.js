/**
 * Middleware Index Exports Tests
 * 
 * @jest-environment node
 */

const middleware = require('./index');

describe('Middleware Index Exports', () => {
  test('should export RateLimiter', () => {
    expect(middleware.RateLimiter).toBeDefined();
    expect(typeof middleware.RateLimiter).toBe('function');
  });

  test('should export TokenBucket', () => {
    expect(middleware.TokenBucket).toBeDefined();
    expect(typeof middleware.TokenBucket).toBe('function');
  });

  test('should export rateLimiter object', () => {
    expect(middleware.rateLimiter).toBeDefined();
    expect(typeof middleware.rateLimiter).toBe('object');
    expect(typeof middleware.rateLimiter.middleware).toBe('function');
  });

  test('should export rateLimitPresets', () => {
    expect(middleware.rateLimitPresets).toBeDefined();
    expect(typeof middleware.rateLimitPresets).toBe('object');
  });

  test('should export TIERS', () => {
    expect(middleware.TIERS).toBeDefined();
    expect(typeof middleware.TIERS).toBe('object');
  });

  test('should export CacheManager', () => {
    expect(middleware.CacheManager).toBeDefined();
    expect(typeof middleware.CacheManager).toBe('function');
  });

  test('should export caches', () => {
    expect(middleware.caches).toBeDefined();
    expect(typeof middleware.caches).toBe('object');
  });

  test('should export cachePresets', () => {
    expect(middleware.cachePresets).toBeDefined();
    expect(typeof middleware.cachePresets).toBe('object');
  });

  test('should export CircuitBreaker', () => {
    expect(middleware.CircuitBreaker).toBeDefined();
    expect(typeof middleware.CircuitBreaker).toBe('function');
  });

  test('should export CircuitBreakerRegistry', () => {
    expect(middleware.CircuitBreakerRegistry).toBeDefined();
    expect(typeof middleware.CircuitBreakerRegistry).toBe('function');
  });

  test('should export CircuitBreakerError', () => {
    expect(middleware.CircuitBreakerError).toBeDefined();
    expect(typeof middleware.CircuitBreakerError).toBe('function');
  });

  test('should export circuitBreakerRegistry', () => {
    expect(middleware.circuitBreakerRegistry).toBeDefined();
    expect(typeof middleware.circuitBreakerRegistry).toBe('object');
  });

  test('should export circuitBreakerPresets', () => {
    expect(middleware.circuitBreakerPresets).toBeDefined();
    expect(typeof middleware.circuitBreakerPresets).toBe('object');
  });

  test('should export auth functions', () => {
    expect(middleware.requireAuth).toBeDefined();
    expect(typeof middleware.requireAuth).toBe('function');
    expect(middleware.optionalAuth).toBeDefined();
    expect(typeof middleware.optionalAuth).toBe('function');
    expect(middleware.generateApiKey).toBeDefined();
    expect(typeof middleware.generateApiKey).toBe('function');
  });

  test('should export compression middleware', () => {
    expect(middleware.compression).toBeDefined();
    expect(typeof middleware.compression).toBe('function');
    expect(middleware.compressionSync).toBeDefined();
    expect(typeof middleware.compressionSync).toBe('function');
  });

  test('should export dbPool functions', () => {
    expect(middleware.ConnectionPool).toBeDefined();
    expect(typeof middleware.ConnectionPool).toBe('function');
    expect(middleware.getPool).toBeDefined();
    expect(typeof middleware.getPool).toBe('function');
    expect(middleware.resetPool).toBeDefined();
    expect(typeof middleware.resetPool).toBe('function');
  });

  test('TIERS should have expected values', () => {
    expect(middleware.TIERS).toHaveProperty('anonymous');
    expect(middleware.TIERS).toHaveProperty('free');
    expect(middleware.TIERS).toHaveProperty('premium');
    expect(middleware.TIERS).toHaveProperty('internal');
  });

  test('rateLimitPresets should have expected tiers', () => {
    expect(middleware.rateLimitPresets).toHaveProperty('standard');
    expect(middleware.rateLimitPresets).toHaveProperty('strict');
    expect(middleware.rateLimitPresets).toHaveProperty('auth');
    expect(middleware.rateLimitPresets).toHaveProperty('readHeavy');
    expect(middleware.rateLimitPresets).toHaveProperty('internal');
    expect(middleware.rateLimitPresets).toHaveProperty('tiered');
  });

  test('cachePresets should have expected configs', () => {
    expect(middleware.cachePresets).toHaveProperty('jobsList');
    expect(middleware.cachePresets).toHaveProperty('profile');
    expect(middleware.cachePresets).toHaveProperty('matches');
    expect(middleware.cachePresets).toHaveProperty('reference');
    expect(middleware.cachePresets).toHaveProperty('invalidateJobs');
    expect(middleware.cachePresets).toHaveProperty('invalidateProfile');
    expect(middleware.cachePresets).toHaveProperty('invalidateMatches');
  });
});
