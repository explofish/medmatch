/**
 * Middleware Tests
 * Tests for rate limiting, caching, and circuit breaker
 */

const request = require('supertest');
const express = require('express');
const {
  TokenBucket,
  RateLimiter,
  rateLimiter,
  rateLimitPresets,
  CacheManager,
  caches,
  cachePresets,
  CircuitBreaker,
  CircuitBreakerRegistry,
  CircuitBreakerError,
  circuitBreakerPresets
} = require('./index');

describe('Rate Limiting', () => {
  describe('TokenBucket', () => {
    let bucket;

    beforeEach(() => {
      bucket = new TokenBucket(10, 0.01, 60000); // 10 tokens, 10/sec refill
    });

    test('should allow requests when tokens available', () => {
      const result = bucket.consume('user1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThan(10);
    });

    test('should deny requests when tokens exhausted', () => {
      // Exhaust all tokens
      for (let i = 0; i < 10; i++) {
        bucket.consume('user1');
      }
      
      const result = bucket.consume('user1');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    test('should track different keys independently', () => {
      bucket.consume('user1');
      bucket.consume('user1');
      
      const user1Result = bucket.consume('user1');
      const user2Result = bucket.consume('user2');
      
      expect(user1Result.remaining).toBeLessThan(user2Result.remaining);
    });

    test('should refill tokens over time', () => {
      bucket.consume('user1'); // 9 remaining
      
      // Simulate time passing
      bucket.buckets.get('user1').lastRefill -= 1000; // 1 second ago
      
      const result = bucket.consume('user1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(7);
    });

    test('should cleanup old entries', () => {
      bucket.consume('user1');
      bucket.consume('user2');
      
      // Move bucket lastRefill far in the past
      bucket.buckets.get('user1').lastRefill -= 200000;
      
      bucket.cleanup();
      
      expect(bucket.buckets.has('user1')).toBe(false);
      expect(bucket.buckets.has('user2')).toBe(true);
    });

    test('should reset specific key', () => {
      bucket.consume('user1');
      bucket.reset('user1');
      
      const result = bucket.consume('user1');
      expect(result.remaining).toBe(9); // Fresh bucket
    });

    test('should reset all keys', () => {
      bucket.consume('user1');
      bucket.consume('user2');
      bucket.resetAll();
      
      expect(bucket.buckets.size).toBe(0);
    });
  });

  describe('RateLimiter middleware', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      // Reset rate limiter before each test
      rateLimiter.resetAll();
    });

    test('should allow requests within limit', async () => {
      app.get('/test', rateLimitPresets.standard, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });

    test('should block requests exceeding limit', async () => {
      // Use very strict limit for testing
      const strictLimiter = new RateLimiter();
      
      app.get('/strict', strictLimiter.middleware({ tier: 'anonymous' }), (req, res) => {
        res.json({ success: true });
      });

      // Exhaust the bucket (100 requests for anonymous tier)
      for (let i = 0; i < 100; i++) {
        await request(app).get('/strict');
      }

      // This request should be blocked
      const response = await request(app)
        .get('/strict')
        .expect(429);
      
      expect(response.body.error).toBe('Too Many Requests');
      expect(response.headers['retry-after']).toBeDefined();
    });

    test('should use custom key generator', async () => {
      app.get('/custom-key', rateLimiter.middleware({
        tier: 'free',
        keyGenerator: (req) => `custom:${req.query.user}`
      }), (req, res) => {
        res.json({ success: true });
      });

      // Different users should have different limits
      const user1Res = await request(app).get('/custom-key?user=alice');
      const user2Res = await request(app).get('/custom-key?user=bob');

      expect(user1Res.status).toBe(200);
      expect(user2Res.status).toBe(200);
    });

    test('should skip rate limiting when skip function returns true', async () => {
      app.get('/skip', rateLimiter.middleware({
        tier: 'anonymous',
        skip: (req) => req.query.admin === 'true'
      }), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/skip?admin=true')
        .expect(200);
      
      expect(response.headers['x-ratelimit-limit']).toBeUndefined();
    });

    test('should call custom onLimit handler', async () => {
      const customOnLimit = jest.fn((req, res) => {
        res.status(429).json({ customError: 'Custom limit exceeded' });
      });

      app.get('/custom-limit', rateLimiter.middleware({
        tier: 'anonymous',
        onLimit: customOnLimit
      }), (req, res) => {
        res.json({ success: true });
      });

      // Exhaust bucket
      for (let i = 0; i < 100; i++) {
        await request(app).get('/custom-limit');
      }

      const response = await request(app)
        .get('/custom-limit')
        .expect(429);
      
      expect(response.body.customError).toBe('Custom limit exceeded');
      expect(customOnLimit).toHaveBeenCalled();
    });

    test('auth preset should use stricter keying', async () => {
      app.post('/login', rateLimitPresets.auth, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/login')
        .expect(200);
      
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
    });
  });
});

describe('Caching', () => {
  describe('CacheManager', () => {
    let cache;

    beforeEach(() => {
      cache = new CacheManager({ stdTTL: 1 }); // 1 second for tests
    });

    test('should store and retrieve values', () => {
      cache.set('key1', { data: 'value' });
      const result = cache.get('key1');
      
      expect(result).toEqual({ data: 'value' });
      expect(cache.stats.hits).toBe(1);
    });

    test('should return undefined for missing keys', () => {
      const result = cache.get('nonexistent');
      
      expect(result).toBeUndefined();
      expect(cache.stats.misses).toBe(1);
    });

    test('should expire values after TTL', (done) => {
      cache.set('expires', { data: 'value' }, 0.1); // 100ms
      
      setTimeout(() => {
        const result = cache.get('expires');
        expect(result).toBeUndefined();
        done();
      }, 150);
    });

    test('should delete specific keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      cache.del('key1');
      
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
    });

    test('should delete keys matching pattern', () => {
      cache.set('user:1:profile', 'profile1');
      cache.set('user:2:profile', 'profile2');
      cache.set('user:1:settings', 'settings1');
      cache.set('jobs:list', 'jobs');
      
      cache.delPattern('user:1');
      
      expect(cache.get('user:1:profile')).toBeUndefined();
      expect(cache.get('user:1:settings')).toBeUndefined();
      expect(cache.get('user:2:profile')).toBe('profile2');
      expect(cache.get('jobs:list')).toBe('jobs');
    });

    test('should flush all data', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      cache.flush();
      
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });

    test('should generate request-based keys', () => {
      const req = {
        method: 'GET',
        originalUrl: '/api/jobs',
        headers: { accept: 'application/json' }
      };
      
      const key = cache.generateKey(req);
      expect(key).toBe('GET:/api/jobs:application/json');
    });

    test('should use custom key generator', () => {
      const req = { query: { page: 1, limit: 10 } };
      const generator = (r) => `custom:${r.query.page}`;
      
      const key = cache.generateKey(req, generator);
      expect(key).toBe('custom:1');
    });

    test('should track stats correctly', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('missing'); // miss
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.sets).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 1);
    });
  });

  describe('Cache middleware', () => {
    let app;
    let cache;

    beforeEach(() => {
      app = express();
      cache = new CacheManager({ stdTTL: 60 });
      app.use(express.json());
    });

    test('should cache GET responses', async () => {
      let callCount = 0;
      
      app.get('/cached', cache.middleware(), (req, res) => {
        callCount++;
        res.json({ data: 'response', count: callCount });
      });

      const res1 = await request(app).get('/cached');
      const res2 = await request(app).get('/cached');

      expect(callCount).toBe(1); // Only called once
      expect(res1.body).toEqual(res2.body);
      expect(res1.headers['x-cache']).toBe('MISS');
      expect(res2.headers['x-cache']).toBe('HIT');
    });

    test('should not cache non-GET methods', async () => {
      let callCount = 0;
      
      app.post('/not-cached', cache.middleware(), (req, res) => {
        callCount++;
        res.json({ count: callCount });
      });

      await request(app).post('/not-cached');
      await request(app).post('/not-cached');

      expect(callCount).toBe(2);
    });

    test('should not cache error responses', async () => {
      let callCount = 0;
      
      app.get('/error', cache.middleware(), (req, res) => {
        callCount++;
        res.status(500).json({ error: 'Server error' });
      });

      await request(app).get('/error');
      await request(app).get('/error');

      expect(callCount).toBe(2); // Both calls executed
    });

    test('should respect custom TTL', async () => {
      const shortCache = new CacheManager({ stdTTL: 0.1 });
      
      app.get('/short-ttl', shortCache.middleware({ ttl: 0.05 }), (req, res) => {
        res.json({ time: Date.now() });
      });

      await request(app).get('/short-ttl');
      
      await new Promise(r => setTimeout(r, 60)); // Wait for expiry
      
      const res2 = await request(app).get('/short-ttl');

      expect(res2.headers['x-cache']).toBe('MISS');
    });

    test('should use custom key generator', async () => {
      let callCount = 0;
      
      app.get('/custom-key', cache.middleware({
        keyGenerator: (req) => `custom:${req.query.user}`
      }), (req, res) => {
        callCount++;
        res.json({ user: req.query.user });
      });

      await request(app).get('/custom-key?user=alice');
      await request(app).get('/custom-key?user=alice'); // Same cache key
      await request(app).get('/custom-key?user=bob'); // Different cache key

      expect(callCount).toBe(2); // Called for alice once, bob once
    });

    test('should invalidate cache patterns on mutation', async () => {
      app.get('/users', cache.middleware(), (req, res) => {
        res.json({ users: ['alice', 'bob'] });
      });
      
      app.post('/users', cache.invalidate(['users']), (req, res) => {
        res.json({ created: true });
      });

      // First GET - cache miss
      await request(app).get('/users');
      
      // POST to invalidate
      await request(app).post('/users').send({ name: 'charlie' });
      
      // Second GET - should be miss again (cache invalidated)
      const response = await request(app).get('/users');
      expect(response.headers['x-cache']).toBe('MISS');
    });

    test('presets.jobsList should cache job listings', async () => {
      app.get('/jobs', cachePresets.jobsList, (req, res) => {
        res.json({ jobs: [] });
      });

      const res1 = await request(app).get('/jobs?location=berlin');
      const res2 = await request(app).get('/jobs?location=berlin');

      expect(res1.headers['x-cache']).toBe('MISS');
      expect(res2.headers['x-cache']).toBe('HIT');
    });
  });
});

