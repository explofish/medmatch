'use client';

import Link from 'next/link';
import { ArrowRight, MapPin, Euro, Building2 } from 'lucide-react';

const jobs = [
  {
    id: '1',
    title: 'Facharzt für Anästhesie (m/w/d)',
    company: 'Universitätsklinikum Hamburg',
    location: 'Hamburg',
    salaryMin: 65000,
    salaryMax: 85000,
    specialization: 'Anästhesie',
    employmentType: 'full_time',
    postedAt: '2024-04-18',
  },
  {
    id: '2',
    title: 'Assistenzarzt - Notfallmedizin',
    company: 'DRK Kliniken Berlin',
    location: 'Berlin',
    salaryMin: 55000,
    salaryMax: 70000,
    specialization: 'Notfallmedizin',
    employmentType: 'full_time',
    postedAt: '2024-04-17',
  },
  {
    id: '3',
    title: 'Oberarzt (m/w/d) - Neurologie',
    company: 'Schön Klinik',
    location: 'München',
    salaryMin: 80000,
    salaryMax: 100000,
    specialization: 'Neurologie',
    employmentType: 'full_time',
    postedAt: '2024-04-16',
  },
  {
    id: '4',
    title: 'Facharzt für Radiologie',
    company: 'Radiologisches Zentrum',
    location: 'Köln',
    salaryMin: 70000,
    salaryMax: 90000,
    specialization: 'Radiologie',
    employmentType: 'part_time',
    postedAt: '2024-04-15',
  },
];

const employmentTypeLabels: Record<string, string> = {
  full_time: 'Vollzeit',
  part_time: 'Teilzeit',
  temporary: 'Befristet',
};

export function RecommendedJobs() {
  return (
    <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Passende Stellenangebote
          </h2>
          <Link
            href="/dashboard/jobs"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1"
          >
            Alle anzeigen
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {jobs.map((job) => (
            <li key={job.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <Link href={`/dashboard/jobs/${job.id}`} className="block">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {job.title}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {job.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Euro className="h-3.5 w-3.5" />
                        {job.salaryMin.toLocaleString('de-DE')} - {job.salaryMax.toLocaleString('de-DE')} €
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 dark:bg-indigo-900/50 dark:text-indigo-300 dark:ring-indigo-300/20">
                        {job.specialization}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-300/20">
                        {employmentTypeLabels[job.employmentType]}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
