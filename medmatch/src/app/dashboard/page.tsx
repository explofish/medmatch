import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { RecentApplications } from '@/components/dashboard/RecentApplications';
import { RecommendedJobs } from '@/components/dashboard/RecommendedJobs';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Willkommen zurück, John!
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Hier ist eine Übersicht über Ihre Job-Suche und Bewerbungen.
          </p>
        </div>

        {/* Stats */}
        <DashboardStats />

        {/* Two column layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Recent Applications */}
          <RecentApplications />

          {/* Recommended Jobs */}
          <RecommendedJobs />
        </div>
      </div>
    </DashboardLayout>
  );
}
