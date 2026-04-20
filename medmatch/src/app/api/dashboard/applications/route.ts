import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/lib/api-route';

export const dynamic = 'force-dynamic';

// GET /api/dashboard/applications - Get user's applications
export const GET = withLogging(async (request, { requestId }) => {
  try {
    // Mock applications for local development
    const mockApplications = [
      {
        id: 'app-1',
        jobId: '1',
        job: {
          id: '1',
          title: 'Assistenzarzt (m/w/d) - Innere Medizin',
          company: {
            id: 'comp-1',
            name: 'Klinikum Berlin',
            logoUrl: null,
            location: 'Berlin',
          },
          location: 'Berlin',
          specialization: 'Innere Medizin',
        },
        status: 'PENDING',
        coverLetter: 'Ich bewerbe mich um die Position...',
        createdAt: '2024-04-15T10:00:00Z',
        updatedAt: '2024-04-15T10:00:00Z',
      },
      {
        id: 'app-2',
        jobId: '2',
        job: {
          id: '2',
          title: 'Facharzt für Chirurgie',
          company: {
            id: 'comp-2',
            name: 'Charité Universitätsmedizin',
            logoUrl: null,
            location: 'Berlin',
          },
          location: 'Berlin',
          specialization: 'Chirurgie',
        },
        status: 'REVIEWING',
        coverLetter: 'Mit großem Interesse habe ich Ihre Stellenanzeige gelesen...',
        createdAt: '2024-04-12T14:30:00Z',
        updatedAt: '2024-04-14T09:15:00Z',
      },
      {
        id: 'app-3',
        jobId: '3',
        job: {
          id: '3',
          title: 'Oberarzt (m/w/d) - Kardiologie',
          company: {
            id: 'comp-3',
            name: 'Herzzentrum Leipzig',
            logoUrl: null,
            location: 'Leipzig',
          },
          location: 'Leipzig',
          specialization: 'Kardiologie',
        },
        status: 'SHORTLISTED',
        coverLetter: 'Als erfahrener Kardiologe bewerbe ich mich...',
        createdAt: '2024-04-10T11:00:00Z',
        updatedAt: '2024-04-18T16:45:00Z',
      },
    ];

    return NextResponse.json({ applications: mockApplications }, {
      headers: { 'X-Request-Id': requestId }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500, headers: { 'X-Request-Id': requestId } }
    );
  }
});

// POST /api/dashboard/applications - Submit new application
export const POST = withLogging(async (request, { requestId }) => {
  try {
    const body = await request.json();
    const { jobId, coverLetter } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400, headers: { 'X-Request-Id': requestId } }
      );
    }

    // In a real app, create application in database
    const newApplication = {
      id: `app-${Date.now()}`,
      jobId,
      status: 'PENDING',
      coverLetter,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ 
      success: true,
      application: newApplication 
    }, {
      status: 201,
      headers: { 'X-Request-Id': requestId }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500, headers: { 'X-Request-Id': requestId } }
    );
  }
});