describe('Circuit Breaker', () => {
  describe('CircuitBreaker', () => {
    let breaker;

    beforeEach(() => {
      breaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 100,
        halfOpenMaxCalls: 2,
        successThreshold: 1
      });
    });

    test('should start in CLOSED state', () => {
      expect(breaker.getState().state).toBe('CLOSED');
    });

    test('should execute successful functions', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      
      const result = await breaker.execute(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalled();
    });

    test('should track failures', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('failure'));
      
      try {
        await breaker.execute(fn);
      } catch (e) { /* expected failure */ }

      expect(breaker.getState().failures).toBe(1);
    });

    test('should open circuit after threshold failures', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('failure'));
      
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(fn);
        } catch (e) { /* expected failure */ }
      }

      expect(breaker.getState().state).toBe('OPEN');
    });

    test('should reject calls when OPEN', async () => {
      breaker.toOpen();
      const fn = jest.fn().mockResolvedValue('success');
      
      await expect(breaker.execute(fn)).rejects.toThrow(CircuitBreakerError);
      expect(fn).not.toHaveBeenCalled();
    });

    test('should transition to HALF_OPEN after timeout', async () => {
      breaker.toOpen();
      
      // Wait for reset timeout
      await new Promise(r => setTimeout(r, 150));
      
      // This call should trigger half-open
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch (e) { /* expected failure */ }

      expect(breaker.getState().state).toBe('HALF_OPEN');
    });

    test('should close circuit after success threshold', async () => {
      breaker.toHalfOpen();
      const fn = jest.fn().mockResolvedValue('success');
      
      await breaker.execute(fn);

      expect(breaker.getState().state).toBe('CLOSED');
    });

    test('should track metrics', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      const failFn = jest.fn().mockRejectedValue(new Error('fail'));
      
      await breaker.execute(successFn);
      
      try {
        await breaker.execute(failFn);
      } catch (e) { /* expected failure */ }

      const metrics = breaker.getMetrics();
      expect(metrics.totalCalls).toBe(2);
      expect(metrics.successfulCalls).toBe(1);
      expect(metrics.failedCalls).toBe(1);
    });

    test('should reset metrics and state', () => {
      breaker.toOpen();
      breaker.reset();

      expect(breaker.getState().state).toBe('CLOSED');
      expect(breaker.getMetrics().totalCalls).toBe(0);
    });

    test('should support synchronous functions', () => {
      const fn = jest.fn().mockReturnValue('sync result');
      
      const result = breaker.executeSync(fn);
      
      expect(result).toBe('sync result');
    });

    test('should emit state change events', () => {
      const openHandler = jest.fn();
      const closedHandler = jest.fn();
      
      breaker.on('open', openHandler);
      breaker.on('closed', closedHandler);
      
      breaker.toOpen();
      expect(openHandler).toHaveBeenCalled();
      
      breaker.toClosed();
      expect(closedHandler).toHaveBeenCalled();
    });
  });

  describe('CircuitBreakerRegistry', () => {
    let registry;

    beforeEach(() => {
      registry = new CircuitBreakerRegistry();
    });

    test('should create and retrieve breakers', () => {
      const breaker = registry.get('service1');
      const breaker2 = registry.get('service1');
      
      expect(breaker).toBe(breaker2); // Same instance
    });

    test('should create different breakers for different names', () => {
      const breaker1 = registry.get('service1');
      const breaker2 = registry.get('service2');
      
      expect(breaker1).not.toBe(breaker2);
    });

    test('should return all breakers with stats', () => {
      registry.get('service1');
      registry.get('service2');
      
      const all = registry.getAll();
      
      expect(all).toHaveLength(2);
      expect(all[0].name).toBe('service1');
      expect(all[0].state).toBeDefined();
    });

    test('should remove breakers', () => {
      registry.get('service1');
      registry.remove('service1');
      
      const newBreaker = registry.get('service1');
      expect(newBreaker.getMetrics().totalCalls).toBe(0); // Fresh instance
    });

    test('should reset all breakers', () => {
      const breaker1 = registry.get('service1');
      const breaker2 = registry.get('service2');
      
      breaker1.toOpen();
      breaker2.toOpen();
      
      registry.resetAll();
      
      expect(breaker1.getState().state).toBe('CLOSED');
      expect(breaker2.getState().state).toBe('CLOSED');
    });

    test('presets should create appropriately configured breakers', () => {
      const external = circuitBreakerPresets.external('api');
      const db = circuitBreakerPresets.database('postgres');
      
      expect(external.failureThreshold).toBe(3);
      expect(db.failureThreshold).toBe(10);
    });
  });

  describe('CircuitBreakerError', () => {
    test('should be identifiable', () => {
      const error = new CircuitBreakerError('Test error', { state: 'OPEN' });
      
      expect(error.isCircuitBreaker).toBe(true);
      expect(error.name).toBe('CircuitBreakerError');
      expect(error.state).toEqual({ state: 'OPEN' });
    });
  });
});

