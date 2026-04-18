import { NextResponse } from 'next/server'

// Dynamic route - don't cache
export const dynamic = 'force-dynamic'

// Lazy-load Prisma to avoid build-time issues
let prisma: any = null

function getPrisma() {
  if (!prisma && process.env.DATABASE_URL) {
    const { PrismaClient } = require('@prisma/client')
    const { PrismaPg } = require('@prisma/adapter-pg')
    const { Pool } = require('pg')
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const adapter = new PrismaPg(pool)
    prisma = new PrismaClient({ adapter })
  }
  return prisma
}

export async function GET() {
  try {
    // Test database connection if available
    const db = getPrisma()
    if (db) {
      await db.$queryRaw`SELECT 1`
    }
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'medmatch-api',
      database: db ? 'connected' : 'not_configured'
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'medmatch-api',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 })
  }
}
