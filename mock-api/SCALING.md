# API Scaling Infrastructure

This document covers the rate limiting, caching, and circuit breaker infrastructure implemented for the MedMatch API.

## Overview

The middleware system provides three key resilience patterns:

1. **Rate Limiting** - Token bucket algorithm for request throttling
2. **Response Caching** - In-memory cache with TTL and invalidation
3. **Circuit Breaker** - Prevents cascading failures from external services

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Express App                             │
├─────────────────────────────────────────────────────────────┤
│  Rate Limiter → Cache → Circuit Breaker → Route Handler    │
├─────────────────────────────────────────────────────────────┤
│  Memory Cache (local dev) / Redis (production)             │
└─────────────────────────────────────────────────────────────┘
```

## Rate Limiting

### Token Bucket Algorithm

The rate limiter uses a token bucket algorithm which:
- Allows bursts of traffic up to bucket capacity
- Refills tokens at a steady rate over time
- Supports per-IP and per-user limits

### Tiers

| Tier | Requests/15min | Use Case |
|------|---------------|----------|
| anonymous | 100 | Unauthenticated requests |
| free | 1,000 | Standard API users |
| premium | 10,000 | Paid tier users |
| internal | 100,000 | Internal services |

### Usage

```javascript
const { rateLimitPresets } = require('./middleware');

// Standard rate limiting
app.use('/api/', rateLimitPresets.standard);

// Stricter for auth endpoints
app.post('/api/auth/*', rateLimitPresets.auth);

// Custom configuration
app.use('/api/admin', rateLimiter.middleware({
  tier: 'internal',
  keyGenerator: (req) => `admin:${req.user.id}`
}));
```

### Headers

All rate-limited responses include:
- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Remaining requests in window
- `Retry-After` - Seconds until retry (when limited)

## Caching

### Cache Layers

| Cache Type | TTL | Use Case |
|------------|-----|----------|
| volatile | 60s | Profiles, user data |
| standard | 5min | Job listings, matches |
| long | 1hour | Reference data |
| reference | 24hours | Static data |

### Usage

```javascript
const { cachePresets } = require('./middleware');

// Cache job listings
app.get('/api/jobs', cachePresets.jobsList, getJobsHandler);

// Cache with custom key
app.get('/api/candidates/:id', cache.middleware({
  keyGenerator: (req) => `candidate:${req.params.id}`,
  ttl: 120
}), getCandidateHandler);

// Invalidate on update
app.patch('/api/jobs/:id', 
  cache.invalidate(['jobs:list']),
  updateJobHandler
);
```

### Cache Invalidation

Automatic invalidation strategies:
- Pattern-based: `cache.invalidate(['jobs:list'])`
- Dynamic: `cache.invalidate([(req) => `jobs:${req.params.id}`])`
- Full flush: `cache.flush()`

### Headers

- `X-Cache: HIT/MISS` - Cache status
- `X-Cache-Key` - Cache key (debug)

## Circuit Breaker

### States

```
CLOSED ──failures──> OPEN ──timeout──> HALF_OPEN ──success──> CLOSED
  ↑                                                      │
  └─────────────────────failures─────────────────────────┘
```

### Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| failureThreshold | 5 | Failures before opening |
| resetTimeout | 30s | Time before half-open |
| halfOpenMaxCalls | 3 | Test calls in half-open |
| successThreshold | 2 | Successes to close |

### Usage

```javascript
const { circuitBreakerPresets, circuitBreakerRegistry } = require('./middleware');

// Protect external API calls
const externalApiBreaker = circuitBreakerPresets.external('payment-api');

app.post('/api/payment', async (req, res) => {
  try {
    const result = await externalApiBreaker.execute(async () => {
      return await callPaymentProvider(req.body);
    });
    res.json(result);
  } catch (err) {
    if (err.isCircuitBreaker) {
      return res.status(503).json({ 
        error: 'Payment service temporarily unavailable' 
      });
    }
    throw err;
  }
});

// Registry for multiple services
const dbBreaker = circuitBreakerPresets.database('postgres');
const emailBreaker = circuitBreakerPresets.notification('email-service');
```

### Monitoring

```javascript
// Get circuit breaker status
const status = circuitBreakerRegistry.getAll();
console.log(status);
// [{ name: 'payment-api', state: { state: 'CLOSED', ... }, metrics: {...} }]

// Reset after incident
registry.resetAll();
```

## Scaling Considerations

### Development (Local)

- In-memory storage only
- No persistence across restarts
- Perfect for local development and testing

### Staging/Production

**Redis Migration Path:**

The cache and rate limiter use Redis-compatible interfaces. To migrate:

1. Install Redis client:
```bash
npm install ioredis
```

2. Replace `NodeCache` with Redis:
```javascript
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

// Replace cache operations
redis.get(key);
redis.setex(key, ttl, value);
```

3. Replace rate limiter storage:
```javascript
// Use Redis for distributed rate limiting
const RedisRateLimiter = require('./middleware/redis-rate-limiter');
```

### Performance

**Benchmarks (local, single instance):**
- Rate limiting: ~50,000 req/sec
- Cache hits: ~100,000 req/sec
- Cache misses: ~10,000 req/sec (includes Express overhead)

### Horizontal Scaling

For multi-instance deployments:

1. **Rate Limiting:** Use Redis-backed distributed rate limiting
2. **Caching:** Use Redis or Memcached for shared cache
3. **Circuit Breaker:** Per-instance is fine (local state)

### Memory Management

- Cache auto-expires entries
- Periodic cleanup of old rate limit buckets
- Configurable max keys limit
- Memory usage ~10MB per 100k cached items

## Testing

Run middleware tests:
```bash
npm test -- middleware/middleware.test.js
```

Coverage report:
```bash
npm run test:coverage -- middleware/middleware.test.js
```

Current coverage: **90.8% statements, 90.7% lines**

## Files

| File | Description |
|------|-------------|
| `middleware/index.js` | Module exports |
| `middleware/rateLimiter.js` | Token bucket rate limiting |
| `middleware/cache.js` | Response caching |
| `middleware/circuitBreaker.js` | Fault tolerance |
| `middleware/middleware.test.js` | Unit tests (65 tests) |

## References

- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Node-Cache Documentation](https://github.com/node-cache/node-cache)
