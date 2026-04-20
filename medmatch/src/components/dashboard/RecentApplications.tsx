'use client';

import Link from 'next/link';
import { ArrowRight, Clock, CheckCircle, XCircle, HelpCircle } from 'lucide-react';

const applications = [
  {
    id: '1',
    jobTitle: 'Assistenzarzt (m/w/d) - Innere Medizin',
    company: 'Klinikum Berlin',
    location: 'Berlin',
    status: 'PENDING',
    appliedAt: '2024-04-15',
  },
  {
    id: '2',
    jobTitle: 'Facharzt für Chirurgie',
    company: 'Charité Universitätsmedizin',
    location: 'Berlin',
    status: 'REVIEWING',
    appliedAt: '2024-04-12',
  },
  {
    id: '3',
    jobTitle: 'Oberarzt (m/w/d) - Kardiologie',
    company: 'Herzzentrum Leipzig',
    location: 'Leipzig',
    status: 'SHORTLISTED',
    appliedAt: '2024-04-10',
  },
  {
    id: '4',
    jobTitle: 'Assistenzarzt - Pädiatrie',
    company: 'Kinderklinik München',
    location: 'München',
    status: 'REJECTED',
    appliedAt: '2024-04-08',
  },
];

const statusConfig = {
  PENDING: {
    label: 'Ausstehend',
    color: 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/50',
    icon: Clock,
  },
  REVIEWING: {
    label: 'In Prüfung',
    color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/50',
    icon: HelpCircle,
  },
  SHORTLISTED: {
    label: 'Vorauswahl',
    color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/50',
    icon: CheckCircle,
  },
  REJECTED: {
    label: 'Abgelehnt',
    color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/50',
    icon: XCircle,
  },
  ACCEPTED: {
    label: 'Angenommen',
    color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/50',
    icon: CheckCircle,
  },
};

export function RecentApplications() {
  return (
    <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Letzte Bewerbungen
          </h2>
          <Link
            href="/dashboard/applications"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1"
          >
            Alle anzeigen
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {applications.map((application) => {
            const status = statusConfig[application.status as keyof typeof statusConfig];
            const StatusIcon = status.icon;
            
            return (
              <li key={application.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {application.jobTitle}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {application.company} • {application.location}
                    </p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      Beworben am {new Date(application.appliedAt).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {status.label}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
