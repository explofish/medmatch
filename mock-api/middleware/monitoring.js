/**
 * MedMatch Monitoring & Observability Module
 *
 * Provides structured logging, metrics collection, error tracking,
 * and request correlation for the MedMatch API.
 *
 * @module monitoring
 * @version 1.0.0
 */

const { v4: uuidv4 } = require('uuid');
const os = require('os');

// =============================================================================
// METRICS COLLECTION
// =============================================================================

/**
 * In-memory metrics store for development environments.
 * In production, this would be replaced with Prometheus or similar.
 */
class MetricsCollector {
  constructor() {
    this.startTime = Date.now();
    this.requestCounts = new Map();
    this.responseTimes = new Map();
    this.errorCounts = new Map();
    this.businessMetrics = new Map();
    this.activeConnections = 0;
    this.totalRequests = 0;
    this.totalErrors = 0;
  }

  /**
   * Record an API request
   * @param {string} method - HTTP method
   * @param {string} path - Request path
   * @param {number} statusCode - Response status code
   * @param {number} duration - Response time in milliseconds
   * @param {string} errorType - Error type if request failed
   */
  recordRequest(method, path, statusCode, duration, errorType = null) {
    const key = `${method}:${path}`;
    const statusKey = `${method}:${path}:${statusCode}`;

    // Increment request count
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);
    this.totalRequests++;

    // Record response time
    if (!this.responseTimes.has(key)) {
      this.responseTimes.set(key, []);
    }
    const times = this.responseTimes.get(key);
    times.push(duration);
    // Keep last 1000 measurements for rolling average
    if (times.length > 1000) {
      times.shift();
    }

