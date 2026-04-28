/**
 * Authentication Middleware
 * 
 * Provides API key-based authentication for admin endpoints.
 * 
 * @module middleware/auth
 * @version 1.0.0
 */

/**
 * Express middleware to require API key authentication
 * @param {Object} options - Middleware options
 * @param {string} options.header - Header name to check (default: 'x-api-key')
 * @param {string} options.envVar - Environment variable containing the API key (default: 'AUTH_API_KEY')
 * @returns {Function} Express middleware function
 */
function requireAuth(options = {}) {
  const headerName = options.header || 'x-api-key';
  const envVarName = options.envVar || 'AUTH_API_KEY';
  const validApiKey = process.env[envVarName];

  return (req, res, next) => {
    // Skip auth if no API key is configured (development mode warning)
    if (!validApiKey) {
      console.warn(`[AUTH] Warning: ${envVarName} not set. Admin endpoints are unprotected!`);
      // In production, block access if no API key is set
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({
          error: 'Authentication not configured',
          message: 'Server misconfiguration: API key not set'
        });
      }
      // In development, allow but warn
      req.auth = { skipAuth: true, reason: 'API_KEY_NOT_SET' };
      return next();
    }

    // Get API key from header
    const providedKey = req.headers[headerName.toLowerCase()] || req.headers[headerName];

    if (!providedKey) {
      return res.status(401).json({
        error: 'Authentication required',
        message: `Missing ${headerName} header`
      });
    }

    // Constant-time comparison to prevent timing attacks
    if (!constantTimeCompare(providedKey, validApiKey)) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid API key'
      });
    }

    // Attach auth info to request
    req.auth = {
      authenticated: true,
      timestamp: new Date().toISOString()
    };

    next();
  };
}

/**
 * Constant-time string comparison to prevent timing attacks
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} True if strings are equal
 */
function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Optional auth middleware - attaches auth info if present, but doesn't require it
 * @param {Object} options - Middleware options
 * @returns {Function} Express middleware function
 */
function optionalAuth(options = {}) {
  const headerName = options.header || 'x-api-key';
  const envVarName = options.envVar || 'AUTH_API_KEY';
  const validApiKey = process.env[envVarName];

  return (req, res, next) => {
    const providedKey = req.headers[headerName.toLowerCase()] || req.headers[headerName];

    if (validApiKey && providedKey && constantTimeCompare(providedKey, validApiKey)) {
      req.auth = {
        authenticated: true,
        timestamp: new Date().toISOString()
      };
    } else {
      req.auth = { authenticated: false };
    }

    next();
  };
}

/**
 * Generate a secure random API key
 * @param {number} length - Key length (default: 32)
 * @returns {string} Generated API key
 */
function generateApiKey(length = 32) {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('base64');
}

module.exports = {
  requireAuth,
  optionalAuth,
  generateApiKey,
  constantTimeCompare
};
