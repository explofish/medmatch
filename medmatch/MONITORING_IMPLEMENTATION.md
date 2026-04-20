# Error Monitoring and Logging Implementation

This document describes the monitoring and logging system implemented for the MedMatch API.

## Overview

The monitoring system provides:
- Request logging with correlation IDs
- Error tracking with severity levels
- Health checks (basic and deep)
- Admin metrics dashboard
- Structured JSON logging to console

## Database Schema

The following tables were added to the database:

### RequestLog
- Tracks all API requests with timing, status codes, and metadata
- Indexed by timestamp, path, status code, and request ID
- Used for metrics aggregation and request tracing

### ErrorLog
- Captures errors with stack traces, context, and severity
- Supports error resolution tracking
- Severity levels: DEBUG, INFO, WARNING, ERROR, CRITICAL

### ApiMetrics
- Hourly aggregated metrics for performance tracking
- Request counts, error rates, and response times
- Error breakdown by status code
- Endpoint usage statistics

### HealthCheckLog
- Records all health check executions
- Tracks response times and check results
- Supports both basic and deep health checks

## Endpoints

### GET /api/health
Basic health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-04-18T22:17:41.000Z",
  "service": "medmatch-api",
  "version": "0.1.0",
  "uptime": 3600,
  "database": "connected",
  "responseTimeMs": 15
}
```

### GET /api/health/deep
Deep health check with comprehensive diagnostics.

**Checks performed:**
1. Database connectivity (read/write test)
2. Environment configuration
3. Email service status
4. Memory usage

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-04-18T22:17:41.000Z",
  "service": "medmatch-api",
  "version": "0.1.0",
  "uptime": 3600,
  "responseTimeMs": 45,
  "checks": {
    "database": { "status": "healthy", "responseTimeMs": 12 },
    "environment": { "status": "healthy", "responseTimeMs": 1 },
    "email": { "status": "healthy", "responseTimeMs": 1 },
    "memory": { "status": "healthy", "responseTimeMs": 0 }
  },
  "memory": {
    "usedMB": 45,
    "totalMB": 512,
    "percent": 9
  }
}
```

### GET /api/admin/metrics
Admin dashboard metrics endpoint.

**Query Parameters:**
- `days` (optional): Number of days to include (1-30, default: 7)

**Response:**
```json
{
  "summary": {
    "period": { "days": 7, "since": "2026-04-11T00:00:00.000Z" },
    "requests": {
      "total": 1543,
      "errorRate": 2.5,
      "avgResponseTimeMs": 125
    },
    "lastHour": [{ "statusCode": 200, "count": 45 }],
    "recentErrors": [...],
    "topEndpoints": [{ "path": "/api/auth/register", "count": 234 }],
    "healthChecks": { "basic_healthy": 144, "deep_healthy": 12 },
    "requestsByDay": [...],
    "topErrorTypes": [{ "code": "500", "count": 12 }]
  },
  "meta": {
    "generatedAt": "2026-04-18T22:17:41.000Z",
    "responseTimeMs": 25
  }
}
```

**Authentication:**
- Requires `X-API-Key` header with value matching `ADMIN_API_KEY` env var
- Or allows access from localhost in development

## Middleware

The request logging middleware (`src/middleware.ts`) automatically:
1. Generates unique request IDs for tracking
2. Applies rate limiting (10 requests/minute per IP)
3. Sets security headers
4. Logs requests with timing and metadata

All API responses include an `X-Request-Id` header for correlation.

## Logger Utility

The logger (`src/lib/logger.ts`) provides:

### Console Logging
```typescript
import { logger } from '@/lib/logger'

logger.debug('Debug message', { extra: 'data' })
logger.info('Info message')
logger.warn('Warning')
logger.error('Error occurred', error)
logger.critical('Critical failure', error)
```

All logs are output as structured JSON to stdout for machine parsing.

### Database Logging
```typescript
import { logRequest, logError } from '@/lib/logger'

// Log a request
await logRequest({
  method: 'POST',
  path: '/api/auth/register',
  statusCode: 201,
  responseTimeMs: 150,
  requestId: 'req-123',
  userAgent: '...',
  ip: '...',
})

// Log an error
await logError({
  requestId: 'req-123',
  message: 'Database connection failed',
  stack: error.stack,
  severity: 'ERROR',
  path: '/api/auth/register',
  method: 'POST',
})
```

## API Route Wrapper

Use the `withLogging` wrapper for automatic request/error logging:

```typescript
import { withLogging } from '@/lib/api-route'

export const POST = withLogging(async (request, { requestId, logError }) => {
  try {
    // Your handler logic
    return NextResponse.json({ success: true })
  } catch (error) {
    await logError(error as Error, { context: 'registration' })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
})
```

## Alert Thresholds

The system tracks these metrics for alerting:
- Error rate > 5% in 5 minutes
- Response time > 2 seconds
- Health check failures
- Memory usage > 70%

## Environment Variables

- `DATABASE_URL`: SQLite database file path
- `ADMIN_API_KEY`: API key for admin endpoints (optional)
- `RESEND_API_KEY`: Email service API key
- `APP_VERSION`: Application version string

## Migration

The monitoring tables were added via migration:
```bash
npx prisma migrate dev --name add_monitoring_tables
```

## Deployment

The monitoring system is deployed with the main application. Logs are output to stdout and captured by the hosting platform's log aggregation.

## Files Changed

- `prisma/schema.prisma` - Added monitoring models
- `src/lib/logger.ts` - New logging utility
- `src/lib/api-route.ts` - API route wrapper
- `src/middleware.ts` - Updated with request logging
- `src/app/api/health/route.ts` - Enhanced health check
- `src/app/api/health/deep/route.ts` - New deep health check
- `src/app/api/admin/metrics/route.ts` - New metrics endpoint
- `src/app/api/auth/register/route.ts` - Updated with logging wrapper
- `src/app/api/admin/signups/route.ts` - Fixed Prisma initialization
