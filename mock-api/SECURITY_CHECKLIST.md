# API Security Checklist for Future Endpoints

A comprehensive checklist for implementing secure API endpoints in the MedMatch platform.

---

## Quick Reference

### For New Endpoints
Use this checklist before merging any new API endpoint:

| Category | Check | Required |
|----------|-------|----------|
| 🔐 Authentication | Authentication implemented | CRITICAL |
| 🔐 Authentication | Authorization checks in place | CRITICAL |
| 📝 Input Validation | All inputs validated | CRITICAL |
| 📝 Input Validation | SQL injection protection | CRITICAL |
| 🔒 Data Protection | Sensitive data masked/excluded | CRITICAL |
| 🔒 Data Protection | Proper access controls | CRITICAL |
| 📊 Rate Limiting | Rate limits applied | HIGH |
| 📄 Documentation | OpenAPI spec updated | HIGH |
| 🧪 Testing | Security tests written | HIGH |
| 📋 Logging | Audit logging implemented | MEDIUM |

---

## 1. Authentication & Authorization

### Authentication Checklist

```markdown
- [ ] Endpoint requires authentication (unless explicitly public)
- [ ] Authentication mechanism documented (JWT, API key, etc.)
- [ ] Token validation implemented correctly
- [ ] Token expiration handled gracefully
- [ ] Refresh token flow implemented (if applicable)
```

### Code Template - JWT Auth Middleware

```javascript
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];  // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;  // Attach user to request
    next();
  });
}

// Apply to routes
app.get('/api/protected', authenticateToken, (req, res) => {
  // Access req.user.id, req.user.role, etc.
});
```

### Authorization Checklist

```markdown
- [ ] Role-based access control (RBAC) implemented
- [ ] Resource ownership verified
- [ ] Cross-user access prevented
- [ ] Admin privileges properly checked
- [ ] Authorization tested with different user roles
```

### Code Template - RBAC Middleware

```javascript
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }
    
    next();
  };
}

// Usage examples
app.get('/api/admin/users', 
  authenticateToken, 
  requireRole(['admin']), 
  getAllUsers
);

app.patch('/api/candidates/:id', 
  authenticateToken, 
  requireRole(['admin', 'candidate']),
  verifyOwnership('candidate'),  // Custom middleware
  updateCandidate
);
```

### Resource Ownership Verification

```javascript
function verifyOwnership(resourceType) {
  return async (req, res, next) => {
    const resourceId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Admins can access everything
    if (userRole === 'admin') {
      return next();
    }
    
    // Check ownership
    const resource = await db.get(
      `SELECT userId FROM ${resourceType} WHERE id = ?`,
      [resourceId]
    );
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    if (resource.userId !== userId) {
      return res.status(403).json({ 
        error: 'You do not have permission to access this resource' 
      });
    }
    
    next();
  };
}
```

---

## 2. Input Validation

### Validation Checklist

```markdown
- [ ] All input parameters validated
- [ ] Type checking implemented
- [ ] String length limits enforced
- [ ] Numeric ranges validated
- [ ] Email format validated
- [ ] URL format validated (if accepting URLs)
- [ ] Date formats validated
- [ ] Enum values validated
- [ ] NoSQL injection prevention (for MongoDB)
- [ ] SQL injection prevention (parameterized queries)
```

### Code Template - Input Validation

```javascript
const { body, param, query, validationResult } = require('express-validator');

// Validation middleware
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }
    
    next();
  };
};

// Example endpoint with validation
app.post('/api/candidates', validate([
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name required (max 100 chars)'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name required (max 100 chars)'),
  body('experienceYears')
    .optional()
    .isInt({ min: 0, max: 70 })
    .withMessage('Experience must be 0-70 years'),
  body('cvUrl')
    .optional()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('CV URL must be a valid HTTP/HTTPS URL'),
]), createCandidate);
```

### Manual Validation Template

```javascript
// When not using express-validator
function validateCandidateInput(body) {
  const errors = [];
  const MAX_STRING_LENGTH = 500;
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!body.email || !emailRegex.test(body.email)) {
    errors.push('Valid email required');
  }
  if (body.email && body.email.length > 254) {
    errors.push('Email exceeds maximum length');
  }
  
  // Name validation
  if (!body.firstName || body.firstName.trim().length === 0) {
    errors.push('First name required');
  }
  if (body.firstName && body.firstName.length > MAX_STRING_LENGTH) {
    errors.push('First name exceeds maximum length');
  }
  
  // Numeric validation
  if (body.experienceYears !== undefined) {
    const exp = parseInt(body.experienceYears, 10);
    if (isNaN(exp) || exp < 0 || exp > 70) {
      errors.push('Experience must be 0-70 years');
    }
  }
  
  // URL validation
  if (body.cvUrl) {
    const urlRegex = /^https?:\/\/.+/;
    if (!urlRegex.test(body.cvUrl)) {
      errors.push('CV URL must be a valid HTTP/HTTPS URL');
    }
    if (body.cvUrl.length > 2000) {
      errors.push('URL exceeds maximum length');
    }
  }
  
  return errors;
}
```

