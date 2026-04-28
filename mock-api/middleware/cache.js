/**
 * Response Caching Middleware
 * In-memory cache with Redis-compatible interface
 * Supports key patterns, TTL, and cache invalidation
 */

const NodeCache = require('node-cache');

class CacheManager {
  constructor(options = {}) {
    this.cache = new NodeCache({
      stdTTL: options.stdTTL || 300, // 5 minutes default
      checkperiod: options.checkperiod || 60, // Check for expired keys every 60s
      useClones: true,
      deleteOnExpire: true,
      maxKeys: options.maxKeys || -1 // Unlimited by default
    });

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };

    this.cache.on('expired', (_key, _value) => {
      // Optional: Log or handle expiration
    });
  }

  /**
   * Generate cache key from request
   */
  generateKey(req, keyGenerator = null) {
    if (keyGenerator) {
      return keyGenerator(req);
    }

    // Default: URL + query params + accept header
    const url = req.originalUrl || req.url;
    const accept = req.headers.accept || 'json';
    return `${req.method}:${url}:${accept}`;
  }

  /**
   * Get value from cache
   */
  get(key) {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
      return value;
    }
    this.stats.misses++;
    return undefined;
  }

  /**
   * Set value in cache
   */
  set(key, value, ttl = null) {
    this.stats.sets++;
    if (ttl) {
      return this.cache.set(key, value, ttl);
    }
    return this.cache.set(key, value);
  }

  /**
   * Delete value from cache
   */
  del(key) {
    this.stats.deletes++;
    return this.cache.del(key);
  }

  /**
   * Delete multiple keys matching pattern
   */
  delPattern(pattern) {
    const keys = this.cache.keys();
    const matching = keys.filter(key => {
      if (typeof pattern === 'string') {
        return key.includes(pattern);
      }
      return pattern.test(key);
    });
    
    this.stats.deletes += matching.length;
    return this.cache.del(matching);
  }

  /**
   * Flush all cache
   */
  flush() {
    return this.cache.flushAll();
  }

  /**
   * Get cache stats
   */
  getStats() {
    const keys = this.cache.keys();
    return {
      ...this.stats,
      keyCount: keys.length,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      keys: keys.slice(0, 100) // First 100 keys for debugging
    };
  }

  /**
   * Express middleware factory for response caching
   */
  middleware(options = {}) {
    const {
      ttl = 300, // 5 minutes default
      keyGenerator = null,
      skip = (req) => req.method !== 'GET', // Only cache GET by default
      condition = () => true, // Additional condition
      varyBy = [] // Additional vary headers
    } = options;

    return (req, res, next) => {
      // Skip non-cacheable methods
      if (skip(req)) {
        return next();
      }

      // Check condition
      if (!condition(req)) {
        return next();
      }

      // Generate cache key
      const baseKey = this.generateKey(req, keyGenerator);
      const varyHeaders = varyBy.map(h => req.headers[h] || '').join(':');
      const cacheKey = varyHeaders ? `${baseKey}:${varyHeaders}` : baseKey;

      // Try to get from cache
      const cached = this.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        return res.status(cached.status).json(cached.body);
      }

      // Mark cache miss
      res.setHeader('X-Cache', 'MISS');

      // Intercept response to cache it
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          this.set(cacheKey, {
            status: res.statusCode,
            body: body,
            cachedAt: Date.now()
          }, ttl);
        }
        return originalJson(body);
      };

      next();
    };
  }

  /**
   * Create cache invalidation middleware
   * Clears cache on POST/PUT/PATCH/DELETE operations
   */
  invalidate(patterns = []) {
    return (req, res, next) => {
      // Store original end
      const originalEnd = res.end.bind(res);
      
      res.end = (chunk, encoding) => {
        // Only invalidate on successful mutations
        if (res.statusCode >= 200 && res.statusCode < 400) {
          for (const pattern of patterns) {
            const patternStr = typeof pattern === 'function' ? pattern(req) : pattern;
            if (patternStr) {
              this.delPattern(patternStr);
            }
          }
        }
        return originalEnd(chunk, encoding);
      };

      next();
    };
  }
}

// Pre-configured cache instances for different use cases
const caches = {
  // Short-lived cache for frequently changing data (1 minute)
  volatile: new CacheManager({ stdTTL: 60 }),
  
  // Medium-lived cache (5 minutes)
  standard: new CacheManager({ stdTTL: 300 }),
  
  // Long-lived cache for stable data (1 hour)
  long: new CacheManager({ stdTTL: 3600 }),
  
  // Very long cache for reference data (24 hours)
  reference: new CacheManager({ stdTTL: 86400 })
};

// Preset middleware configurations
const presets = {
  // Cache job listings (medium TTL)
  jobsList: caches.standard.middleware({
    ttl: 300,
    keyGenerator: (req) => {
      // Include query params in key for filtered results
      const params = new URLSearchParams(req.query).toString();
      return `jobs:list:${params}`;
    }
  }),

  // Cache candidate/employer profiles (short TTL due to edits)
  profile: caches.volatile.middleware({
    ttl: 60,
    keyGenerator: (req) => `profile:${req.params.id}`
  }),

  // Cache match results (medium TTL)
  matches: caches.standard.middleware({
    ttl: 300,
    keyGenerator: (req) => {
      const params = new URLSearchParams(req.query).toString();
      return `matches:${params}`;
    }
  }),

  // Cache reference data (long TTL)
  reference: caches.long.middleware({
    ttl: 3600,
    condition: (req) => !req.query.nocache // Allow bypass with ?nocache=1
  }),

  // Invalidate cache on mutations
  invalidateJobs: caches.standard.invalidate(['jobs:list', 'jobs:get']),
  invalidateProfile: caches.volatile.invalidate((req) => `profile:${req.params.id}`),
  invalidateMatches: caches.standard.invalidate(['matches:'])
};

module.exports = {
  CacheManager,
  caches,
  presets
};