    // Record errors
    if (statusCode >= 400 || errorType) {
      this.totalErrors++;
      const errorKey = errorType || `http_${statusCode}`;
      this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
    }
  }

  /**
   * Record a business metric
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   * @param {Object} labels - Additional labels
   */
  recordBusinessMetric(name, value, labels = {}) {
    const key = `${name}:${JSON.stringify(labels)}`;
    if (!this.businessMetrics.has(name)) {
      this.businessMetrics.set(name, []);
    }
    const metrics = this.businessMetrics.get(name);
    metrics.push({ value, timestamp: Date.now(), labels });
    // Keep last 10000 measurements
    if (metrics.length > 10000) {
      metrics.shift();
    }
  }

  /**
   * Increment active connections counter
   */
  incrementActiveConnections() {
    this.activeConnections++;
  }

  /**
   * Decrement active connections counter
   */
  decrementActiveConnections() {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  /**
   * Get current metrics snapshot
   * @returns {Object} Metrics data
   */
  getMetrics() {
    const now = Date.now();
    const uptime = now - this.startTime;

    // Calculate average response times
    const avgResponseTimes = {};
    for (const [key, times] of this.responseTimes) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const p95 = this.calculatePercentile(times, 0.95);
      const p99 = this.calculatePercentile(times, 0.99);
      avgResponseTimes[key] = {
        avg: Math.round(avg * 100) / 100,
        p95: Math.round(p95 * 100) / 100,
        p99: Math.round(p99 * 100) / 100,
        count: times.length
      };
    }

    // Get request rates (requests per minute)
    const requestRate = (this.totalRequests / (uptime / 60000)).toFixed(2);
    const errorRate = this.totalRequests > 0
      ? ((this.totalErrors / this.totalRequests) * 100).toFixed(2)
      : 0;

    return {
      uptime,
      uptimeFormatted: this.formatDuration(uptime),
      activeConnections: this.activeConnections,
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      requestRate: parseFloat(requestRate),
      errorRate: parseFloat(errorRate),
      requestCounts: Object.fromEntries(this.requestCounts),
      responseTimes: avgResponseTimes,
      errorCounts: Object.fromEntries(this.errorCounts),
      businessMetrics: this.getBusinessMetricsSummary(),
      system: {
        memory: this.getMemoryUsage(),
        cpu: os.loadavg(),
        hostname: os.hostname()
      }
    };
  }

  /**
   * Get business metrics summary
   * @returns {Object} Business metrics
   */
  getBusinessMetricsSummary() {
    const summary = {};
    for (const [name, metrics] of this.businessMetrics) {
      const values = metrics.map(m => m.value);
      summary[name] = {
        total: values.reduce((a, b) => a + b, 0),
        count: values.length,
        avg: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
        last24h: metrics.filter(m => m.timestamp > Date.now() - 86400000).length
      };
    }
    return summary;
  }

  /**
   * Calculate percentile from array of values
   * @param {number[]} arr - Array of values
   * @param {number} percentile - Percentile (0-1)
   * @returns {number} Percentile value
   */
  calculatePercentile(arr, percentile) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Format duration in human-readable format
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {return `${days}d ${hours % 24}h ${minutes % 60}m`;}
    if (hours > 0) {return `${hours}h ${minutes % 60}m ${seconds % 60}s`;}
    if (minutes > 0) {return `${minutes}m ${seconds % 60}s`;}
    return `${seconds}s`;
  }

  /**
   * Get memory usage statistics
   * @returns {Object} Memory usage
   */
  getMemoryUsage() {
    const used = process.memoryUsage();
    return {
      rss: Math.round(used.rss / 1024 / 1024 * 100) / 100, // MB
      heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100, // MB
      heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100, // MB
      external: Math.round(used.external / 1024 / 1024 * 100) / 100, // MB
      systemTotal: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100, // GB
      systemFree: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100 // GB
    };
  }

  /**
   * Generate Prometheus-compatible metrics text
   * @returns {string} Prometheus metrics
   */
  toPrometheusFormat() {
    const lines = [];
    const metrics = this.getMetrics();

    // Uptime
    lines.push('# HELP medmatch_api_uptime_seconds API uptime in seconds');
    lines.push('# TYPE medmatch_api_uptime_seconds counter');
    lines.push(`medmatch_api_uptime_seconds ${Math.floor(metrics.uptime / 1000)}`);

    // Active connections
    lines.push('# HELP medmatch_api_active_connections Current active connections');
    lines.push('# TYPE medmatch_api_active_connections gauge');
    lines.push(`medmatch_api_active_connections ${metrics.activeConnections}`);

    // Total requests
    lines.push('# HELP medmatch_api_requests_total Total number of requests');
    lines.push('# TYPE medmatch_api_requests_total counter');
    lines.push(`medmatch_api_requests_total ${metrics.totalRequests}`);

    // Request rate
    lines.push('# HELP medmatch_api_requests_per_minute Request rate per minute');
    lines.push('# TYPE medmatch_api_requests_per_minute gauge');
    lines.push(`medmatch_api_requests_per_minute ${metrics.requestRate}`);

    // Error rate
    lines.push('# HELP medmatch_api_error_rate_percentage Error rate percentage');
    lines.push('# TYPE medmatch_api_error_rate_percentage gauge');
    lines.push(`medmatch_api_error_rate_percentage ${metrics.errorRate}`);

    // Memory usage
    lines.push('# HELP medmatch_api_memory_heap_used_mb Heap memory used in MB');
    lines.push('# TYPE medmatch_api_memory_heap_used_mb gauge');
    lines.push(`medmatch_api_memory_heap_used_mb ${metrics.system.memory.heapUsed}`);

    // Response times by endpoint
    lines.push('# HELP medmatch_api_response_time_ms Response time in milliseconds');
    lines.push('# TYPE medmatch_api_response_time_ms summary');
    for (const [key, times] of Object.entries(metrics.responseTimes)) {
      const [method, path] = key.split(':');
      lines.push(`medmatch_api_response_time_ms{method="${method}",path="${path}",quantile="0.95"} ${times.p95}`);
      lines.push(`medmatch_api_response_time_ms{method="${method}",path="${path}",quantile="0.99"} ${times.p99}`);
    }

    // Error counts by type
    lines.push('# HELP medmatch_api_errors_total Total errors by type');
    lines.push('# TYPE medmatch_api_errors_total counter');
    for (const [errorType, count] of Object.entries(metrics.errorCounts)) {
      lines.push(`medmatch_api_errors_total{type="${errorType}"} ${count}`);
    }

    return lines.join('\n');
  }
}