---

## 3. SQL Injection Prevention

### SQL Injection Checklist

```markdown
- [ ] NO string concatenation in SQL queries
- [ ] Parameterized queries used everywhere
- [ ] Table/column names validated (if dynamic)
- [ ] Raw SQL reviewed by security team
- [ ] Query building functions centralized
```

### SQL Injection Prevention Template

```javascript
// ❌ NEVER DO THIS:
const sql = `SELECT * FROM candidates WHERE email = '${email}'`;  // VULNERABLE!

// ✅ ALWAYS DO THIS:
const sql = 'SELECT * FROM candidates WHERE email = ?';
db.get(sql, [email], callback);

// ✅ Multiple parameters:
const sql = `
  SELECT * FROM jobs 
  WHERE specialty = ? 
    AND location LIKE ? 
    AND salaryMax >= ?
`;
db.all(sql, [specialty, `%${location}%`, minSalary], callback);

// ✅ Dynamic table names (validate first):
const ALLOWED_TABLES = ['candidates', 'employers', 'jobs'];
if (!ALLOWED_TABLES.includes(tableName)) {
  throw new Error('Invalid table name');
}
const sql = `SELECT * FROM ${tableName} WHERE id = ?`;  // Safe: tableName validated
db.get(sql, [id], callback);

// ✅ Dynamic sort columns:
const ALLOWED_SORT_COLUMNS = ['id', 'name', 'createdAt'];
const sortColumn = ALLOWED_SORT_COLUMNS.includes(req.query.sortBy) 
  ? req.query.sortBy 
  : 'id';
const sql = `SELECT * FROM candidates ORDER BY ${sortColumn} ASC`;
```

---

## 4. Data Exposure Protection

### Data Protection Checklist

```markdown
- [ ] Sensitive fields excluded from public responses
- [ ] Email addresses masked or excluded
- [ ] Internal IDs not exposed unnecessarily
- [ ] Personal data minimized in responses
- [ ] GDPR right to access implemented
- [ ] GDPR right to erasure implemented
```

### Response Filtering Template

```javascript
// Define field visibility by role
const FIELD_VISIBILITY = {
  public: ['id', 'firstName', 'lastName', 'specialty', 'experienceYears', 'location'],
  owner: ['id', 'email', 'firstName', 'lastName', 'specialty', 'experienceYears', 
          'location', 'cvUrl', 'preferences', 'createdAt', 'updatedAt'],
  admin: ['*']  // All fields
};

function filterCandidateResponse(candidate, userRole, isOwner) {
  const visibility = isOwner ? FIELD_VISIBILITY.owner : 
                   userRole === 'admin' ? FIELD_VISIBILITY.admin : 
                   FIELD_VISIBILITY.public;
  
  if (visibility.includes('*')) return candidate;
  
  const filtered = {};
  visibility.forEach(field => {
    if (candidate[field] !== undefined) {
      filtered[field] = candidate[field];
    }
  });
  
  return filtered;
}

// Usage in endpoint
app.get('/api/candidates/:id', authenticateToken, async (req, res) => {
  const candidate = await db.get('SELECT * FROM candidates WHERE id = ?', [req.params.id]);
  
  if (!candidate) {
    return res.status(404).json({ error: 'Candidate not found' });
  }
  
  const isOwner = candidate.userId === req.user.id;
  const filtered = filterCandidateResponse(candidate, req.user.role, isOwner);
  
  res.json({ data: filtered });
});
```

### Email Masking Utility

```javascript
function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2 
    ? local.slice(0, 2) + '*'.repeat(local.length - 2)
    : '*'.repeat(local.length);
  
  return `${maskedLocal}@${domain}`;
}

// Example: "john.doe@example.com" → "jo********@example.com"
```

---

## 5. Rate Limiting

### Rate Limiting Checklist

```markdown
- [ ] Rate limiting applied to all endpoints
- [ ] Stricter limits for authentication endpoints
- [ ] Different limits per user role
- [ ] Rate limit headers included in responses
- [ ] Clear rate limit error messages
```

### Rate Limiting Template

