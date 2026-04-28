/**
 * Cache Middleware Tests
 * 
 * @jest-environment node
 */

const CacheManager = require('./cache').CacheManager;
const caches = require('./cache').caches;
const presets = require('./cache').presets;

describe('CacheManager', () => {
  let cache;

  beforeEach(() => {
    cache = new CacheManager({ stdTTL: 1, checkperiod: 0.5 });
  });

  afterEach(() => {
    if (cache) {
      cache.cache.close();
    }
  });

  test('should create cache with default options', () => {
    const defaultCache = new CacheManager();
    expect(defaultCache).toBeDefined();
    expect(defaultCache.stats).toEqual({
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    });
    defaultCache.cache.close();
  });

  test('should create cache with custom options', () => {
    const customCache = new CacheManager({
      stdTTL: 600,
      maxKeys: 1000
    });
    expect(customCache).toBeDefined();
    customCache.cache.close();
  });

  test('should generate default cache key', () => {
    const mockReq = {
      method: 'GET',
      originalUrl: '/api/jobs',
      headers: { accept: 'application/json' }
    };
    const key = cache.generateKey(mockReq);
    expect(key).toBe('GET:/api/jobs:application/json');
  });

  test('should generate cache key with custom generator', () => {
    const mockReq = {
      method: 'GET',
      url: '/api/jobs?id=123',
      query: { id: '123' }
    };
    const key = cache.generateKey(mockReq, (req) => `custom:${req.query.id}`);
    expect(key).toBe('custom:123');
  });

  test('should set and get value', () => {
    cache.set('test-key', { data: 'value' });
    const value = cache.get('test-key');
    expect(value).toEqual({ data: 'value' });
    expect(cache.stats.sets).toBe(1);
    expect(cache.stats.hits).toBe(1);
  });

  test('should return undefined for missing key', () => {
    const value = cache.get('missing-key');
    expect(value).toBeUndefined();
    expect(cache.stats.misses).toBe(1);
  });

  test('should delete value', () => {
    cache.set('delete-test', 'value');
    cache.del('delete-test');
    const value = cache.get('delete-key');
    expect(cache.stats.deletes).toBe(1);
  });

  test('should set value with custom TTL', () => {
    cache.set('ttl-test', 'value', 10);
    const value = cache.get('ttl-test');
    expect(value).toBe('value');
  });

  test('should track stats correctly', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.get('key1');
    cache.get('key1');
    cache.get('missing');
    cache.del('key1');

    expect(cache.stats.sets).toBe(2);
    expect(cache.stats.hits).toBe(2);
    expect(cache.stats.misses).toBe(1);
    expect(cache.stats.deletes).toBe(1);
  });

  test('should get all stats', () => {
    cache.set('stats-test', 'value');
    const stats = cache.getStats();
    expect(stats).toHaveProperty('hits');
    expect(stats).toHaveProperty('misses');
    expect(stats).toHaveProperty('sets');
    expect(stats).toHaveProperty('deletes');
    expect(stats).toHaveProperty('keys');
    expect(stats).toHaveProperty('hitRate');
  });

  test('should create middleware function', () => {
    const middleware = cache.middleware();
    expect(typeof middleware).toBe('function');
  });

  test('should create invalidate function', () => {
    const invalidate = cache.invalidate(['pattern']);
    expect(typeof invalidate).toBe('function');
  });

  test('should clear all cache', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.flush();
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBeUndefined();
  });

  test('should check if key exists', () => {
    cache.set('exists-test', 'value');
    expect(cache.cache.has('exists-test')).toBe(true);
    expect(cache.cache.has('not-exists')).toBe(false);
  });

  test('should get cache keys', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    const keys = cache.cache.keys();
    expect(keys).toContain('key1');
    expect(keys).toContain('key2');
  });

  test('should delete by pattern', () => {
    cache.set('pattern-test1', 'value1');
    cache.set('pattern-test2', 'value2');
    cache.set('other-value', 'value3');
    cache.delPattern('pattern');
    expect(cache.get('pattern-test1')).toBeUndefined();
    expect(cache.get('pattern-test2')).toBeUndefined();
    expect(cache.get('other-value')).toBe('value3');
  });
});

describe('Cache Presets', () => {
  test('should have standard cache', () => {
    expect(caches.standard).toBeDefined();
  });

  test('should have volatile cache', () => {
    expect(caches.volatile).toBeDefined();
  });

  test('should have long cache', () => {
    expect(caches.long).toBeDefined();
  });

  test('should have jobsList preset', () => {
    expect(presets.jobsList).toBeDefined();
    expect(typeof presets.jobsList).toBe('function');
  });

  test('should have profile preset', () => {
    expect(presets.profile).toBeDefined();
    expect(typeof presets.profile).toBe('function');
  });

  test('should have matches preset', () => {
    expect(presets.matches).toBeDefined();
    expect(typeof presets.matches).toBe('function');
  });

  test('should have reference preset', () => {
    expect(presets.reference).toBeDefined();
    expect(typeof presets.reference).toBe('function');
  });

  test('should have invalidate functions', () => {
    expect(presets.invalidateJobs).toBeDefined();
    expect(presets.invalidateProfile).toBeDefined();
    expect(presets.invalidateMatches).toBeDefined();
  });
});

describe('Cache Module Exports', () => {
  test('should export CacheManager class', () => {
    const cacheModule = require('./cache');
    expect(cacheModule.CacheManager).toBeDefined();
  });

  test('should export caches object', () => {
    const cacheModule = require('./cache');
    expect(cacheModule.caches).toBeDefined();
    expect(typeof cacheModule.caches).toBe('object');
  });

  test('should export presets object', () => {
    const cacheModule = require('./cache');
    expect(cacheModule.presets).toBeDefined();
    expect(typeof cacheModule.presets).toBe('object');
  });
});
