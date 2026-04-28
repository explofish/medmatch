/**
 * Middleware exports
 * Rate limiting, caching, circuit breaker, and authentication modules
 */

const rateLimiter = require('./rateLimiter');
const cache = require('./cache');
const circuitBreaker = require('./circuitBreaker');
const auth = require('./auth');
const compression = require('./compression');
const dbPool = require('./dbPool');

module.exports = {
  // Rate limiting
  RateLimiter: rateLimiter.RateLimiter,
  TokenBucket: rateLimiter.TokenBucket,
  rateLimiter: rateLimiter.rateLimiter,
  rateLimitPresets: rateLimiter.presets,
  TIERS: rateLimiter.TIERS,

  // Caching
  CacheManager: cache.CacheManager,
  caches: cache.caches,
  cachePresets: cache.presets,

  // Circuit breaker
  CircuitBreaker: circuitBreaker.CircuitBreaker,
  CircuitBreakerRegistry: circuitBreaker.CircuitBreakerRegistry,
  CircuitBreakerError: circuitBreaker.CircuitBreakerError,
  circuitBreakerRegistry: circuitBreaker.registry,
  circuitBreakerPresets: circuitBreaker.presets,

  // Authentication
  requireAuth: auth.requireAuth,
  optionalAuth: auth.optionalAuth,
  generateApiKey: auth.generateApiKey,

  // Compression
  compression: compression.compression,
  compressionSync: compression.compressionSync,

  // Database connection pooling
  ConnectionPool: dbPool.ConnectionPool,
  getPool: dbPool.getPool,
  resetPool: dbPool.resetPool
};
