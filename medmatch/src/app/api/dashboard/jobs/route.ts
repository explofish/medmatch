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

const mockJobs = [
  {
    id: '1',
    title: 'Facharzt für Anästhesie (m/w/d)',
    company: {
      id: 'comp-1',
      name: 'Universitätsklinikum Hamburg',
      logoUrl: null,
      location: 'Hamburg',
    },
    location: 'Hamburg',
    salaryMin: 65000,
    salaryMax: 85000,
    salaryCurrency: 'EUR',
    employmentType: 'full_time',
    experienceLevel: 'specialist',
    specialization: 'Anästhesie',
    description: 'Wir suchen einen engagierten Facharzt für Anästhesie...',
    status: 'ACTIVE',
    expiresAt: '2024-05-18T00:00:00Z',
    createdAt: '2024-04-18T00:00:00Z',
  },
  {
    id: '2',
    title: 'Assistenzarzt - Notfallmedizin',
    company: {
      id: 'comp-2',
      name: 'DRK Kliniken Berlin',
      logoUrl: null,
      location: 'Berlin',
    },
    location: 'Berlin',
    salaryMin: 55000,
    salaryMax: 70000,
    salaryCurrency: 'EUR',
    employmentType: 'full_time',
    experienceLevel: 'entry',
    specialization: 'Notfallmedizin',
    description: 'Eintrittsgelegenheit für Assistenzärzte...',
    status: 'ACTIVE',
    expiresAt: '2024-06-17T00:00:00Z',
    createdAt: '2024-04-17T00:00:00Z',
  },
  {
    id: '3',
    title: 'Oberarzt (m/w/d) - Neurologie',
    company: {
      id: 'comp-3',
      name: 'Schön Klinik',
      logoUrl: null,
      location: 'München',
    },
    location: 'München',
    salaryMin: 80000,
    salaryMax: 100000,
    salaryCurrency: 'EUR',
    employmentType: 'full_time',
    experienceLevel: 'senior',
    specialization: 'Neurologie',
    description: 'Leitungsposition in der Neurologie...',
    status: 'ACTIVE',
    expiresAt: '2024-05-16T00:00:00Z',
    createdAt: '2024-04-16T00:00:00Z',
  },
];

// GET /api/dashboard/jobs - Get job listings
export const GET = withLogging(async (request, { requestId }) => {
  try {
    const { searchParams } = new URL(request.url);
    
    const specialization = searchParams.get('specialization');
    const location = searchParams.get('location');
    const employmentType = searchParams.get('employmentType');
    const searchQuery = searchParams.get('q');
    
    let jobs = mockJobs;
    
    // Apply filters
    if (specialization && specialization !== 'Alle') {
      jobs = jobs.filter(j => j.specialization === specialization);
    }
    
    if (location) {
      jobs = jobs.filter(j => j.location.toLowerCase().includes(location.toLowerCase()));
    }
    
    if (employmentType) {
      jobs = jobs.filter(j => j.employmentType === employmentType);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      jobs = jobs.filter(j => 
        j.title.toLowerCase().includes(query) ||
        j.company.name.toLowerCase().includes(query) ||
        j.description.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({ jobs }, {
      headers: { 'X-Request-Id': requestId }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500, headers: { 'X-Request-Id': requestId } }
    );
  }
});
