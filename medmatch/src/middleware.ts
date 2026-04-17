import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Allowed origins for CORS
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
  'https://medmatch.de',
  'https://www.medmatch.de',
  'https://medmatch-demo.vercel.app',
  'https://www.medmatch-demo.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
]

// Rate limiting store (in-memory, resets on deployment)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 10 // 10 requests per minute per IP

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') || ''
  const pathname = request.nextUrl.pathname
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return handleCors(request, origin)
  }
  
  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const rateLimitResult = checkRateLimit(clientIp)
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetTime),
          }
        }
      )
    }
  }
  
  // Handle CORS for API routes
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    
    // Check if origin is allowed
    if (allowedOrigins.includes(origin) || !origin) {
      response.headers.set('Access-Control-Allow-Origin', origin || '*')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      response.headers.set('Access-Control-Max-Age', '86400')
    }
    
    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    // Add rate limit headers for successful requests
    if (pathname.startsWith('/api/')) {
      const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                       request.headers.get('x-real-ip') || 
                       'unknown'
      const remaining = getRemainingRequests(clientIp)
      response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX))
      response.headers.set('X-RateLimit-Remaining', String(remaining))
    }
    
    return response
  }
  
  return NextResponse.next()
}

function handleCors(request: NextRequest, origin: string) {
  const response = new NextResponse(null, { status: 204 })
  
  if (allowedOrigins.includes(origin) || !origin) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Max-Age', '86400')
  }
  
  return response
}

function checkRateLimit(identifier: string): { allowed: boolean; resetTime: number } {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)
  
  if (!record || now > record.resetTime) {
    // New window
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    })
    return { allowed: true, resetTime: now + RATE_LIMIT_WINDOW }
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    // Rate limit exceeded
    return { allowed: false, resetTime: record.resetTime }
  }
  
  // Increment count
  record.count++
  rateLimitStore.set(identifier, record)
  return { allowed: true, resetTime: record.resetTime }
}

function getRemainingRequests(identifier: string): number {
  const record = rateLimitStore.get(identifier)
  if (!record) return RATE_LIMIT_MAX
  return Math.max(0, RATE_LIMIT_MAX - record.count)
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
}
