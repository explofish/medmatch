/**
 * Request/Response Logging Middleware
 *
 * Provides detailed logging for debugging and monitoring:
 * - Request method, URL, and timestamp
 * - Response time
 * - Error details
 * - Cache hit/miss information
 */

const { performance } = require('perf_hooks');

// Configuration
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'; // debug, info, warn, error
const ENABLE_BODY_LOGGING = process.env.LOG_BODY === 'true';

/**
 * Format timestamp for logging
 */
function formatTimestamp() {
  return new Date().toISOString();
}

/**
 * Colorize log output for console (development only)
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Get color for HTTP method
 */
function getMethodColor(method) {
  switch (method) {
  case 'GET': return colors.green;
  case 'POST': return colors.blue;
  case 'PATCH': return colors.yellow;
  case 'PUT': return colors.yellow;
  case 'DELETE': return colors.red;
  default: return colors.reset;
  }
}

/**
 * Get color for status code
 */
function getStatusColor(statusCode) {
  if (statusCode >= 500) {return colors.red;}
  if (statusCode >= 400) {return colors.yellow;}
  if (statusCode >= 300) {return colors.cyan;}
  if (statusCode >= 200) {return colors.green;}
  return colors.reset;
}

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
  const startTime = performance.now();
  const timestamp = formatTimestamp();

  // Log incoming request
  if (LOG_LEVEL === 'debug') {
    console.log(
      `${colors.dim}[${timestamp}]${colors.reset} ` +
      `${getMethodColor(req.method)}${req.method}${colors.reset} ` +
      `${colors.bright}${req.url}${colors.reset}` +
      `${ENABLE_BODY_LOGGING && req.body ? ` \nBody: ${JSON.stringify(req.body)}` : ''}`
    );
  }

  // Capture original end function
  const originalEnd = res.end.bind(res);

  // Override res.end to log response
  res.end = function (chunk, encoding) {
    // Restore original end and call it
    res.end = originalEnd;
    res.end(chunk, encoding);

    // Calculate response time
    const responseTime = Math.round(performance.now() - startTime);

    // Get status code
    const statusCode = res.statusCode;

    // Get cache info if available
    const cacheStatus = res.get('X-Cache') || 'miss';
    const cacheIndicator = cacheStatus === 'hit'
      ? `${colors.green}[CACHE HIT]${colors.reset}`
      : '';

    // Build log message
    const logMessage =
      `${colors.dim}[${timestamp}]${colors.reset} ` +
      `${getMethodColor(req.method)}${req.method}${colors.reset} ` +
      `${req.url} ` +
      `${getStatusColor(statusCode)}${statusCode}${colors.reset} ` +
      `${colors.dim}${responseTime}ms${colors.reset} ` +
      cacheIndicator;

    // Log based on status code
    if (statusCode >= 500) {
      console.error(`${colors.red}ERROR:${colors.reset} ${logMessage}`);
    } else if (statusCode >= 400) {
      console.warn(`${colors.yellow}WARN:${colors.reset} ${logMessage}`);
    } else {
      console.log(logMessage);
    }
  };

  next();
}

/**
 * Response time header middleware
 * Adds X-Response-Time header to all responses
 */
function responseTime(req, res, next) {
  const startTime = performance.now();

  // Store original json method
  const originalJson = res.json.bind(res);

  // Override res.json to add response time header
  res.json = function (data) {
    const duration = Math.round(performance.now() - startTime);
    res.set('X-Response-Time', `${duration}ms`);
    return originalJson(data);
  };

  next();
}

/**
 * Debug logging utility
 */
function debugLog(message, data) {
  if (LOG_LEVEL === 'debug') {
    console.log(
      `${colors.dim}[DEBUG]${colors.reset} ${message}`,
      data ? JSON.stringify(data, null, 2) : ''
    );
  }
}

/**
 * Error logging utility
 */
function errorLog(message, error) {
  console.error(
    `${colors.red}[ERROR]${colors.reset} ${message}`,
    error ? error.stack || error.message || error : ''
  );
}

/**
 * Info logging utility
 */
function infoLog(message, data) {
  if (LOG_LEVEL === 'info' || LOG_LEVEL === 'debug') {
    console.log(
      `${colors.cyan}[INFO]${colors.reset} ${message}`,
      data || ''
    );
  }
}

module.exports = {
  requestLogger,
  responseTime,
  debugLog,
  errorLog,
  infoLog
};