describe('Integration', () => {
  test('rate limiter + cache should work together', async () => {
    const app = express();
    const cache = new CacheManager({ stdTTL: 60 });
    
    app.use(rateLimitPresets.standard);
    app.get('/combined', cache.middleware(), (req, res) => {
      res.json({ timestamp: Date.now() });
    });

    const res1 = await request(app).get('/combined');
    const res2 = await request(app).get('/combined');

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body).toEqual(res2.body);
    expect(res2.headers['x-cache']).toBe('HIT');
    expect(res2.headers['x-ratelimit-limit']).toBeDefined();
  });

  test('all preset caches should be independent', () => {
    expect(caches.volatile).not.toBe(caches.standard);
    expect(caches.standard).not.toBe(caches.long);
    
    // Verify different TTLs
    expect(caches.volatile.cache.options.stdTTL).toBe(60);
    expect(caches.standard.cache.options.stdTTL).toBe(300);
    expect(caches.long.cache.options.stdTTL).toBe(3600);
  });
});

// Additional tests for coverage

describe('Rate Limiter - Additional Coverage', () => {
  test('should handle missing IP gracefully', async () => {
    const app = express();
    const limiter = new RateLimiter();
    
    app.get('/test', limiter.middleware({ tier: 'free' }), (req, res) => {
      res.json({ success: true });
    });

    // Request without IP
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
  });

  test('should handle tiered configuration', async () => {
    const app = express();
    const limiter = new RateLimiter();
    
    app.get('/api/auth', limiter.middleware({ tier: 'anonymous' }), (req, res) => res.json({}));
    app.get('/api/jobs', limiter.middleware({ tier: 'free' }), (req, res) => res.json({}));
    app.get('/api/admin', limiter.middleware({ tier: 'internal' }), (req, res) => res.json({}));

    const auth = await request(app).get('/api/auth');
    const jobs = await request(app).get('/api/jobs');
    const admin = await request(app).get('/api/admin');

    expect(auth.status).toBe(200);
    expect(jobs.status).toBe(200);
    expect(admin.status).toBe(200);
  });
});

