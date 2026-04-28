/**
 * Performance Monitoring Middleware Tests
 * 
 * @jest-environment node
 */

const { PerformanceMonitor, monitor } = require('./performance');

describe('PerformanceMonitor', () => {
  let perf;

  beforeEach(() => {
    perf = new PerformanceMonitor({
      slowQueryThreshold: 50,
      slowRequestThreshold: 100,
      maxHistorySize: 100
    });
  });

  afterEach(() => {
    perf.reset();
  });

  describe('Constructor', () => {
    test('should create with default options', () => {
      const defaultPerf = new PerformanceMonitor();
      expect(defaultPerf.slowQueryThreshold).toBe(200);
      expect(defaultPerf.slowRequestThreshold).toBe(500);
      expect(defaultPerf.maxHistorySize).toBe(1000);
    });

    test('should create with custom options', () => {
      expect(perf.slowQueryThreshold).toBe(50);
      expect(perf.slowRequestThreshold).toBe(100);
      expect(perf.maxHistorySize).toBe(100);
    });
  });

  describe('Middleware', () => {
    test('should create middleware function', () => {
      const middleware = perf.middleware();
      expect(typeof middleware).toBe('function');
    });

    test('middleware should track request metrics', (done) => {
      const middleware = perf.middleware();
      const req = { method: 'GET', path: '/api/test', query: {} };
      const res = {
        statusCode: 200,
        setHeader: jest.fn(),
        end: jest.fn()
      };
      
      // Mock res.end
      const originalEnd = jest.fn();
      res.end = function(chunk, encoding) {
        // Check metrics were updated
        expect(perf.metrics.requests.total).toBe(1);
        expect(perf.metrics.requests.successful).toBe(1);
        expect(res.setHeader).toHaveBeenCalledWith(
          'X-Response-Time',
          expect.stringMatching(/\d+\.\d{2}ms/)
        );
        done();
      };
      
      middleware(req, res, () => {
        // Simulate response completion
        res.end();
      });
    });

    test('middleware should track failed requests', (done) => {
      const middleware = perf.middleware();
      const req = { method: 'GET', path: '/api/test', query: {} };
      const res = {
        statusCode: 500,
        setHeader: jest.fn(),
        end: jest.fn()
      };
      
      res.end = function() {
        expect(perf.metrics.requests.total).toBe(1);
        expect(perf.metrics.requests.failed).toBe(1);
        done();
      };
      
      middleware(req, res, () => {
        res.end();
      });
    });
  });

  describe('Database Wrapping', () => {
    test('should wrapDatabaseQuery method exists', () => {
      expect(typeof perf.wrapDatabaseQuery).toBe('function');
    });
  });

  describe('Metrics Calculation', () => {
    test('should update response time metrics', () => {
      // Need to simulate request being recorded first for avg calculation
      perf.metrics.requests.total = 1;
      perf.updateResponseTimeMetrics(100);
      expect(perf.metrics.responseTime.avg).toBe(100);
      expect(perf.metrics.responseTime.min).toBe(100);
      expect(perf.metrics.responseTime.max).toBe(100);
    });

    test('should calculate percentiles', () => {
      perf.requestHistory = [
        { duration: 10 },
        { duration: 20 },
        { duration: 30 },
        { duration: 40 },
        { duration: 50 }
      ];
      
      const sorted = [10, 20, 30, 40, 50];
      expect(perf.calculatePercentile(sorted, 50)).toBe(30);
      expect(perf.calculatePercentile(sorted, 95)).toBe(50);
    });

    test('should update endpoint metrics', () => {
      perf.updateEndpointMetrics('GET', '/api/users', 100, 200);
      perf.updateEndpointMetrics('GET', '/api/users', 200, 200);
      
      const key = 'GET /api/users';
      expect(perf.metrics.endpoints.has(key)).toBe(true);
      
      const ep = perf.metrics.endpoints.get(key);
      expect(ep.count).toBe(2);
      expect(ep.avgTime).toBe(150);
      expect(ep.minTime).toBe(100);
      expect(ep.maxTime).toBe(200);
    });
  });

  describe('System Metrics', () => {
    test('should get system metrics', () => {
      const sys = perf.getSystemMetrics();
      expect(sys).toHaveProperty('timestamp');
      expect(sys).toHaveProperty('memory');
      expect(sys).toHaveProperty('cpu');
      expect(sys).toHaveProperty('uptime');
      expect(sys.memory).toHaveProperty('rss');
      expect(sys.memory).toHaveProperty('heapTotal');
      expect(sys.memory).toHaveProperty('heapUsed');
    });
  });

  describe('Full Metrics Report', () => {
    test('should get full metrics', () => {
      perf.updateEndpointMetrics('GET', '/api/test', 50, 200);
      
      const report = perf.getMetrics();
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('system');
      expect(report).toHaveProperty('requests');
      expect(report).toHaveProperty('responseTime');
      expect(report).toHaveProperty('database');
      expect(report).toHaveProperty('endpoints');
      expect(report.endpoints.total).toBe(1);
    });

    test('should handle infinity min value', () => {
      // No requests made, min is still Infinity
      const report = perf.getMetrics();
      expect(report.responseTime.min).toBe(0);
    });

    test('should include slowest endpoints', () => {
      perf.updateEndpointMetrics('GET', '/fast', 10, 200);
      perf.updateEndpointMetrics('GET', '/slow', 100, 200);
      
      const report = perf.getMetrics();
      expect(report.endpoints.slowest.length).toBeGreaterThan(0);
      expect(report.endpoints.slowest[0][0]).toBe('GET /slow');
    });
  });

  describe('Reset', () => {
    test('should reset all metrics', () => {
      perf.metrics.requests.total = 10;
      perf.metrics.requests.successful = 8;
      perf.metrics.requests.failed = 2;
      perf.metrics.endpoints.set('test', { count: 5 });
      perf.requestHistory.push({ duration: 100 });
      
      perf.reset();
      
      expect(perf.metrics.requests.total).toBe(0);
      expect(perf.metrics.requests.successful).toBe(0);
      expect(perf.metrics.requests.failed).toBe(0);
      expect(perf.metrics.endpoints.size).toBe(0);
      expect(perf.requestHistory.length).toBe(0);
    });
  });
});

describe('Global Monitor Export', () => {
  test('should export global monitor instance', () => {
    expect(monitor).toBeDefined();
    expect(monitor).toBeInstanceOf(PerformanceMonitor);
  });
});