// Global metrics instance
const metrics = new MetricsCollector();

// =============================================================================
// STRUCTURED LOGGING
// =============================================================================

/**
 * Log levels in order of severity
 */
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
};

/**
 * Current log level from environment or default to INFO
 */
const CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

/**
 * Create a structured log entry
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 * @returns {Object} Structured log entry
 */
function createLogEntry(level, message, context = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: 'medmatch-api',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    ...context
  };
}

/**
 * Output log entry as JSON
 * @param {Object} entry - Log entry
 */
function outputLog(entry) {
  if (LOG_LEVELS[entry.level] < CURRENT_LOG_LEVEL) {return;}

  if (process.env.LOG_FORMAT === 'pretty') {
    // Pretty print for development
    const colors = {
      DEBUG: '\x1b[36m', // Cyan
      INFO: '\x1b[32m',  // Green
      WARN: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m', // Red
      FATAL: '\x1b[35m', // Magenta
      RESET: '\x1b[0m'
    };
    const color = colors[entry.level] || colors.RESET;
    console.log(`${color}[${entry.timestamp}] ${entry.level}: ${entry.message}${colors.RESET}`);
    if (entry.error) {
      console.log(`${color}  Error: ${entry.error}${colors.RESET}`);
    }
    if (entry.requestId) {
      console.log(`${color}  Request ID: ${entry.requestId}${colors.RESET}`);
    }
  } else {
    // JSON format for production / structured logging
    console.log(JSON.stringify(entry));
  }
}

/**
 * Logger interface
 */
const logger = {
  debug: (message, context) => outputLog(createLogEntry('DEBUG', message, context)),
  info: (message, context) => outputLog(createLogEntry('INFO', message, context)),
  warn: (message, context) => outputLog(createLogEntry('WARN', message, context)),
  error: (message, context) => outputLog(createLogEntry('ERROR', message, context)),
  fatal: (message, context) => outputLog(createLogEntry('FATAL', message, context))
};

// =============================================================================
// REQUEST CONTEXT / CORRELATION ID
// =============================================================================

/**
 * AsyncLocalStorage for request context propagation
 * Note: Requires Node.js 14.8+ or 16.0+
 */
let asyncLocalStorage;
try {
  const { AsyncLocalStorage } = require('async_hooks');
  asyncLocalStorage = new AsyncLocalStorage();
} catch (e) {
  // Fallback for older Node versions
  asyncLocalStorage = null;
}

/**
 * Store request context
 * @param {string} requestId - Request correlation ID
 * @param {Function} callback - Function to run in context
 */
function runWithContext(requestId, callback) {
  if (asyncLocalStorage) {
    asyncLocalStorage.run({ requestId }, callback);
  } else {
    // Fallback: attach to domain or global (not ideal but functional)
    process.domain = process.domain || {};
    process.domain.requestId = requestId;
    callback();
  }
}

/**
 * Get current request context
 * @returns {Object} Current context
 */
function getContext() {
  if (asyncLocalStorage) {
    return asyncLocalStorage.getStore() || {};
  }
  return process.domain || {};
}

/**
 * Get current request ID
 * @returns {string|null} Request ID
 */
function getRequestId() {
  return getContext().requestId || null;
}

// =============================================================================
// ERROR CLASSIFICATION
// =============================================================================

/**
 * Error types for classification
 */
