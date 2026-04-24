/**
 * Query Result Caching Utility
 *
 * Provides in-memory caching for database query results:
 * - Time-based expiration (TTL)
 * - Cache size limits (LRU eviction)
 * - Cache hit/miss statistics
 * - Tag-based cache invalidation
 */

// Cache configuration
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_CACHE_SIZE = 1000; // Maximum number of cached items
const CLEANUP_INTERVAL = 60 * 1000; // Cleanup every minute

/**
 * Cache entry structure
 */
class CacheEntry {
  constructor(key, value, ttl, tags = []) {
    this.key = key;
    this.value = value;
    this.createdAt = Date.now();
    this.ttl = ttl || DEFAULT_TTL;
    this.expiresAt = this.createdAt + this.ttl;
    this.accessCount = 0;
    this.lastAccessedAt = this.createdAt;
    this.tags = tags; // For tag-based invalidation
  }

  isExpired() {
    return Date.now() > this.expiresAt;
  }

  touch() {
    this.accessCount++;
    this.lastAccessedAt = Date.now();
  }
}

/**
 * In-memory cache with LRU eviction
 */
class Cache {
  constructor() {
    this.store = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, CLEANUP_INTERVAL);
  }

  /**
   * Get value from cache
   */
  get(key) {
    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (entry.isExpired()) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.touch();
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key, value, ttl = null, tags = []) {
    // Check if we need to evict (LRU)
    if (this.store.size >= MAX_CACHE_SIZE && !this.store.has(key)) {
      this.evictLRU();
    }

    const entry = new CacheEntry(key, value, ttl, tags);
    this.store.set(key, entry);
    this.stats.sets++;
    return this;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key) {
    const entry = this.store.get(key);
    if (!entry) {return false;}
    if (entry.isExpired()) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete value from cache
   */
  delete(key) {
    const existed = this.store.delete(key);
    if (existed) {
      this.stats.deletes++;
    }
    return existed;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.store.clear();
    return this;
  }

  /**
   * Evict least recently used entry
   */
  evictLRU() {
    let oldest = null;
    let oldestKey = null;

    for (const [key, entry] of this.store) {
      if (!oldest || entry.lastAccessedAt < oldest.lastAccessedAt) {
        oldest = entry;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Remove expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store) {
      if (entry.expiresAt < now) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Cache] Cleaned up ${cleaned} expired entries`);
    }
  }

  /**
   * Invalidate entries by tag
   */
  invalidateByTag(tag) {
    let count = 0;

    for (const [key, entry] of this.store) {
      if (entry.tags.includes(tag)) {
        this.store.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Invalidate entries by pattern (prefix matching)
   */
  invalidateByPattern(pattern) {
    let count = 0;

    for (const key of this.store.keys()) {
      if (key.startsWith(pattern)) {
        this.store.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;

    return {
      size: this.store.size,
      maxSize: MAX_CACHE_SIZE,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: `${hitRate}%`,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
      evictions: this.stats.evictions
    };
  }

  /**
   * Get cache keys (for debugging)
   */
  keys() {
    return Array.from(this.store.keys());
  }

  /**
   * Stop cleanup interval (for testing)
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Create singleton instance
const cache = new Cache();

/**
 * Generate cache key from query and params
 */
function generateCacheKey(query, params = []) {
  const paramsStr = params.length > 0
    ? ':' + params.map(p => String(p)).join(':')
    : '';
  return `query:${query.replace(/\s+/g, ' ').trim()}${paramsStr}`.substring(0, 250);
}

/**
 * Generate cache key from route and query params
 */
function generateRouteCacheKey(route, query = {}) {
  const sortedParams = Object.keys(query)
    .sort()
    .map(key => `${key}=${query[key]}`)
    .join('&');
  return `route:${route}:${sortedParams}`;
}

module.exports = cache;
module.exports.generateCacheKey = generateCacheKey;
module.exports.generateRouteCacheKey = generateRouteCacheKey;
module.exports.Cache = Cache;
