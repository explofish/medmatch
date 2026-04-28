/**
 * Performance Monitoring Middleware
 * 
 * Tracks request timing, memory usage, and database query performance.
 * Provides endpoints for health checks and performance metrics.
 */

const os = require('os');

class PerformanceMonitor {
  constructor(options = {}) {
    this.slowQueryThreshold = options.slowQueryThreshold || 200; // ms
    this.slowRequestThreshold = options.slowRequestThreshold || 500; // ms
    this.maxHistorySize = options.maxHistorySize || 1000;
    
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        slow: 0
      },
      responseTime: {
        avg: 0,
        min: Infinity,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0
      },
      database: {
        queries: 0,
        slowQueries: 0,
        avgQueryTime: 0
      },
      memory: [],
      endpoints: new Map()
    };
    
    this.requestHistory = [];
    this.queryHistory = [];
  }

  /**
   * Express middleware for request tracking
   */
  middleware() {
    return (req, res, next) => {
      const startTime = process.hrtime.bigint();
      const startMemory = process.memoryUsage();
      
      // Track request details
      const requestInfo = {
        method: req.method,
        path: req.path,
        query: req.query,
        startTime: Date.now()
      };
      
      // Store original end
      const originalEnd = res.end.bind(res);
      
      res.end = (chunk, encoding) => {
        const endTime = process.hrtime.bigint();
        const endMemory = process.memoryUsage();
        
        // Calculate duration in milliseconds
        const durationMs = Number(endTime - startTime) / 1000000;
        
        // Memory delta
        const memoryDelta = {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external
        };
        
        // Update request metrics
        this.metrics.requests.total++;
        if (res.statusCode >= 200 && res.statusCode < 400) {
          this.metrics.requests.successful++;
        } else {
          this.metrics.requests.failed++;
        }
        
        if (durationMs > this.slowRequestThreshold) {
          this.metrics.requests.slow++;
          console.warn(`Slow request: ${req.method} ${req.path} took ${durationMs.toFixed(2)}ms`);
        }
        
        // Update response time metrics
        this.updateResponseTimeMetrics(durationMs);
        
        // Update endpoint metrics
        this.updateEndpointMetrics(req.method, req.path, durationMs, res.statusCode);
        
        // Add to history
        this.addToHistory({
          ...requestInfo,
          duration: durationMs,
          statusCode: res.statusCode,
          memoryDelta
        });
        
        // Add response timing header
        res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);
        
        return originalEnd(chunk, encoding);
      };
      
      next();
    };
  }

  /**
   * Database query wrapper for tracking
   */
  wrapDatabaseQuery(db) {
    const originalAll = db.all.bind(db);
    const originalGet = db.get.bind(db);
    const originalRun = db.run.bind(db);
    
    const trackQuery = (sql, startTime, err) => {
      const duration = Date.now() - startTime;
      
      this.metrics.database.queries++;
      
      if (duration > this.slowQueryThreshold) {
        this.metrics.database.slowQueries++;
        console.warn(`Slow query (${duration}ms): ${sql.substring(0, 100)}...`);
      }
      
      // Update rolling average
      const currentAvg = this.metrics.database.avgQueryTime;
      const count = this.metrics.database.queries;
      this.metrics.database.avgQueryTime = 
        (currentAvg * (count - 1) + duration) / count;
      
      // Add to query history
      this.queryHistory.push({
        sql: sql.substring(0, 200),
        duration,
        timestamp: Date.now(),
        error: err ? err.message : null
      });
      
      if (this.queryHistory.length > this.maxHistorySize) {
        this.queryHistory.shift();
      }
    };
    
    db.all = (sql, params, callback) => {
      const startTime = Date.now();
      return originalAll(sql, params, (err, rows) => {
        trackQuery(sql, startTime, err);
        callback(err, rows);
      });
    };
    
    db.get = (sql, params, callback) => {
      const startTime = Date.now();
      return originalGet(sql, params, (err, row) => {
        trackQuery(sql, startTime, err);
        callback(err, row);
      });
    };
    
    db.run = (sql, params, callback) => {
      const startTime = Date.now();
      return originalRun(sql, params, function(err) {
        trackQuery(sql, startTime, err);
        callback.call(this, err);
      });
    };
    
    return db;
  }

  /**
   * Update response time statistics
   */
  updateResponseTimeMetrics(duration) {
    const rt = this.metrics.responseTime;
    
    // Update min/max
    rt.min = Math.min(rt.min, duration);
    rt.max = Math.max(rt.max, duration);
    
    // Update rolling average
    const total = this.metrics.requests.total;
    rt.avg = (rt.avg * (total - 1) + duration) / total;
    
    // Calculate percentiles from history
    if (this.requestHistory.length > 0) {
      const times = this.requestHistory.map(r => r.duration).sort((a, b) => a - b);
      rt.p50 = this.calculatePercentile(times, 50);
      rt.p95 = this.calculatePercentile(times, 95);
      rt.p99 = this.calculatePercentile(times, 99);
    }
  }

  /**
   * Calculate percentile from sorted array
   */
  calculatePercentile(sortedArray, percentile) {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Update endpoint-specific metrics
   */
  updateEndpointMetrics(method, path, duration, statusCode) {
    const key = `${method} ${path}`;
    
    if (!this.metrics.endpoints.has(key)) {
      this.metrics.endpoints.set(key, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0,
        statusCodes: new Map()
      });
    }
    
    const ep = this.metrics.endpoints.get(key);
    ep.count++;
    ep.totalTime += duration;
    ep.avgTime = ep.totalTime / ep.count;
    ep.minTime = Math.min(ep.minTime, duration);
    ep.maxTime = Math.max(ep.maxTime, duration);
    
    const statusCount = ep.statusCodes.get(statusCode) || 0;
    ep.statusCodes.set(statusCode, statusCount + 1);
  }

  /**
   * Add to request history
   */
  addToHistory(request) {
    this.requestHistory.push(request);
    
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory.shift();
    }
  }

  /**
   * Get current system metrics
   */
  getSystemMetrics() {
    const usage = process.memoryUsage();
    const loadAvg = os.loadavg();
    
    return {
      timestamp: new Date().toISOString(),
      memory: {
        rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
        external: Math.round(usage.external / 1024 / 1024) + 'MB'
      },
      cpu: {
        loadAvg1m: loadAvg[0].toFixed(2),
        loadAvg5m: loadAvg[1].toFixed(2),
        loadAvg15m: loadAvg[2].toFixed(2)
      },
      uptime: Math.floor(process.uptime()) + 's'
    };
  }

  /**
   * Get full metrics report
   */
  getMetrics() {
    // Convert endpoints map to object
    const endpoints = {};
    this.metrics.endpoints.forEach((value, key) => {
      endpoints[key] = {
        ...value,
        statusCodes: Object.fromEntries(value.statusCodes)
      };
    });
    
    // Get slowest endpoints
    const slowestEndpoints = Object.entries(endpoints)
      .sort((a, b) => b[1].avgTime - a[1].avgTime)
      .slice(0, 10);
    
    return {
      timestamp: new Date().toISOString(),
      system: this.getSystemMetrics(),
      requests: this.metrics.requests,
      responseTime: {
        ...this.metrics.responseTime,
        min: this.metrics.responseTime.min === Infinity ? 0 : this.metrics.responseTime.min
      },
      database: this.metrics.database,
      endpoints: {
        total: this.metrics.endpoints.size,
        slowest: slowestEndpoints,
        all: endpoints
      },
      recentRequests: this.requestHistory.slice(-10),
      recentSlowQueries: this.queryHistory
        .filter(q => q.duration > this.slowQueryThreshold)
        .slice(-10)
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics.requests = { total: 0, successful: 0, failed: 0, slow: 0 };
    this.metrics.responseTime = { avg: 0, min: Infinity, max: 0, p50: 0, p95: 0, p99: 0 };
    this.metrics.database = { queries: 0, slowQueries: 0, avgQueryTime: 0 };
    this.metrics.endpoints.clear();
    this.requestHistory = [];
    this.queryHistory = [];
  }
}

// Singleton instance
const monitor = new PerformanceMonitor();

module.exports = {
  PerformanceMonitor,
  monitor
};