const ERROR_TYPES = {
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  RATE_LIMIT: 'rate_limit',
  DATABASE: 'database',
  EXTERNAL: 'external',
  SERVER: 'server',
  UNKNOWN: 'unknown'
};

/**
 * HTTP status code to error type mapping
 */
const STATUS_TO_ERROR_TYPE = {
  400: ERROR_TYPES.VALIDATION,
  401: ERROR_TYPES.AUTHENTICATION,
  403: ERROR_TYPES.AUTHORIZATION,
  404: ERROR_TYPES.NOT_FOUND,
  409: ERROR_TYPES.CONFLICT,
  429: ERROR_TYPES.RATE_LIMIT,
  500: ERROR_TYPES.SERVER,
  502: ERROR_TYPES.EXTERNAL,
  503: ERROR_TYPES.EXTERNAL,
  504: ERROR_TYPES.EXTERNAL
};

/**
 * Classify an error based on status code or error properties
 * @param {Error} error - Error object
 * @param {number} statusCode - HTTP status code
 * @returns {string} Error type
 */
function classifyError(error, statusCode = 500) {
  // Check for specific error types
  if (error.name === 'ValidationError') {return ERROR_TYPES.VALIDATION;}
  if (error.name === 'UnauthorizedError') {return ERROR_TYPES.AUTHENTICATION;}
  if (error.name === 'ForbiddenError') {return ERROR_TYPES.AUTHORIZATION;}
  if (error.code === 'SQLITE_ERROR' || error.code === 'SQLITE_CONSTRAINT') {
    return ERROR_TYPES.DATABASE;
  }
  if (error.code?.startsWith('ECONN')) {return ERROR_TYPES.EXTERNAL;}
  if (error.code === 'ETIMEDOUT') {return ERROR_TYPES.EXTERNAL;}

  // Fallback to status code mapping
  return STATUS_TO_ERROR_TYPE[statusCode] || ERROR_TYPES.UNKNOWN;
}

// =============================================================================
// EXPRESS MIDDLEWARE
// =============================================================================

/**
 * Request ID middleware - adds correlation ID to each request
 * @param {Object} options - Options
 * @returns {Function} Express middleware
 */
function requestIdMiddleware(options = {}) {
  const { headerName = 'x-request-id', generateId = uuidv4 } = options;

  return (req, res, next) => {
    // Get request ID from header or generate new one
    const requestId = req.headers[headerName.toLowerCase()] || generateId();

    // Attach to request and response
    req.requestId = requestId;
    res.setHeader(headerName, requestId);

    // Run in async context if available
    runWithContext(requestId, next);
  };
}

/**
 * Logging middleware - logs all requests with structured format
 * @param {Object} options - Options
 * @returns {Function} Express middleware
 */
function loggingMiddleware(options = {}) {
  const { skipPaths = ['/health', '/metrics', '/dashboard'] } = options;

  return (req, res, next) => {
    const startTime = Date.now();
    const requestId = req.requestId || getRequestId() || 'unknown';

    // Skip logging for health checks and metrics
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Log request start
    logger.info('Request started', {
      requestId,
      method: req.method,
      path: req.path,
      query: req.query,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress
    });

    // Capture response finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const isError = res.statusCode >= 400;

      const logContext = {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        contentLength: res.getHeader('content-length')
      };

      if (isError) {
        logger.warn('Request completed', logContext);
      } else {
        logger.info('Request completed', logContext);
      }
    });

    next();
  };
}

/**
 * Metrics middleware - collects request metrics
 * @returns {Function} Express middleware
 */
function metricsMiddleware() {
  return (req, res, next) => {
    const startTime = Date.now();

    metrics.incrementActiveConnections();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const errorType = res.statusCode >= 400 ? classifyError(new Error(), res.statusCode) : null;

      metrics.recordRequest(req.method, req.route?.path || req.path, res.statusCode, duration, errorType);
      metrics.decrementActiveConnections();
    });

    next();
  };
}