describe('Cache - Additional Coverage', () => {
  test('should cache with varyBy headers', async () => {
    const cache = new CacheManager({ stdTTL: 60 });
    const app = express();
    
    app.get('/vary', cache.middleware({ varyBy: ['accept-language'] }), (req, res) => {
      res.json({ lang: req.headers['accept-language'] || 'en' });
    });

    const res1 = await request(app).get('/vary').set('accept-language', 'de');
    const res2 = await request(app).get('/vary').set('accept-language', 'en');
    const res3 = await request(app).get('/vary').set('accept-language', 'de');

    expect(res1.body.lang).toBe('de');
    expect(res2.body.lang).toBe('en');
    expect(res3.headers['x-cache']).toBe('HIT');
  });

  test('should conditionally skip cache', async () => {
    const cache = new CacheManager({ stdTTL: 60 });
    const app = express();
    let callCount = 0;
    
    app.get('/conditional', cache.middleware({
      condition: (req) => !req.query.skip
    }), (req, res) => {
      callCount++;
      res.json({ count: callCount });
    });

    await request(app).get('/conditional');
    await request(app).get('/conditional?skip=1');
    await request(app).get('/conditional?skip=1');

    expect(callCount).toBe(3);
  });

  test('should handle cache invalidation with dynamic patterns', async () => {
    const cache = new CacheManager({ stdTTL: 60 });
    const app = express();
    
    app.get('/users/:id', cache.middleware(), (req, res) => {
      res.json({ id: req.params.id });
    });
    
    app.patch('/users/:id', cache.invalidate([(req) => `GET:/users/${req.params.id}`]), (req, res) => {
      res.json({ updated: true });
    });

    await request(app).get('/users/123');
    await request(app).patch('/users/123');
    
    // Cache should be invalidated
    const final = await request(app).get('/users/123');
    expect(final.headers['x-cache']).toBe('MISS');
  });

  test('should handle regex pattern deletion', () => {
    const cache = new CacheManager({ stdTTL: 60 });
    
    cache.set('jobs:berlin', { city: 'berlin' });
    cache.set('jobs:muenchen', { city: 'muenchen' });
    cache.set('users:alice', { name: 'alice' });
    
    cache.delPattern(/^jobs:/);
    
    expect(cache.get('jobs:berlin')).toBeUndefined();
    expect(cache.get('jobs:muenchen')).toBeUndefined();
    expect(cache.get('users:alice')).toBeDefined();
  });

  test('should handle maxKeys configuration', () => {
    // Just verify the cache accepts maxKeys option without error
    const cache = new CacheManager({ stdTTL: 60, maxKeys: 100 });
    
    for (let i = 0; i < 10; i++) {
      cache.set(`key${i}`, `value${i}`);
    }
    
    expect(cache.getStats().keyCount).toBe(10);
  });
});

