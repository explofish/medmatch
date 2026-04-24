/**
 * Middleware exports
 * Rate limiting, caching, and circuit breaker modules
 */

const rateLimiter = require('./rateLimiter');
const cache = require('./cache');
const circuitBreaker = require('./circuitBreaker');

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
  circuitBreakerPresets: circuitBreaker.presets
};