```javascript
const rateLimit = require('express-rate-limit');

// General API limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                  // 100 requests per window
  message: { 
    error: 'Too many requests',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,     // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false         // Disable `X-RateLimit-*` headers
});

// Strict auth limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,  // Don't count successful logins
  message: {
    error: 'Too many login attempts',
    retryAfter: '15 minutes'
  }
});

// Apply to routes
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// Custom limiter for expensive operations
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 30,
  message: { error: 'Search rate limit exceeded' }
});

app.get('/api/search', searchLimiter, handleSearch);
```

---

## 6. Error Handling

### Error Handling Checklist

```markdown
- [ ] Generic error messages for 500 errors
- [ ] No stack traces in production responses
- [ ] No database errors exposed to client
- [ ] Error IDs for log correlation
- [ ] Proper HTTP status codes used
- [ ] Consistent error response format
```

### Error Handling Template

```javascript
// Error response format
class APIError extends Error {
  constructor(status, message, isOperational = true) {
    super(message);
    this.status = status;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    this.errorId = generateErrorId();  // UUID or nanoid
  }
}

// Global error handler
function errorHandler(err, req, res, next) {
  // Log the error (with full details)
  console.error(`[Error ${err.errorId || 'unknown'}]`, {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    user: req.user?.id,
    timestamp: new Date().toISOString()
  });
  
  // Operational errors (expected)
  if (err instanceof APIError && err.isOperational) {
    return res.status(err.status).json({
      error: err.message,
      errorId: err.errorId,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack 
      })
    });
  }
  
  // Programming/unknown errors
  return res.status(500).json({
    error: 'An unexpected error occurred',
    errorId: err.errorId || generateErrorId(),
    ...(process.env.NODE_ENV === 'development' && {
      message: err.message,
      stack: err.stack
    })
  });
}

// Apply error handler
app.use(errorHandler);

// Usage in routes
app.get('/api/data', async (req, res, next) => {
  try {
    const data = await fetchData();
    res.json(data);
  } catch (err) {
    // Transform to operational error
    if (err.code === 'ECONNREFUSED') {
      return next(new APIError(503, 'Database unavailable'));
    }
    next(err);  // Pass to global handler
  }
});
```

---

## 7. Security Headers

### Security Headers Checklist

```markdown
- [ ] Helmet middleware installed
- [ ] Content Security Policy configured
- [ ] HSTS enabled (production)
- [ ] X-Frame-Options set
- [ ] X-Content-Type-Options set
- [ ] Referrer-Policy configured
```

### Security Headers Template

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // Allow inline styles
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,  // Adjust as needed
  hsts: {
    maxAge: 31536000,        // 1 year
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}));

// Custom headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});
```

---

## 8. CORS Configuration

### CORS Checklist

```markdown
- [ ] CORS not set to '*' in production
- [ ] Allowed origins explicitly configured
- [ ] Credentials handled correctly
- [ ] Preflight requests handled
- [ ] CORS error handling implemented
```

### CORS Template

```javascript
const cors = require('cors');

