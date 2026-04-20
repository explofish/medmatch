import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/lib/api-route';

export const dynamic = 'force-dynamic';

let prisma: any = null;

function getPrisma() {
  if (!prisma) {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}

// GET /api/dashboard/profile - Get current user's profile
export const GET = withLogging(async (request, { requestId }) => {
  try {
    // In a real app, get userId from session
    // For now, return mock data for local development
    const mockProfile = {
      id: 'profile-1',
      userId: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+49 170 1234567',
      location: 'Berlin',
      specialization: 'Innere Medizin',
      graduationYear: 2022,
      university: 'Charité - Universitätsmedizin Berlin',
      bio: 'Ich bin ein engagierter Arzt mit Leidenschaft für die patientenzentrierte Versorgung.',
      skills: ['Diagnostik', 'Patientenversorgung', 'Medizinische Dokumentation', 'Teamarbeit'],
      cvUrl: null,
      preferences: {
        desiredLocations: ['Berlin', 'Hamburg', 'München'],
        desiredSpecializations: ['Innere Medizin', 'Kardiologie'],
        remotePreference: 'hybrid',
      },
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-04-20T14:30:00Z',
    };

    return NextResponse.json({ profile: mockProfile }, {
      headers: { 'X-Request-Id': requestId }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500, headers: { 'X-Request-Id': requestId } }
    );
  }
});

// PATCH /api/dashboard/profile - Update user profile
export const PATCH = withLogging(async (request, { requestId }) => {
  try {
    const body = await request.json();
    
    // In a real app, validate and update in database
    // For now, return success for local development
    
    return NextResponse.json({ 
      success: true,
      message: 'Profile updated successfully',
      profile: body
    }, {
      status: 200,
      headers: { 'X-Request-Id': requestId }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500, headers: { 'X-Request-Id': requestId } }
    );
  }
});
