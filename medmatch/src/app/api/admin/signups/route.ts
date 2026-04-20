import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

// Dynamic route - don't cache
export const dynamic = 'force-dynamic'

// Admin password from env
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

// Lazy-load Prisma to avoid build-time issues
let prisma: any = null

function getPrisma() {
  if (!prisma) {
    const { PrismaClient } = require('@prisma/client')
    prisma = new PrismaClient()
  }
  return prisma
}

// Check admin authentication
function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }
  const token = authHeader.slice(7)
  return token === ADMIN_PASSWORD
}

// GET /api/admin/signups - List all signups
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    if (!checkAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
      )
    }

    const prismaClient = getPrisma()
    const { searchParams } = new URL(request.url)
    
    // Parse query params
    const role = searchParams.get('role')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '1000')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: any = {}
    if (role) where.role = role.toUpperCase()
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    // Fetch signups
    const [signups, total] = await Promise.all([
      prismaClient.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        }
      }),
      prismaClient.user.count({ where })
    ])

    // Calculate statistics
    const stats = await calculateStats(prismaClient, where)

    return NextResponse.json({
      signups,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + signups.length < total
      },
      stats
    })

  } catch (error) {
    console.error('Admin signups error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Calculate signup statistics
async function calculateStats(prismaClient: any, baseWhere: any) {
  // Total by role
  const byRole = await prismaClient.user.groupBy({
    by: ['role'],
    _count: { id: true }
  })

  // Signups by day (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const byDay = await prismaClient.user.groupBy({
    by: ['createdAt'],
    where: {
      ...baseWhere,
      createdAt: { gte: thirtyDaysAgo }
    },
    _count: { id: true }
  })

  // Format daily stats
  const dailyStats: Record<string, number> = {}
  byDay.forEach((item: any) => {
    const date = new Date(item.createdAt).toISOString().split('T')[0]
    dailyStats[date] = (dailyStats[date] || 0) + item._count.id
  })

  // Recent signups (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const last7Days = await prismaClient.user.count({
    where: { createdAt: { gte: sevenDaysAgo } }
  })

  return {
    total: await prismaClient.user.count(),
    byRole: byRole.map((r: any) => ({ role: r.role, count: r._count.id })),
    last7Days,
    dailyStats
  }
}