describe('Circuit Breaker - Additional Coverage', () => {
  test('should transition half-open to closed on success', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 100,
      halfOpenMaxCalls: 3,
      successThreshold: 1
    });
    
    breaker.toHalfOpen();
    expect(breaker.getState().state).toBe('HALF_OPEN');
    
    // Success in half-open should transition to closed
    await breaker.execute(() => Promise.resolve('success'));
    expect(breaker.getState().state).toBe('CLOSED');
  });

  test('should handle success in half-open state', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 100,
      halfOpenMaxCalls: 3,
      successThreshold: 2
    });
    
    breaker.toHalfOpen();
    
    // First success - halfOpenCalls incremented
    await breaker.execute(() => Promise.resolve('ok'));
    expect(breaker.getState().state).toBe('HALF_OPEN');
    // successes is tracked separately from halfOpenCalls
    
    // Second success - should close after successThreshold
    await breaker.execute(() => Promise.resolve('ok'));
    expect(breaker.getState().state).toBe('CLOSED');
  });

  test('should track state transitions', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 });
    
    try {
      await breaker.execute(() => Promise.reject(new Error('fail')));
    } catch (e) { /* expected failure */ }

    const metrics = breaker.getMetrics();
    expect(metrics.stateTransitions.length).toBeGreaterThan(0);
    expect(metrics.stateTransitions[0].from).toBe('CLOSED');
    expect(metrics.stateTransitions[0].to).toBe('OPEN');
  });

  test('should handle synchronous failures', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2 });
    
    expect(() => {
      breaker.executeSync(() => { throw new Error('sync fail'); });
    }).toThrow();

    expect(() => {
      breaker.executeSync(() => { throw new Error('sync fail'); });
    }).toThrow();

    expect(breaker.getState().state).toBe('OPEN');
  });

  test('should handle multiple half-open calls', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 1,
      halfOpenMaxCalls: 3,
      successThreshold: 2
    });
    
    breaker.toOpen();
    await new Promise(r => setTimeout(r, 5));
    
    // This should trigger toHalfOpen
    try {
      await breaker.execute(() => Promise.reject(new Error('fail')));
    } catch (e) { /* expected failure */ }

    expect(breaker.getState().halfOpenCalls).toBeLessThanOrEqual(3);
  });

  test('registry middleware should attach breaker to request', async () => {
    const app = express();
    const registry = new CircuitBreakerRegistry();
    
    app.use(registry.middleware('test-service'));
    app.get('/test', (req, res) => {
      expect(req.circuitBreaker).toBeDefined();
      res.json({ hasBreaker: true });
    });

    const res = await request(app).get('/test');
    expect(res.body.hasBreaker).toBe(true);
  });

  test('should handle getStats with keys limit', () => {
    const cache = new CacheManager({ stdTTL: 60 });
    
    for (let i = 0; i < 150; i++) {
      cache.set(`key${i}`, `value${i}`);
    }
    
    const stats = cache.getStats();
    expect(stats.keys.length).toBe(100); // Limited to first 100
  });
});

