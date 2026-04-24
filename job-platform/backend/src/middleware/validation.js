/**
 * Input Validation Middleware
 *
 * Provides centralized input validation for API endpoints:
 * - Request body validation
 * - Query parameter validation
 * - URL parameter validation
 * - Type checking and sanitization
 */

const { ErrorTypes } = require('./errorHandler');

/**
 * Validation rules
 */
const validators = {
  /**
   * Check if value is a non-empty string
   */
  string: (value, field) => {
    if (typeof value !== 'string') {
      return `${field} must be a string`;
    }
    if (value.trim().length === 0) {
      return `${field} cannot be empty`;
    }
    return null;
  },

  /**
   * Check if value is a valid email
   */
  email: (value, field) => {
    if (typeof value !== 'string') {
      return `${field} must be a string`;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return `${field} must be a valid email address`;
    }
    return null;
  },

  /**
   * Check if value is a positive integer
   */
  integer: (value, field, options = {}) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      return `${field} must be a valid integer`;
    }
    if (options.min !== undefined && num < options.min) {
      return `${field} must be at least ${options.min}`;
    }
    if (options.max !== undefined && num > options.max) {
      return `${field} must be at most ${options.max}`;
    }
    return null;
  },

  /**
   * Check if value is a valid number
   */
  number: (value, field, options = {}) => {
    const num = Number(value);
    if (isNaN(num)) {
      return `${field} must be a valid number`;
    }
    if (options.min !== undefined && num < options.min) {
      return `${field} must be at least ${options.min}`;
    }
    if (options.max !== undefined && num > options.max) {
      return `${field} must be at most ${options.max}`;
    }
    return null;
  },

  /**
   * Check if value is one of allowed values
   */
  enum: (value, field, allowedValues) => {
    if (!allowedValues.includes(value)) {
      return `${field} must be one of: ${allowedValues.join(', ')}`;
    }
    return null;
  },

  /**
   * Check if value is a valid date string
   */
  date: (value, field) => {
    if (typeof value !== 'string') {
      return `${field} must be a valid date string`;
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return `${field} must be a valid date`;
    }
    return null;
  },

  /**
   * Check if value is a valid URL
   */
  url: (value, field) => {
    if (typeof value !== 'string') {
      return `${field} must be a string`;
    }
    try {
      new URL(value);
      return null;
    } catch {
      return `${field} must be a valid URL`;
    }
  },

  /**
   * Check if value matches regex pattern
   */
  pattern: (value, field, regex, message) => {
    if (typeof value !== 'string') {
      return `${field} must be a string`;
    }
    if (!regex.test(value)) {
      return message || `${field} format is invalid`;
    }
    return null;
  },

  /**
   * Check if value is an array
   */
  array: (value, field, options = {}) => {
    if (!Array.isArray(value)) {
      return `${field} must be an array`;
    }
    if (options.minLength !== undefined && value.length < options.minLength) {
      return `${field} must have at least ${options.minLength} items`;
    }
    if (options.maxLength !== undefined && value.length > options.maxLength) {
      return `${field} must have at most ${options.maxLength} items`;
    }
    return null;
  },

  /**
   * Check if value is a boolean
   */
  boolean: (value, field) => {
    if (typeof value !== 'boolean' && value !== 'true' && value !== 'false' &&
        value !== 0 && value !== 1 && value !== '0' && value !== '1') {
      return `${field} must be a boolean`;
    }
    return null;
  }
};

/**
 * Run validation rules on data
 */
function runValidation(data, rules) {
  const errors = {};

  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = data[field];

    // Skip validation if value is undefined and field is not required
    if (value === undefined && !fieldRules.required) {
      continue;
    }

    // Check required
    if (fieldRules.required && (value === undefined || value === null || value === '')) {
      errors[field] = `${fieldRules.label || field} is required`;
      continue;
    }

    // Skip further validation if value is undefined
    if (value === undefined) {
      continue;
    }

    // Run validators
    const validations = Array.isArray(fieldRules.validate)
      ? fieldRules.validate
      : [fieldRules.validate];

    for (const validation of validations) {
      if (!validation) {continue;}

      let error = null;

      if (typeof validation === 'string') {
        // Simple type validation
        if (validators[validation]) {
          error = validators[validation](value, fieldRules.label || field);
        }
      } else if (typeof validation === 'function') {
        // Custom validation function
        error = validation(value, fieldRules.label || field);
      } else if (typeof validation === 'object') {
        // Complex validation with options
        const { type, options } = validation;
        if (validators[type]) {
          error = validators[type](value, fieldRules.label || field, options);
        }
      }

      if (error) {
        errors[field] = error;
        break; // Stop on first error for this field
      }
    }
  }

  return errors;
}

