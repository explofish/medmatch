import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getMetrics, logError, logger } from '@/lib/logger'

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

// Get request ID from headers
function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || `metrics-${Date.now()}`
}

// Simple API key check for admin endpoints
function isAuthorized(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key')
  const expectedKey = process.env.ADMIN_API_KEY
  
  if (!expectedKey) {
    // If no admin key is configured, allow access from localhost in development
    const host = request.headers.get('host') || ''
    return host.includes('localhost') || host.includes('127.0.0.1')
  }
  
  return apiKey === expectedKey
}

// Admin metrics endpoint - GET /api/admin/metrics
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)
  const startTime = Date.now()
  
  // Check authorization
  if (!isAuthorized(request)) {
    logError({
      requestId,
      message: 'Unauthorized access attempt to admin metrics',
      severity: 'WARNING',
      path: '/api/admin/metrics',
      method: 'GET',
      context: {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      },
    }).catch(() => {})
    
    return NextResponse.json(
      { error: 'Unauthorized' },
      { 
        status: 401,
        headers: { 'X-Request-Id': requestId }
      }
    )
  }
  
  try {
    // Get days parameter (default to 7)
    const url = new URL(request.url)
    const days = parseInt(url.searchParams.get('days') || '7', 10)
    const validDays = Math.min(Math.max(days, 1), 30) // Limit to 1-30 days
    
    const db = getPrisma()
    if (!db) {
      return NextResponse.json(
        { error: 'Database not available' },
        { 
          status: 503,
          headers: { 'X-Request-Id': requestId }
        }
      )
    }
    
    // Get aggregated metrics
    const metrics = await getMetrics(validDays)
    
    // Get recent errors (last 24 hours)
    const since = new Date()
    since.setDate(since.getDate() - 1)
    
    const recentErrors = await db.errorLog.findMany({
      where: {
        createdAt: {
          gte: since,
        },
        resolvedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
      select: {
        id: true,
        message: true,
        severity: true,
        path: true,
        createdAt: true,
      },
    })
    
    // Get recent request stats (last hour)
    const lastHour = new Date()
    lastHour.setHours(lastHour.getHours() - 1)
    
    const recentRequestStats = await db.requestLog.groupBy({
      by: ['statusCode'],
      where: {
        timestamp: {
          gte: lastHour,
        },
      },
      _count: {
        statusCode: true,
      },
    })
    
    // Get top endpoints (last 24 hours)
    const topEndpoints = await db.requestLog.groupBy({
      by: ['path'],
      where: {
        timestamp: {
          gte: since,
        },
      },
      _count: {
        path: true,
      },
      orderBy: {
        _count: {
          path: 'desc',
        },
      },
      take: 10,
    })
    
    // Get health check stats (last 24 hours)
    const healthChecks = await db.healthCheckLog.groupBy({
      by: ['status', 'type'],
      where: {
        timestamp: {
          gte: since,
        },
      },
      _count: {
        status: true,
      },
    })
    
    const responseTime = Date.now() - startTime
    
    logger.info('Admin metrics retrieved', {
      requestId,
      days: validDays,
      responseTimeMs: responseTime,
    })
    
    return NextResponse.json({
      summary: {
        period: {
          days: validDays,
          since: new Date(Date.now() - validDays * 24 * 60 * 60 * 1000).toISOString(),
        },
        requests: {
          total: metrics.totalRequests,
          errorRate: Math.round(metrics.errorRate * 100) / 100,
          avgResponseTimeMs: metrics.avgResponseTimeMs,
        },
        lastHour: recentRequestStats.map((s: { statusCode: number; _count: { statusCode: number } }) => ({
          statusCode: s.statusCode,
          count: s._count.statusCode,
        })),
        recentErrors: recentErrors.map((e: { id: string; message: string; severity: string; path: string | null; createdAt: Date }) => ({
          id: e.id,
          message: e.message.substring(0, 100),
          severity: e.severity,
          path: e.path,
          createdAt: e.createdAt,
        })),
        topEndpoints: topEndpoints.map((e: { path: string; _count: { path: number } }) => ({
          path: e.path,
          count: e._count.path,
        })),
        healthChecks: healthChecks.reduce((acc: Record<string, number>, h: { type: string; status: string; _count: { status: number } }) => {
          const key = `${h.type}_${h.status}`
          acc[key] = h._count.status
          return acc
        }, {} as Record<string, number>),
        requestsByDay: metrics.requestsByDay,
        topErrorTypes: metrics.topErrorTypes,
      },
      meta: {
        generatedAt: new Date().toISOString(),
        responseTimeMs: responseTime,
      },
    }, {
      headers: { 'X-Request-Id': requestId }
    })
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    logError({
      requestId,
      message: 'Failed to retrieve admin metrics',
      stack: error instanceof Error ? error.stack : undefined,
      severity: 'ERROR',
      path: '/api/admin/metrics',
      method: 'GET',
      context: {
        responseTimeMs: responseTime,
      },
    }).catch(() => {})
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve metrics',
        requestId,
      },
      { 
        status: 500,
        headers: { 'X-Request-Id': requestId }
      }
    )
  }
}
