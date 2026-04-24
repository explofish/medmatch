/**
 * Error Handling Middleware
 *
 * Provides standardized error handling across the API:
 * - Consistent error response format
 * - Detailed error messages in development
 * - Sanitized errors in production
 * - Error tracking and logging
 */

const { errorLog } = require('./logging');

// Environment check
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

/**
 * Standardized error response format
 */
class ApiError extends Error {
  constructor(message, statusCode, code = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || `ERR_${statusCode}`;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true; // Distinguishes operational errors from programming errors

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error types
 */
const ErrorTypes = {
  BAD_REQUEST: (message = 'Bad request', details = null) =>
    new ApiError(message, 400, 'ERR_BAD_REQUEST', details),

  UNAUTHORIZED: (message = 'Unauthorized') =>
    new ApiError(message, 401, 'ERR_UNAUTHORIZED'),

  FORBIDDEN: (message = 'Forbidden') =>
    new ApiError(message, 403, 'ERR_FORBIDDEN'),

  NOT_FOUND: (resource = 'Resource') =>
    new ApiError(`${resource} not found`, 404, 'ERR_NOT_FOUND'),

  CONFLICT: (message = 'Conflict', details = null) =>
    new ApiError(message, 409, 'ERR_CONFLICT', details),

  VALIDATION_ERROR: (message = 'Validation failed', errors = null) =>
    new ApiError(message, 422, 'ERR_VALIDATION', errors),

  RATE_LIMIT: (message = 'Too many requests') =>
    new ApiError(message, 429, 'ERR_RATE_LIMIT'),

  INTERNAL_ERROR: (message = 'Internal server error') =>
    new ApiError(message, 500, 'ERR_INTERNAL'),

  SERVICE_UNAVAILABLE: (message = 'Service temporarily unavailable') =>
    new ApiError(message, 503, 'ERR_SERVICE_UNAVAILABLE')
};

/**
 * Format error for response
 */
function formatErrorResponse(err) {
  const response = {
    error: {
      message: err.message,
      code: err.code,
      status: err.statusCode,
      timestamp: err.timestamp || new Date().toISOString()
    }
  };

  // Add details if available
  if (err.details) {
    response.error.details = err.details;
  }

  // Add stack trace in development only
  if (isDevelopment && err.stack) {
    response.error.stack = err.stack.split('\n');
  }

  return response;
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res, next) {
  const err = ErrorTypes.NOT_FOUND('Endpoint');
  err.message = `Cannot ${req.method} ${req.path}`;
  next(err);
}

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, _next) {
  // Log error
  errorLog(`Error processing ${req.method} ${req.url}`, err);

  // Default to 500 if no status code set
  const statusCode = err.statusCode || err.status || 500;

  // Handle specific error types
  if (err.message && err.message.includes('UNIQUE constraint failed')) {
    const error = ErrorTypes.CONFLICT('Resource already exists');
    return res.status(409).json(formatErrorResponse(error));
  }

  if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
    const error = ErrorTypes.BAD_REQUEST('Referenced resource does not exist');
    return res.status(400).json(formatErrorResponse(error));
  }

  if (err.message && err.message.includes('SQLITE_ERROR')) {
    const error = isDevelopment
      ? ErrorTypes.INTERNAL_ERROR(`Database error: ${err.message}`)
      : ErrorTypes.INTERNAL_ERROR();
    return res.status(500).json(formatErrorResponse(error));
  }

  // Convert standard errors to ApiError format
  if (!(err instanceof ApiError)) {
    if (statusCode === 404) {
      err = ErrorTypes.NOT_FOUND();
    } else if (statusCode === 400) {
      err = ErrorTypes.BAD_REQUEST(err.message);
    } else if (statusCode === 401) {
      err = ErrorTypes.UNAUTHORIZED();
    } else if (statusCode === 403) {
      err = ErrorTypes.FORBIDDEN();
    } else {
      err = isDevelopment
        ? ErrorTypes.INTERNAL_ERROR(err.message)
        : ErrorTypes.INTERNAL_ERROR();
    }
  }

  // Send response
  res.status(statusCode).json(formatErrorResponse(err));
}

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors and pass them to error handler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Database error handler helper
 */
function handleDatabaseError(err, operation = 'database operation') {
  if (err.message && err.message.includes('UNIQUE constraint failed')) {
    return ErrorTypes.CONFLICT('Resource already exists');
  }

  if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
    return ErrorTypes.BAD_REQUEST('Referenced resource does not exist');
  }

  errorLog(`Database error during ${operation}`, err);
  return ErrorTypes.INTERNAL_ERROR('Database operation failed');
}

module.exports = {
  ApiError,
  ErrorTypes,
  notFoundHandler,
  errorHandler,
  asyncHandler,
  handleDatabaseError,
  formatErrorResponse
};