/**
 * Error tracking middleware - centralizes error handling
 * @param {Object} options - Options
 * @returns {Function} Express middleware
 */
function errorTrackingMiddleware(options = {}) {
  const { includeStack = process.env.NODE_ENV !== 'production' } = options;

  return (err, req, res, next) => {
    const requestId = req.requestId || getRequestId() || 'unknown';
    const statusCode = err.statusCode || err.status || 500;
    const errorType = classifyError(err, statusCode);

    // Log the error
    logger.error('Request error', {
      requestId,
      errorType,
      statusCode,
      message: err.message,
      stack: includeStack ? err.stack : undefined,
      method: req.method,
      path: req.path
    });

    // Record business metric for errors
    metrics.recordBusinessMetric('errors', 1, { type: errorType, statusCode: statusCode.toString() });

    // Send standardized error response
    const errorResponse = {
      error: {
        type: errorType,
        message: process.env.NODE_ENV === 'production' && statusCode >= 500
          ? 'Internal server error'
          : err.message,
        requestId,
        timestamp: new Date().toISOString()
      }
    };

    if (includeStack && err.stack) {
      errorResponse.error.stack = err.stack;
    }

    res.status(statusCode).json(errorResponse);
  };
}

/**
 * Async handler wrapper for catching async errors
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped handler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * Perform deep health check
 * @param {Object} dependencies - Dependencies to check (e.g., db)
 * @returns {Promise<Object>} Health check result
 */
async function performHealthCheck(dependencies = {}) {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'ok',
    service: 'medmatch-api',
    uptime: metrics.getMetrics().uptime,
    version: process.env.npm_package_version || '1.0.0',
    checks: {}
  };

  // Check database connectivity
  if (dependencies.db) {
    try {
      await new Promise((resolve, reject) => {
        dependencies.db.get('SELECT 1', [], (err) => {
          if (err) {reject(err);}
          else {resolve();}
        });
      });
      checks.checks.database = { status: 'ok', responseTime: 'N/A' };
    } catch (err) {
      checks.checks.database = { status: 'error', message: err.message };
      checks.status = 'degraded';
    }
  }

  // Memory check
  const memUsage = process.memoryUsage();
  const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  if (heapUsedPercent > 90) {
    checks.checks.memory = {
      status: 'warning',
      message: `Heap memory usage at ${heapUsedPercent.toFixed(1)}%`,
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024)
    };
    if (checks.status === 'ok') {checks.status = 'warning';}
  } else {
    checks.checks.memory = {
      status: 'ok',
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024)
    };
  }

  return checks;
}

/**
 * Simple liveness check - is the process running?
 * @returns {Object} Liveness status
 */
function performLivenessCheck() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString()
  };
}

/**
 * Readiness check - is the service ready to accept traffic?
 * @param {Object} dependencies - Dependencies to check
 * @returns {Promise<Object>} Readiness status
 */
async function performReadinessCheck(dependencies = {}) {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'ready',
    checks: {}
  };

  // Database readiness
  if (dependencies.db) {
    try {
      await new Promise((resolve, reject) => {
        dependencies.db.get('SELECT 1', [], (err) => {
          if (err) {reject(err);}
          else {resolve();}
        });
      });
      checks.checks.database = { status: 'ready' };
    } catch (err) {
      checks.checks.database = { status: 'not_ready', message: err.message };
      checks.status = 'not_ready';
    }
  }

  return checks;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Metrics
  metrics,
  MetricsCollector,

  // Logging
  logger,
  LOG_LEVELS,
  createLogEntry,

  // Context/Correlation
  runWithContext,
  getContext,
  getRequestId,

  // Error handling
  ERROR_TYPES,
  classifyError,

  // Middleware
  requestIdMiddleware,
  loggingMiddleware,
  metricsMiddleware,
  errorTrackingMiddleware,
  asyncHandler,

  // Health checks
  performHealthCheck,
  performLivenessCheck,
  performReadinessCheck
};
