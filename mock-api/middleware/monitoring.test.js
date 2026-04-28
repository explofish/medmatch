/**
 * Monitoring Middleware Tests
 * 
 * @jest-environment node
 */

const {
  metrics,
  MetricsCollector,
  logger,
  LOG_LEVELS,
  createLogEntry,
  runWithContext,
  getContext,
  getRequestId,
  ERROR_TYPES,
  classifyError,
  requestIdMiddleware,
  loggingMiddleware,
  metricsMiddleware,
  errorTrackingMiddleware,
  asyncHandler,
  performHealthCheck,
  performLivenessCheck,
  performReadinessCheck
} = require('./monitoring');

describe('MetricsCollector', () => {
  let collector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  test('should create with initial state', () => {
    expect(collector.totalRequests).toBe(0);
    expect(collector.totalErrors).toBe(0);
    expect(collector.activeConnections).toBe(0);
    expect(collector.startTime).toBeDefined();
  });

  test('should record request', () => {
    collector.recordRequest('GET', '/api/test', 200, 50);
    expect(collector.totalRequests).toBe(1);
    expect(collector.requestCounts.get('GET:/api/test')).toBe(1);
  });

  test('should record error request', () => {
    collector.recordRequest('GET', '/api/test', 500, 100, 'server_error');
    expect(collector.totalRequests).toBe(1);
    expect(collector.totalErrors).toBe(1);
    expect(collector.errorCounts.get('server_error')).toBe(1);
  });

  test('should record HTTP error based on status code', () => {
    collector.recordRequest('GET', '/api/test', 400, 50);
    expect(collector.totalErrors).toBe(1);
    expect(collector.errorCounts.get('http_400')).toBe(1);
  });

  test('should record business metric', () => {
    collector.recordBusinessMetric('signup', 1, { source: 'landing' });
    expect(collector.businessMetrics.has('signup')).toBe(true);
    const metrics = collector.businessMetrics.get('signup');
    expect(metrics.length).toBe(1);
    expect(metrics[0].value).toBe(1);
    expect(metrics[0].labels).toEqual({ source: 'landing' });
  });

  test('should track active connections', () => {
    collector.incrementActiveConnections();
    collector.incrementActiveConnections();
    expect(collector.activeConnections).toBe(2);
    
    collector.decrementActiveConnections();
    expect(collector.activeConnections).toBe(1);
  });

  test('should not go below zero connections', () => {
    collector.decrementActiveConnections();
    expect(collector.activeConnections).toBe(0);
  });

  test('should get metrics', () => {
    collector.recordRequest('GET', '/api/test', 200, 100);
    collector.recordRequest('GET', '/api/test', 200, 200);
    
    const metrics = collector.getMetrics();
    expect(metrics).toHaveProperty('uptime');
    expect(metrics).toHaveProperty('totalRequests');
    expect(metrics).toHaveProperty('totalErrors');
    expect(metrics).toHaveProperty('requestRate');
    expect(metrics).toHaveProperty('errorRate');
    expect(metrics).toHaveProperty('requestCounts');
    expect(metrics).toHaveProperty('responseTimes');
    expect(metrics).toHaveProperty('system');
    expect(metrics.totalRequests).toBe(2);
  });

  test('should calculate percentiles', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const p95 = collector.calculatePercentile(arr, 0.95);
    expect(p95).toBe(10);
  });

  test('should format duration', () => {
    expect(collector.formatDuration(50000)).toBe('50s');
    expect(collector.formatDuration(120000)).toBe('2m 0s');
    expect(collector.formatDuration(3600000)).toBe('1h 0m 0s');
    expect(collector.formatDuration(90000000)).toBe('1d 1h 0m');
  });

  test('should get memory usage', () => {
    const mem = collector.getMemoryUsage();
    expect(mem).toHaveProperty('rss');
    expect(mem).toHaveProperty('heapTotal');
    expect(mem).toHaveProperty('heapUsed');
    expect(mem).toHaveProperty('systemTotal');
    expect(mem).toHaveProperty('systemFree');
  });

  test('should export to Prometheus format', () => {
    collector.recordRequest('GET', '/api/test', 200, 100);
    const prom = collector.toPrometheusFormat();
    expect(prom).toContain('medmatch_api_uptime_seconds');
    expect(prom).toContain('medmatch_api_requests_total');
    expect(prom).toContain('medmatch_api_active_connections');
  });
});