// More targeted tests for rate limiter coverage
describe('Rate Limiter - Tiered Config', () => {
  test('should use tiered configuration with path matching', async () => {
    const app = express();
    const limiter = new RateLimiter();
    
    // Test tiered middleware with different paths
    app.get('/api/auth', limiter.tiered({ '/api/auth': 'anonymous', '/api/admin': 'internal' }), (req, res) => res.json({}));
    app.get('/api/admin', limiter.tiered({ '/api/auth': 'anonymous', '/api/admin': 'internal' }), (req, res) => res.json({}));
    app.get('/api/jobs', limiter.tiered({}), (req, res) => res.json({}));

    const authRes = await request(app).get('/api/auth');
    const adminRes = await request(app).get('/api/admin');
    const jobsRes = await request(app).get('/api/jobs');

    expect(authRes.status).toBe(200);
    expect(adminRes.status).toBe(200);
    expect(jobsRes.status).toBe(200);
    expect(authRes.headers['x-ratelimit-limit']).toBeDefined();
  });

  test('should handle rate limit with user-agent keying', async () => {
    const app = express();
    const limiter = new RateLimiter();
    
    app.get('/strict', limiter.middleware({
      tier: 'anonymous',
      keyGenerator: (req) => {
        const ip = req.ip || 'unknown';
        const ua = req.headers['user-agent'] || '';
        return `strict:${ip}:${ua.slice(0, 10)}`;
      }
    }), (req, res) => res.json({ success: true }));

    const res = await request(app)
      .get('/strict')
      .set('User-Agent', 'test-agent');
    
    expect(res.status).toBe(200);
  });
});
