import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { logError, logHealthCheck } from '@/lib/logger'

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
  return request.headers.get('x-request-id') || `deep-health-${Date.now()}`
}

// Deep health check - GET /api/health/deep
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)
  const checkStartTime = Date.now()
  
  const checks: Record<string, { status: string; responseTimeMs: number; error?: string }> = {}
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

  // Check 1: Database connectivity with read/write test
  const dbCheckStart = Date.now()
  try {
    const db = getPrisma()
    if (!db) {
      checks.database = {
        status: 'not_configured',
        responseTimeMs: Date.now() - dbCheckStart,
      }
    } else {
      // Test read
      await db.$queryRaw`SELECT 1 as health_check`
      
      // Test write (create a temporary health check record)
      const testRecord = await db.healthCheckLog.create({
        data: {
          type: 'deep_check_test',
          status: 'healthy',
          responseTimeMs: 0,
          details: JSON.stringify({ test: true }),
          timestamp: new Date(),
        },
      })
      
      // Clean up test record
      await db.healthCheckLog.delete({
        where: { id: testRecord.id },
      })
      
      checks.database = {
        status: 'healthy',
        responseTimeMs: Date.now() - dbCheckStart,
      }
    }
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      responseTimeMs: Date.now() - dbCheckStart,
      error: error instanceof Error ? error.message : 'Database error',
    }
    overallStatus = 'unhealthy'
    
    logError({
      requestId,
      message: 'Deep health check database test failed',
      stack: error instanceof Error ? error.stack : undefined,
      severity: 'CRITICAL',
      path: '/api/health/deep',
      method: 'GET',
    }).catch(() => {})
  }

  // Check 2: Environment configuration
  const envCheckStart = Date.now()
  const requiredEnvVars = ['DATABASE_URL']
  const missingEnvVars = requiredEnvVars.filter(v => !process.env[v])
  
  if (missingEnvVars.length > 0) {
    checks.environment = {
      status: 'unhealthy',
      responseTimeMs: Date.now() - envCheckStart,
      error: `Missing required env vars: ${missingEnvVars.join(', ')}`,
    }
    overallStatus = 'unhealthy'
  } else {
    checks.environment = {
      status: 'healthy',
      responseTimeMs: Date.now() - envCheckStart,
    }
  }

  // Check 3: Email service configuration
  const emailCheckStart = Date.now()
  if (!process.env.RESEND_API_KEY) {
    checks.email = {
      status: 'degraded',
      responseTimeMs: Date.now() - emailCheckStart,
      error: 'Email service not configured (RESEND_API_KEY missing)',
    }
    if (overallStatus === 'healthy') overallStatus = 'degraded'
  } else {
    checks.email = {
      status: 'healthy',
      responseTimeMs: Date.now() - emailCheckStart,
    }
  }

  // Check 4: Memory usage
  const memoryCheckStart = Date.now()
  const memoryUsage = process.memoryUsage()
  const maxMemoryMB = 512 // Assume 512MB limit for Fly.io
  const usedMemoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024)
  const memoryUsagePercent = (usedMemoryMB / maxMemoryMB) * 100
  
  if (memoryUsagePercent > 90) {
    checks.memory = {
      status: 'unhealthy',
      responseTimeMs: Date.now() - memoryCheckStart,
      error: `Memory usage critical: ${usedMemoryMB}MB (${memoryUsagePercent.toFixed(1)}%)`,
    }
    if (overallStatus !== 'unhealthy') overallStatus = 'degraded'
  } else if (memoryUsagePercent > 70) {
    checks.memory = {
      status: 'degraded',
      responseTimeMs: Date.now() - memoryCheckStart,
      error: `Memory usage high: ${usedMemoryMB}MB (${memoryUsagePercent.toFixed(1)}%)`,
    }
    if (overallStatus === 'healthy') overallStatus = 'degraded'
  } else {
    checks.memory = {
      status: 'healthy',
      responseTimeMs: Date.now() - memoryCheckStart,
    }
  }

  const totalResponseTimeMs = Date.now() - checkStartTime

  // Log the health check result
  logHealthCheck({
    type: 'deep',
    status: overallStatus === 'healthy' ? 'healthy' : 'unhealthy',
    responseTimeMs: totalResponseTimeMs,
    details: {
      checks: Object.fromEntries(
        Object.entries(checks).map(([k, v]) => [k, { status: v.status }])
      ),
      memoryUsage: {
        usedMB: usedMemoryMB,
        totalMB: maxMemoryMB,
        percent: memoryUsagePercent,
      },
    },
  }).catch(() => {})

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    service: 'medmatch-api',
    version: process.env.APP_VERSION || '0.1.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    responseTimeMs: totalResponseTimeMs,
    checks,
    memory: {
      usedMB: usedMemoryMB,
      totalMB: maxMemoryMB,
      percent: Math.round(memoryUsagePercent),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
    },
  }, { 
    status: overallStatus === 'unhealthy' ? 503 : 200,
    headers: {
      'X-Request-Id': requestId,
    }
  })
}