const allowedOrigins = [
  'https://medmatch.de',
  'https://www.medmatch.de',
  'https://app.medmatch.de',
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
  process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null  // Vite default
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS not allowed for origin: ${origin}`));
    }
  },
  credentials: true,  // Required for cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-RateLimit-Remaining'],
  maxAge: 86400  // 24 hours
};

app.use(cors(corsOptions));

// Handle CORS errors
app.use((err, req, res, next) => {
  if (err.message.includes('CORS')) {
    return res.status(403).json({ 
      error: 'CORS error',
      message: 'Origin not allowed' 
    });
  }
  next(err);
});
```

---

## 9. Audit Logging

### Audit Logging Checklist

```markdown
- [ ] Sensitive operations logged
- [ ] User ID included in logs
- [ ] IP address logged
- [ ] Timestamp included
- [ ] Action result logged (success/failure)
- [ ] Logs stored securely
- [ ] Log retention policy defined
```

### Audit Logging Template

```javascript
const winston = require('winston');

const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'audit.log' }),
    // Add database or external service transport for production
  ]
});

function auditLog(action, req, result, details = {}) {
  auditLogger.info({
    action,
    userId: req.user?.id || 'anonymous',
    ip: req.ip,
    userAgent: req.get('user-agent'),
    path: req.path,
    method: req.method,
    resourceId: req.params.id,
    result: result ? 'success' : 'failure',
    ...details
  });
}

// Usage in middleware
function auditMiddleware(action) {
  return (req, res, next) => {
    // Capture original json method
    const originalJson = res.json.bind(res);
    
    res.json = (data) => {
      // Log after response is sent
      const isSuccess = res.statusCode < 400;
      auditLog(action, req, isSuccess, { 
        statusCode: res.statusCode,
        resourceId: data?.data?.id || req.params.id
      });
      
      return originalJson(data);
    };
    
    next();
  };
}

// Apply to routes
app.delete('/api/candidates/:id', 
  authenticateToken,
  auditMiddleware('candidate.delete'),
  deleteCandidate
);
```

---

## 10. Testing Security

### Security Testing Checklist

```markdown
- [ ] Authentication bypass attempts tested
- [ ] Authorization boundary cases tested
- [ ] SQL injection attempts tested
- [ ] XSS payloads tested
- [ ] Rate limiting tested
- [ ] Input validation edge cases tested
- [ ] Error message information leakage tested
```

### Security Test Template

```javascript
describe('POST /api/candidates - Security', () => {
  it('should reject SQL injection in email', async () => {
    const res = await request(app)
      .post('/api/candidates')
      .send({
        email: "'; DROP TABLE candidates; --",
        firstName: 'Test',
        lastName: 'User'
      })
      .expect(400);
    
    // Verify table still exists
    const check = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='candidates'");
    expect(check).toBeTruthy();
  });

  it('should reject XSS payload in name', async () => {
    const res = await request(app)
      .post('/api/candidates')
      .send({
        email: 'test@example.com',
        firstName: '<script>alert("xss")</script>',
        lastName: 'User'
      })
      .expect(201);
    
    // Verify script is not executed (stored as plain text)
    expect(res.body.data.firstName).toBe('<script>alert("xss")</script>');
  });

  it('should not expose other users\' data', async () => {
    // Create user A's data
    const userA = await createTestUser();
    const candidateA = await createTestCandidate(userA.id);
    
    // User B tries to access
    const userB = await createTestUser();
    const tokenB = generateToken(userB);
    
    const res = await request(app)
      .get(`/api/candidates/${candidateA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403);
    
    expect(res.body.error).toContain('permission');
  });

  it('should enforce rate limiting', async () => {
    // Make 101 requests (limit is 100)
    const requests = Array(101).fill().map(() => 
      request(app).get('/api/candidates')
    );
    
    const responses = await Promise.all(requests);
    const limited = responses.filter(r => r.status === 429);
    
    expect(limited.length).toBeGreaterThan(0);
  });
});
```

---

## Endpoint Implementation Template

Use this template when implementing a new endpoint:

```javascript
/**
 * [METHOD] /api/[resource]/:id
 * 
 * Description: [Brief description]
 * 
 * Security:
 * - Authentication: Required
 * - Authorization: [Who can access]
 * - Rate Limiting: [Limit details]
 */
app.[method]('/api/[resource]/:id', 
  // 1. Rate limiting
  specificRateLimiter,
  
  // 2. Authentication
  authenticateToken,
  
  // 3. Authorization
  requireRole(['admin', 'user']),
  verifyOwnership('[resource]'),
  
  // 4. Input validation
  validate([
    param('id').isInt().withMessage('Valid ID required'),
    body('field').optional().isString().trim()
  ]),
  
  // 5. Audit logging
  auditMiddleware('[resource].[action]'),
  
  // 6. Handler
  async (req, res, next) => {
    try {
      // Implementation
      const result = await db.run(/* parameterized query */);
      
      // Filter response
      const filtered = filterResponse(result, req.user);
      
      res.json({ data: filtered });
    } catch (err) {
      next(err);
    }
  }
);
```

---

## Review Checklist

Before merging any new endpoint, verify:

```markdown
## Pre-Merge Security Checklist

### Authentication & Authorization
- [ ] Endpoint requires authentication (if not public)
- [ ] Authorization middleware applied
- [ ] Resource ownership verified
- [ ] Admin operations properly restricted

### Input Security
- [ ] All inputs validated
- [ ] SQL injection prevention (parameterized queries)
- [ ] No eval() or dynamic code execution
- [ ] File uploads validated (if applicable)

### Output Security
- [ ] Sensitive data filtered/masked
- [ ] No internal errors exposed
- [ ] Proper HTTP status codes
- [ ] Consistent response format

### Infrastructure
- [ ] Rate limiting applied
- [ ] Security headers present
- [ ] CORS configured correctly
- [ ] Audit logging implemented

### Documentation
- [ ] OpenAPI spec updated
- [ ] Security considerations documented
- [ ] Error responses documented
- [ ] Rate limits documented

### Testing
- [ ] Unit tests written
- [ ] Security tests written
- [ ] Authorization scenarios tested
- [ ] Edge cases tested

## Sign-off
- [ ] Code reviewed by: _____________
- [ ] Security reviewed by: _____________
- [ ] Tests passing: _____________
```

---

*Generated for BER-209 - API Security Audit & Documentation*
