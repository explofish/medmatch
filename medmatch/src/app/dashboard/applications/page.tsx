'use client';

import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ArrowLeft, Clock, CheckCircle, XCircle, HelpCircle, ExternalLink } from 'lucide-react';

const applications = [
  {
    id: '1',
    jobId: '1',
    jobTitle: 'Assistenzarzt (m/w/d) - Innere Medizin',
    company: 'Klinikum Berlin',
    location: 'Berlin',
    status: 'PENDING',
    appliedAt: '2024-04-15',
    coverLetter: 'Sehr geehrte Damen und Herren, ich bewerbe mich um die Position...',
  },
  {
    id: '2',
    jobId: '2',
    jobTitle: 'Facharzt für Chirurgie',
    company: 'Charité Universitätsmedizin',
    location: 'Berlin',
    status: 'REVIEWING',
    appliedAt: '2024-04-12',
    coverLetter: 'Mit großem Interesse habe ich Ihre Stellenanzeige gelesen...',
  },
  {
    id: '3',
    jobId: '3',
    jobTitle: 'Oberarzt (m/w/d) - Kardiologie',
    company: 'Herzzentrum Leipzig',
    location: 'Leipzig',
    status: 'SHORTLISTED',
    appliedAt: '2024-04-10',
    coverLetter: 'Als erfahrener Kardiologe bewerbe ich mich um diese Position...',
  },
  {
    id: '4',
    jobId: '4',
    jobTitle: 'Assistenzarzt - Pädiatrie',
    company: 'Kinderklinik München',
    location: 'München',
    status: 'REJECTED',
    appliedAt: '2024-04-08',
    coverLetter: 'Die Pädiatrie ist meine Leidenschaft...',
  },
  {
    id: '5',
    jobId: '5',
    jobTitle: 'Facharzt für Anästhesie',
    company: 'Universitätsklinikum Hamburg',
    location: 'Hamburg',
    status: 'ACCEPTED',
    appliedAt: '2024-04-05',
    coverLetter: 'Ich freue mich auf die Möglichkeit...',
  },
];

const statusConfig = {
  PENDING: {
    label: 'Ausstehend',
    description: 'Ihre Bewerbung wurde eingereicht und wartet auf Prüfung.',
    color: 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/50',
    icon: Clock,
  },
  REVIEWING: {
    label: 'In Prüfung',
    description: 'Ihre Bewerbung wird aktuell geprüft.',
    color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/50',
    icon: HelpCircle,
  },
  SHORTLISTED: {
    label: 'In Vorauswahl',
    description: 'Herzlichen Glückwunsch! Sie befinden sich in der Vorauswahl.',
    color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/50',
    icon: CheckCircle,
  },
  REJECTED: {
    label: 'Abgelehnt',
    description: 'Leider wurde Ihre Bewerbung nicht berücksichtigt.',
    color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/50',
    icon: XCircle,
  },
  ACCEPTED: {
    label: 'Angenommen',
    description: 'Herzlichen Glückwunsch! Ihre Bewerbung wurde angenommen.',
    color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/50',
    icon: CheckCircle,
  },
};

export default function ApplicationsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Zurück zum Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Meine Bewerbungen
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Übersicht über alle Ihre eingereichten Bewerbungen.
          </p>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {applications.map((application) => {
            const status = statusConfig[application.status as keyof typeof statusConfig];
            const StatusIcon = status.icon;

            return (
              <div
                key={application.id}
                className="rounded-xl bg-white shadow-sm dark:bg-gray-800 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {application.jobTitle}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {application.company} • {application.location}
                      </p>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        {status.description}
                      </p>
                      <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                        Beworben am {new Date(application.appliedAt).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/jobs/${application.jobId}`}
                      className="ml-4 flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Stellenanzeige
                    </Link>
                  </div>

                  {/* Cover Letter Preview */}
                  <div className="mt-4 rounded-md bg-gray-50 p-4 dark:bg-gray-700/50">
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      {application.coverLetter}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-3">
                    {application.status === 'PENDING' && (
                      <button className="text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400">
                        Bewerbung zurückziehen
                      </button>
                    )}
                    {application.status === 'ACCEPTED' && (
                      <button className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500">
                        Termin vereinbaren
                      </button>
                    )}
                    <button className="text-sm font-medium text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400">
                      Details anzeigen
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {applications.length === 0 && (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm dark:bg-gray-800">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Sie haben noch keine Bewerbungen eingereicht.
            </p>
            <Link
              href="/dashboard/jobs"
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Stellenangebote durchsuchen
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
