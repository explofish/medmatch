# Security Documentation

## Overview

This document outlines the security considerations and hardening recommendations for the MedMatch Job Platform Backend.

## Current Security Measures

### 1. Input Validation
- Centralized validation middleware (`src/middleware/validation.js`)
- Type checking for all input fields (string, integer, email, URL, etc.)
- SQL injection prevention via parameterized queries
- Request body size limit: 10MB

### 2. Error Handling
- Standardized error responses via `ApiError` class
- No sensitive information leaked in production errors
- Stack traces only shown in development/test environments
- Database error sanitization

### 3. CORS Configuration
```javascript
app.use(cors({
  origin: '*',  // TODO: Restrict to specific domains in production
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Note:** Current CORS allows all origins. For production, restrict to:
- `https://medmatch.de`
- `https://www.medmatch.de`
- Any other approved domains

### 4. Database Security
- SQLite used for local development only
- Soft delete pattern (isDeleted flag) prevents data loss
- No hardcoded credentials - all configuration via environment variables
- Database file stored in `.data/` directory (not in version control)

## Security Audit Results

### ✅ Verified Secure
- [x] No hardcoded secrets in source code
- [x] No plaintext password storage
- [x] Input sanitization on all endpoints
- [x] SQL injection protection via parameterized queries
- [x] Error messages don't expose sensitive data in production
- [x] CORS headers properly configured (though permissive for dev)

### ⚠️ Recommendations for Production

#### 1. Add Rate Limiting
Install and configure `express-rate-limit`:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: {
      message: 'Too many requests, please try again later',
      code: 'ERR_RATE_LIMIT',
      status: 429
    }
  }
});

app.use('/api/', limiter);
```

#### 2. Add Security Headers
Install and configure `helmet`:

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

#### 3. Restrict CORS Origins
Update CORS configuration for production:

```javascript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
```

#### 4. Environment Variables Checklist
Create a `.env.example` file (without real values):

```bash
# Server Configuration
PORT=3001
NODE_ENV=production

# Database (PostgreSQL for production)
DATABASE_URL=postgresql://user:password@host:5432/medmatch

# CORS
ALLOWED_ORIGINS=https://medmatch.de,https://www.medmatch.de

# Security
BCRYPT_ROUNDS=12
JWT_SECRET=your-256-bit-secret-here
JWT_EXPIRES_IN=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_BODY=false
```

#### 5. Database Migration (PostgreSQL)
When migrating from SQLite to PostgreSQL:
- Use connection pooling
- Enable SSL for database connections
- Use prepared statements (already implemented)
- Set up regular backups

#### 6. Additional Security Headers
Add to server responses:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

## Security Checklist for Production Deployment

- [ ] Change default CORS origin from `*` to specific domains
- [ ] Install and configure `helmet` for security headers
- [ ] Install and configure `express-rate-limit`
- [ ] Set up HTTPS/TLS (via reverse proxy or directly)
- [ ] Configure environment variables (no defaults in code)
- [ ] Enable request logging for security audit trail
- [ ] Set up monitoring and alerting for suspicious activity
- [ ] Implement API key or JWT authentication
- [ ] Regular security audits of dependencies (`npm audit`)
- [ ] Database encryption at rest (if supported by provider)

## Dependency Security

Run regularly:
```bash
npm audit
npm audit fix
```

Current audit status: Run `npm audit` to check for vulnerabilities.

## Incident Response

If security incident suspected:
1. Check server logs (`LOG_LEVEL=debug` for detailed logs)
2. Review database access patterns
3. Check for unusual API request patterns
4. Rotate any potentially compromised credentials
5. Review and patch affected code

## Contact

Security concerns should be reported to the CTO and documented in the issue tracker with `security` label.