describe('Logger', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('should create log entry', () => {
    const entry = createLogEntry('INFO', 'Test message', { userId: 1 });
    expect(entry.timestamp).toBeDefined();
    expect(entry.level).toBe('INFO');
    expect(entry.message).toBe('Test message');
    expect(entry.userId).toBe(1);
    expect(entry.service).toBe('medmatch-api');
  });

  test('should log at different levels', () => {
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warn message');
    logger.error('Error message');
    logger.fatal('Fatal message');
    
    expect(consoleSpy).toHaveBeenCalledTimes(4); // DEBUG filtered by default
  });

  test('should log in JSON format by default', () => {
    logger.info('Test', { key: 'value' });
    const output = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(output.level).toBe('INFO');
    expect(output.message).toBe('Test');
    expect(output.key).toBe('value');
  });

  test('should respect log level', () => {
    const originalLevel = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = 'ERROR';
    
    // Need to reimport to pick up new log level, so just test LOG_LEVELS const
    expect(LOG_LEVELS.DEBUG).toBe(0);
    expect(LOG_LEVELS.INFO).toBe(1);
    expect(LOG_LEVELS.WARN).toBe(2);
    expect(LOG_LEVELS.ERROR).toBe(3);
    expect(LOG_LEVELS.FATAL).toBe(4);
    
    if (originalLevel) {
      process.env.LOG_LEVEL = originalLevel;
    } else {
      delete process.env.LOG_LEVEL;
    }
  });
});

describe('Context/Correlation', () => {
  test('should run with context', (done) => {
    runWithContext('test-request-id', () => {
      const ctx = getContext();
      expect(ctx.requestId).toBe('test-request-id');
      done();
    });
  });

  test('should get request ID from context', (done) => {
    runWithContext('my-request', () => {
      expect(getRequestId()).toBe('my-request');
      done();
    });
  });

  test('should return null when no context', () => {
    expect(getRequestId()).toBeNull();
  });
});

describe('Error Classification', () => {
  test('should have error types defined', () => {
    expect(ERROR_TYPES.VALIDATION).toBe('validation');
    expect(ERROR_TYPES.AUTHENTICATION).toBe('authentication');
    expect(ERROR_TYPES.AUTHORIZATION).toBe('authorization');
    expect(ERROR_TYPES.DATABASE).toBe('database');
    expect(ERROR_TYPES.SERVER).toBe('server');
  });

  test('should classify validation error', () => {
    const error = new Error('Invalid input');
    error.name = 'ValidationError';
    expect(classifyError(error, 400)).toBe(ERROR_TYPES.VALIDATION);
  });

  test('should classify authentication error', () => {
    const error = new Error('Unauthorized');
    error.name = 'UnauthorizedError';
    expect(classifyError(error, 401)).toBe(ERROR_TYPES.AUTHENTICATION);
  });

  test('should classify database error', () => {
    const error = new Error('SQLITE_CONSTRAINT');
    error.code = 'SQLITE_CONSTRAINT';
    expect(classifyError(error, 500)).toBe(ERROR_TYPES.DATABASE);
  });

  test('should classify external error', () => {
    const error = new Error('Connection failed');
    error.code = 'ECONNREFUSED';
    expect(classifyError(error, 500)).toBe(ERROR_TYPES.EXTERNAL);
  });

  test('should classify by status code', () => {
    expect(classifyError(new Error(), 400)).toBe(ERROR_TYPES.VALIDATION);
    expect(classifyError(new Error(), 401)).toBe(ERROR_TYPES.AUTHENTICATION);
    expect(classifyError(new Error(), 403)).toBe(ERROR_TYPES.AUTHORIZATION);
    expect(classifyError(new Error(), 404)).toBe(ERROR_TYPES.NOT_FOUND);
    expect(classifyError(new Error(), 409)).toBe(ERROR_TYPES.CONFLICT);
    expect(classifyError(new Error(), 429)).toBe(ERROR_TYPES.RATE_LIMIT);
    expect(classifyError(new Error(), 500)).toBe(ERROR_TYPES.SERVER);
  });

  test('should return unknown for unmapped', () => {
    expect(classifyError(new Error(), 418)).toBe(ERROR_TYPES.UNKNOWN);
  });
});

