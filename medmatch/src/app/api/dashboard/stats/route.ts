import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/lib/api-route';

export const dynamic = 'force-dynamic';

// GET /api/dashboard/stats - Get dashboard statistics
export const GET = withLogging(async (request, { requestId }) => {
  try {
    // Mock stats for local development
    const stats = {
      totalApplications: 12,
      pendingApplications: 5,
      shortlistedCount: 2,
      newJobsThisWeek: 24,
      profileViews: 156,
      profileViewsChange: '+12%',
    };

    // Recent data for charts
    const recentApplications = [
      { id: '1', jobTitle: 'Assistenzarzt', company: 'Klinikum Berlin', status: 'PENDING', appliedAt: '2024-04-15' },
      { id: '2', jobTitle: 'Facharzt Chirurgie', company: 'Charité', status: 'REVIEWING', appliedAt: '2024-04-12' },
      { id: '3', jobTitle: 'Oberarzt Kardiologie', company: 'Herzzentrum', status: 'SHORTLISTED', appliedAt: '2024-04-10' },
    ];

    const recommendedJobs = [
      { id: '1', title: 'Facharzt Anästhesie', company: 'UK Hamburg', location: 'Hamburg', specialization: 'Anästhesie' },
      { id: '2', title: 'Assistenzarzt Notfall', company: 'DRK Berlin', location: 'Berlin', specialization: 'Notfallmedizin' },
      { id: '3', title: 'Oberarzt Neurologie', company: 'Schön Klinik', location: 'München', specialization: 'Neurologie' },
    ];

    return NextResponse.json({ 
      stats,
      recentApplications,
      recommendedJobs,
    }, {
      headers: { 'X-Request-Id': requestId }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500, headers: { 'X-Request-Id': requestId } }
    );
  }
});
