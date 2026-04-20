import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { sendEmail } from '@/lib/email'
import { withLogging } from '@/lib/api-route'

// Dynamic route - don't cache
export const dynamic = 'force-dynamic'

// Lazy-load Prisma to avoid build-time issues
let prisma: any = null

function getPrisma() {
  if (!prisma) {
    const { PrismaClient } = require('@prisma/client')
    prisma = new PrismaClient()
  }
  return prisma
}

export const POST = withLogging(async (request, { requestId, logError }) => {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName, userType = 'GRADUATE' } = body

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { 
          status: 400,
          headers: { 'X-Request-Id': requestId }
        }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { 
          status: 400,
          headers: { 'X-Request-Id': requestId }
        }
      )
    }

    const prismaClient = getPrisma()

    // Check if user already exists
    const existingUser = await prismaClient.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { 
          status: 409,
          headers: { 'X-Request-Id': requestId }
        }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prismaClient.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: `${firstName || ''} ${lastName || ''}`.trim() || null,
        role: userType === 'employer' ? 'EMPLOYER' : 'GRADUATE',
      }
    })

    // Create profile based on user type
    if (userType === 'employer') {
      await prismaClient.employerProfile.create({
        data: {
          userId: user.id,
          firstName: firstName || 'New',
          lastName: lastName || 'User',
        }
      })
    } else {
      await prismaClient.graduateProfile.create({
        data: {
          userId: user.id,
          firstName: firstName || 'Neuer',
          lastName: lastName || 'Nutzer',
        }
      })
    }

    // Send welcome email (async - don't block response)
    sendEmail(email, 'welcome', {
      firstName: firstName || 'Neuer Nutzer',
      email: email,
    }).catch((err: Error) => {
      logError(err, { context: 'welcome_email' }).catch(() => {})
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      }
    }, { 
      status: 201,
      headers: { 'X-Request-Id': requestId }
    })

  } catch (error) {
    // Log the error using the provided helper
    await logError(error instanceof Error ? error : new Error('Registration error'), {
      context: 'user_registration',
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: { 'X-Request-Id': requestId }
      }
    )
  }
})