/**
 * Create validation middleware
 */
function validate(rules) {
  return (req, res, next) => {
    // Validate body, query, and params based on rules
    const allErrors = {};

    if (rules.body) {
      const bodyErrors = runValidation(req.body, rules.body);
      if (Object.keys(bodyErrors).length > 0) {
        allErrors.body = bodyErrors;
      }
    }

    if (rules.query) {
      const queryErrors = runValidation(req.query, rules.query);
      if (Object.keys(queryErrors).length > 0) {
        allErrors.query = queryErrors;
      }
    }

    if (rules.params) {
      const paramsErrors = runValidation(req.params, rules.params);
      if (Object.keys(paramsErrors).length > 0) {
        allErrors.params = paramsErrors;
      }
    }

    // If there are errors, return validation error response
    if (Object.keys(allErrors).length > 0) {
      const error = ErrorTypes.VALIDATION_ERROR('Validation failed', allErrors);
      return res.status(422).json({
        error: {
          message: error.message,
          code: error.code,
          status: error.statusCode,
          details: allErrors,
          timestamp: error.timestamp
        }
      });
    }

    next();
  };
}

/**
 * Predefined validation schemas for common use cases
 */
const schemas = {
  // Pagination
  pagination: {
    page: { validate: { type: 'integer', options: { min: 1 } } },
    limit: { validate: { type: 'integer', options: { min: 1, max: 100 } } }
  },

  // ID parameter
  id: {
    id: {
      required: true,
      validate: { type: 'integer', options: { min: 1 } },
      label: 'ID'
    }
  },

  // Candidate ID
  candidateId: {
    candidateId: {
      required: true,
      validate: { type: 'integer', options: { min: 1 } },
      label: 'Candidate ID'
    }
  },

  // Job creation
  job: {
    employerId: {
      required: true,
      validate: 'integer',
      label: 'Employer ID'
    },
    title: {
      required: true,
      validate: 'string',
      label: 'Job title'
    },
    specialty: {
      required: true,
      validate: 'string',
      label: 'Specialty'
    },
    location: {
      required: true,
      validate: 'string',
      label: 'Location'
    },
    jobType: {
      required: true,
      validate: { type: 'enum', options: ['full-time', 'part-time', 'contract'] },
      label: 'Job type'
    },
    salaryMin: {
      validate: { type: 'integer', options: { min: 0 } },
      label: 'Minimum salary'
    },
    salaryMax: {
      validate: { type: 'integer', options: { min: 0 } },
      label: 'Maximum salary'
    },
    experienceRequired: {
      validate: { type: 'integer', options: { min: 0 } },
      label: 'Experience required'
    }
  },

  // Candidate creation
  candidate: {
    email: {
      required: true,
      validate: 'email',
      label: 'Email'
    },
    firstName: {
      required: true,
      validate: 'string',
      label: 'First name'
    },
    lastName: {
      required: true,
      validate: 'string',
      label: 'Last name'
    },
    experienceYears: {
      validate: { type: 'integer', options: { min: 0 } },
      label: 'Experience years'
    },
    desiredSalaryMin: {
      validate: { type: 'integer', options: { min: 0 } },
      label: 'Desired minimum salary'
    },
    desiredSalaryMax: {
      validate: { type: 'integer', options: { min: 0 } },
      label: 'Desired maximum salary'
    }
  },

  // Application creation
  application: {
    candidateId: {
      required: true,
      validate: 'integer',
      label: 'Candidate ID'
    },
    jobId: {
      required: true,
      validate: 'integer',
      label: 'Job ID'
    },
    coverLetter: {
      validate: 'string',
      label: 'Cover letter'
    }
  },

  // Match query
  matchQuery: {
    candidateId: {
      required: true,
      validate: 'integer',
      label: 'Candidate ID'
    },
    limit: {
      validate: { type: 'integer', options: { min: 1, max: 50 } },
      label: 'Limit'
    },
    minScore: {
      validate: { type: 'integer', options: { min: 0, max: 100 } },
      label: 'Minimum score'
    }
  }
};

module.exports = {
  validate,
  validators,
  schemas,
  runValidation
};
