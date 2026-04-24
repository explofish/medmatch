# Production Deployment Checklist

This checklist ensures all necessary steps are completed before deploying the MedMatch Job Platform to production.

## Pre-Deployment

### Environment Setup
- [ ] Domain configured (medmatch.de)
- [ ] SSL certificate obtained and configured
- [ ] Database credentials received (PostgreSQL from BER-123)
- [ ] Server hosting account configured (Railway/Fly.io/Render)
- [ ] Environment variables documented in `.env.production`

### Code Preparation
- [ ] All tests passing (`npm test`)
- [ ] Linting passes with no errors (`npm run lint`)
- [ ] No `console.log` statements in production code (use logger instead)
- [ ] Version bumped in `package.json` and API responses
- [ ] API documentation updated

## Database Migration

### From SQLite to PostgreSQL
- [ ] PostgreSQL database provisioned
- [ ] Connection string configured in environment
- [ ] Database schema migrated
- [ ] Data migrated (if applicable)
- [ ] Database indexes created
- [ ] Backup strategy configured

### Connection Changes
Update `src/server.js`:
```javascript
// Replace SQLite setup:
const sqlite3 = require('sqlite3').verbose();
// With PostgreSQL:
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
```

## Security Hardening

- [ ] CORS origin restricted to production domains only
- [ ] `helmet` middleware installed and configured
- [ ] `express-rate-limit` installed and configured
- [ ] JWT secret generated (256-bit minimum)
- [ ] Bcrypt rounds set to 12+ for production
- [ ] Security headers verified
- [ ] `npm audit` run and vulnerabilities addressed

See [SECURITY.md](./SECURITY.md) for detailed security configuration.

## Environment Variables Checklist

Create `.env.production` with:

```bash
# Required
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...

# Security
JWT_SECRET=<256-bit-secret>
BCRYPT_ROUNDS=12
ALLOWED_ORIGINS=https://medmatch.de,https://www.medmatch.de

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_BODY=false

# Optional
SENTRY_DSN=...          # Error tracking
NEW_RELIC_LICENSE_KEY=...  # Performance monitoring
```

## Deployment Steps

### 1. Build and Push
```bash
# Ensure clean working directory
git status

# Create production branch
git checkout -b production

# Push to remote
git push origin production
```

### 2. Deploy to Hosting Platform

#### Option A: Railway
```bash
railway login
railway link
railway up
```

#### Option B: Fly.io
```bash
flyctl deploy
```

#### Option C: Render
- Connect GitHub repository
- Set build command: `npm install`
- Set start command: `npm start`
- Add environment variables

### 3. Post-Deployment Verification

#### Health Checks
- [ ] `GET /api/health` returns 200 with cache stats
- [ ] Database connections working
- [ ] Response times < 200ms for simple queries

#### API Verification
Test each endpoint:
- [ ] `GET /api/employers` - List employers
- [ ] `GET /api/jobs` - List jobs
- [ ] `GET /api/candidates` - List candidates
- [ ] `GET /api/matches?candidateId=1` - Get matches
- [ ] `POST /api/applications` - Submit application

#### Security Verification
- [ ] CORS headers correct
- [ ] Rate limiting active
- [ ] Security headers present (`X-Frame-Options`, etc.)
- [ ] No stack traces in error responses

### 4. Monitoring Setup

- [ ] Application logging configured
- [ ] Error tracking enabled (Sentry)
- [ ] Performance monitoring enabled (New Relic/Datadog)
- [ ] Uptime monitoring configured (Pingdom/UptimeRobot)
- [ ] Alerting configured for:
  - [ ] 5xx errors
  - [ ] High response times
  - [ ] Database connection failures
  - [ ] Disk space warnings

### 5. Backup and Recovery

- [ ] Database backups scheduled (daily minimum)
- [ ] Backup restoration tested
- [ ] Disaster recovery plan documented
- [ ] RTO (Recovery Time Objective) defined
- [ ] RPO (Recovery Point Objective) defined

## Rollback Plan

If deployment fails:

1. **Immediate Rollback** (if using Railway/Fly.io/Render)
   ```bash
   # Re-deploy previous version
   git revert HEAD
   git push origin production --force
   ```

2. **Database Rollback**
   - Restore from backup if schema changes caused issues
   - Document all migration steps for future reference

3. **Communication**
   - Notify team of deployment status
   - Update status page if applicable
   - Document incident post-mortem

## Post-Deployment Tasks

- [ ] Update DNS records if needed
- [ ] Verify SSL certificate auto-renewal
- [ ] Test email notifications (if configured)
- [ ] Monitor error logs for 48 hours
- [ ] Performance benchmark comparison
- [ ] Update documentation with production URLs
- [ ] Schedule weekly dependency updates

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| CTO | | | |
| CEO | | | |
| QA Lead | | | |

## Notes

- Keep this checklist updated as the application evolves
- Review and practice rollback procedures quarterly
- Document any deviations from this checklist
- All changes should be version controlled

---

**Deployment Date:** _______________
**Deployed Version:** _______________
**Deployed By:** _______________