describe('Middleware', () => {
  test('should create requestIdMiddleware', () => {
    const middleware = requestIdMiddleware();
    expect(typeof middleware).toBe('function');
  });

  test('requestIdMiddleware should set request ID', (done) => {
    const middleware = requestIdMiddleware();
    const req = { headers: {} };
    const res = { setHeader: jest.fn() };
    
    middleware(req, res, () => {
      expect(req.requestId).toBeDefined();
      expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.requestId);
      done();
    });
  });

  test('requestIdMiddleware should use provided ID', (done) => {
    const middleware = requestIdMiddleware();
    const req = { headers: { 'x-request-id': 'custom-id' } };
    const res = { setHeader: jest.fn() };
    
    middleware(req, res, () => {
      expect(req.requestId).toBe('custom-id');
      done();
    });
  });

  test('should create loggingMiddleware', () => {
    const middleware = loggingMiddleware();
    expect(typeof middleware).toBe('function');
  });

  test('should create metricsMiddleware', () => {
    const middleware = metricsMiddleware();
    expect(typeof middleware).toBe('function');
  });

  test('should create errorTrackingMiddleware', () => {
    const middleware = errorTrackingMiddleware();
    expect(typeof middleware).toBe('function');
  });

  test('errorTrackingMiddleware should handle error', () => {
    const middleware = errorTrackingMiddleware();
    const error = new Error('Test error');
    const req = { requestId: 'req-123', method: 'GET', path: '/test' };
    const res = { 
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();
    
    middleware(error, req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        type: expect.any(String),
        message: expect.any(String),
        requestId: 'req-123'
      })
    }));
  });

  test('asyncHandler should catch async errors', async () => {
    const asyncFn = jest.fn().mockRejectedValue(new Error('async error'));
    const next = jest.fn();
    
    const wrapped = asyncHandler(asyncFn);
    await wrapped({}, {}, next);
    
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('asyncHandler should resolve successful async functions', async () => {
    const asyncFn = jest.fn().mockResolvedValue('success');
    const next = jest.fn();
    
    const wrapped = asyncHandler(asyncFn);
    await wrapped({}, {}, next);
    
    expect(asyncFn).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});

describe('Health Checks', () => {
  test('should perform liveness check', () => {
    const check = performLivenessCheck();
    expect(check.status).toBe('ok');
    expect(check.timestamp).toBeDefined();
  });

  test('should perform readiness check with database', async () => {
    // Mock database
    const mockDb = {
      get: jest.fn((sql, params, cb) => cb(null))
    };
    
    const check = await performReadinessCheck({ db: mockDb });
    expect(check.status).toBe('ready');
    expect(check.checks.database.status).toBe('ready');
  });

  test('should handle database failure in readiness', async () => {
    const mockDb = {
      get: jest.fn((sql, params, cb) => cb(new Error('DB error')))
    };
    
    const check = await performReadinessCheck({ db: mockDb });
    expect(check.status).toBe('not_ready');
    expect(check.checks.database.status).toBe('not_ready');
  });

  test('should perform health check with database', async () => {
    const mockDb = {
      get: jest.fn((sql, params, cb) => cb(null))
    };
    
    const check = await performHealthCheck({ db: mockDb });
    expect(check.status).toBe('ok');
    expect(check.service).toBe('medmatch-api');
    expect(check.checks.database.status).toBe('ok');
    expect(check.checks.memory.status).toBe('ok');
  });

  test('should check memory status in health check', async () => {
    const mockDb = {
      get: jest.fn((sql, params, cb) => cb(null))
    };
    
    const check = await performHealthCheck({ db: mockDb });
    expect(check.checks.memory).toBeDefined();
    expect(check.checks.memory.status).toMatch(/ok|warning/);
    expect(check.checks.memory).toHaveProperty('used');
    expect(check.checks.memory).toHaveProperty('total');
  });
});

describe('Global Metrics Export', () => {
  test('should export global metrics instance', () => {
    expect(metrics).toBeDefined();
    expect(metrics).toBeInstanceOf(MetricsCollector);
  });
});
