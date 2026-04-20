import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { logError, logHealthCheck, logger } from '@/lib/logger'

// Dynamic route - don't cache
export const dynamic = 'force-dynamic'

// Lazy-load Prisma to avoid build-time issues
let prisma: any = null

function getPrisma() {
  if (!prisma && process.env.DATABASE_URL) {
    const { PrismaClient } = require('@prisma/client')
    prisma = new PrismaClient()
  }
  return prisma
}

// Start time for uptime calculation
const startTime = Date.now()

// Get request ID from headers
function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || `health-${Date.now()}`
}

// Basic health check - GET /api/health
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)
  const checkStartTime = Date.now()

  try {
    // Test database connection
    const db = getPrisma()
    let dbStatus = 'not_configured'
    let dbErrorMessage: string | null = null

    if (db) {
      try {
        await db.$queryRaw`SELECT 1`
        dbStatus = 'connected'
      } catch (error) {
        dbStatus = 'disconnected'
        dbErrorMessage = error instanceof Error ? error.message : 'Unknown database error'
        
        // Log the database error
        logError({
          requestId,
          message: `Health check database connection failed: ${dbErrorMessage}`,
          stack: error instanceof Error ? error.stack : undefined,
          severity: 'ERROR',
          path: '/api/health',
          method: 'GET',
        }).catch(() => {})
      }
    }

    const responseTimeMs = Date.now() - checkStartTime
    const status = dbStatus === 'disconnected' ? 'unhealthy' : 'healthy'

    // Log health check asynchronously
    logHealthCheck({
      type: 'basic',
      status,
      responseTimeMs,
      details: {
        database: dbStatus,
        uptime: Math.floor((Date.now() - startTime) / 1000),
      },
      error: dbErrorMessage || undefined,
    }).catch(() => {})

    const response = NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      service: 'medmatch-api',
      version: process.env.APP_VERSION || '0.1.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      database: dbStatus,
      responseTimeMs,
      ...(dbErrorMessage && { error: dbErrorMessage }),
    }, { 
      status: status === 'healthy' ? 200 : 503,
      headers: {
        'X-Request-Id': requestId,
      }
    })

    return response
  } catch (error) {
    const responseTimeMs = Date.now() - checkStartTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log the error
    logError({
      requestId,
      message: 'Health check failed',
      stack: error instanceof Error ? error.stack : undefined,
      severity: 'CRITICAL',
      path: '/api/health',
      method: 'GET',
    }).catch(() => {})

    // Log health check as unhealthy
    logHealthCheck({
      type: 'basic',
      status: 'unhealthy',
      responseTimeMs,
      error: errorMessage,
    }).catch(() => {})

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'medmatch-api',
      version: process.env.APP_VERSION || '0.1.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      database: 'error',
      error: errorMessage,
      responseTimeMs,
    }, { 
      status: 503,
      headers: {
        'X-Request-Id': requestId,
      }
    })
  }
}
