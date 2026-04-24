/**
 * Rate Limiting Middleware
 * Token bucket algorithm with in-memory storage (Redis-compatible interface)
 * Supports IP-based and user-based limits
 */

class TokenBucket {
  constructor(capacity, refillRate, windowMs) {
    this.capacity = capacity; // Max tokens
    this.refillRate = refillRate; // Tokens per millisecond
    this.windowMs = windowMs; // Window for cleanup
    this.buckets = new Map();
    this.lastCleanup = Date.now();
  }

  consume(key, tokens = 1) {
    // Cleanup old entries periodically
    if (Date.now() - this.lastCleanup > this.windowMs) {
      this.cleanup();
    }

    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on time elapsed
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if we can consume
    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return { allowed: true, remaining: Math.floor(bucket.tokens) };
    }

    // Calculate retry-after
    const tokensNeeded = tokens - bucket.tokens;
    const retryAfter = Math.ceil(tokensNeeded / this.refillRate);

    return { 
      allowed: false, 
      remaining: 0, 
      retryAfter,
      limit: this.capacity
    };
  }

  cleanup() {
    const cutoff = Date.now() - this.windowMs * 2;
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.lastRefill < cutoff) {
        this.buckets.delete(key);
      }
    }
    this.lastCleanup = Date.now();
  }

  reset(key) {
    this.buckets.delete(key);
  }

  resetAll() {
    this.buckets.clear();
    this.lastCleanup = Date.now();
  }
}

// Rate limiter configurations per tier
const TIERS = {
  anonymous: { capacity: 100, windowMs: 15 * 60 * 1000 }, // 100 req/15min
  free: { capacity: 1000, windowMs: 15 * 60 * 1000 }, // 1000 req/15min
  premium: { capacity: 10000, windowMs: 15 * 60 * 1000 }, // 10000 req/15min
  internal: { capacity: 100000, windowMs: 15 * 60 * 1000 }, // 100k req/15min
};

class RateLimiter {
  constructor() {
    this.limiters = new Map();
    
    // Initialize limiters for each tier
    for (const [tier, config] of Object.entries(TIERS)) {
      const refillRate = config.capacity / config.windowMs;
      this.limiters.set(tier, new TokenBucket(
        config.capacity,
        refillRate,
        config.windowMs
      ));
    }
  }

  /**
   * Express middleware factory
   * @param {Object} options
   * @param {string} options.tier - Rate limit tier (anonymous, free, premium, internal)
   * @param {Function} options.keyGenerator - Function to generate rate limit key (req) => string
   * @param {Function} options.skip - Function to skip rate limiting (req) => boolean
   * @param {Function} options.onLimit - Callback when limit exceeded (req, res, next, info) => void
   */
  middleware(options = {}) {
    const {
      tier = 'anonymous',
      keyGenerator = (req) => req.ip || req.connection.remoteAddress || 'unknown',
      skip = () => false,
      onLimit = null
    } = options;

    const limiter = this.limiters.get(tier) || this.limiters.get('anonymous');

    return (req, res, next) => {
      // Skip if requested
      if (skip(req)) {
        return next();
      }

      const key = keyGenerator(req);
      const result = limiter.consume(key);

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', result.limit || limiter.capacity);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));

      if (!result.allowed) {
        res.setHeader('Retry-After', Math.ceil(result.retryAfter / 1000));
        res.setHeader('X-RateLimit-Reset', Date.now() + result.retryAfter);

        if (onLimit) {
          return onLimit(req, res, next, result);
        }

        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(result.retryAfter / 1000),
          limit: limiter.capacity
        });
      }

      next();
    };
  }

  /**
   * Create tiered rate limiter (different limits per endpoint)
   */
  tiered(tiers = {}) {
    return (req, res, next) => {
      const path = req.path;
      
      // Find matching tier config
      let matchedTier = 'anonymous';
      for (const [pattern, tierConfig] of Object.entries(tiers)) {
        if (path.startsWith(pattern) || new RegExp(pattern).test(path)) {
          matchedTier = tierConfig;
          break;
        }
      }

      return this.middleware({ tier: matchedTier })(req, res, next);
    };
  }

  reset(key) {
    for (const limiter of this.limiters.values()) {
      limiter.reset(key);
    }
  }

  resetAll() {
    for (const limiter of this.limiters.values()) {
      limiter.resetAll();
    }
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

// Pre-configured middleware presets
const presets = {
  // Standard API rate limiting
  standard: rateLimiter.middleware({ tier: 'free' }),
  
  // Strict rate limiting for auth endpoints
  strict: rateLimiter.middleware({ 
    tier: 'anonymous',
    keyGenerator: (req) => {
      // Use IP + user agent fingerprint for auth endpoints
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const ua = req.headers['user-agent'] || '';
      return `auth:${ip}:${Buffer.from(ua).toString('base64').slice(0, 10)}`;
    }
  }),
  
  // Very strict for registration/login
  auth: rateLimiter.middleware({ 
    tier: 'anonymous',
    keyGenerator: (req) => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      return `strict:${ip}`;
    },
    onLimit: (req, res, next, info) => {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Too many authentication attempts. Please try again in a few minutes.',
        retryAfter: Math.ceil(info.retryAfter / 1000)
      });
    }
  }),
  
  // Read-heavy endpoints caching
  readHeavy: rateLimiter.middleware({ tier: 'premium' }),
  
  // Internal/admin endpoints
  internal: rateLimiter.middleware({ tier: 'internal' }),

  // Custom tiered configuration
  tiered: (config) => rateLimiter.tiered(config)
};

module.exports = {
  RateLimiter,
  TokenBucket,
  rateLimiter,
  presets,
  TIERS
};
