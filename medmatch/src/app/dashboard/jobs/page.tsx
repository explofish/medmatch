'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Search, MapPin, Euro, Building2, Filter, Bookmark, Clock } from 'lucide-react';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  employmentType: string;
  experienceLevel: string;
  specialization: string;
  description: string;
  postedAt: string;
  expiresAt: string;
}

const mockJobs: Job[] = [
  {
    id: '1',
    title: 'Facharzt für Anästhesie (m/w/d)',
    company: 'Universitätsklinikum Hamburg',
    location: 'Hamburg',
    salaryMin: 65000,
    salaryMax: 85000,
    salaryCurrency: 'EUR',
    employmentType: 'full_time',
    experienceLevel: 'specialist',
    specialization: 'Anästhesie',
    description: 'Wir suchen einen engagierten Facharzt für Anästhesie zur Verstärkung unseres Teams.',
    postedAt: '2024-04-18',
    expiresAt: '2024-05-18',
  },
  {
    id: '2',
    title: 'Assistenzarzt - Notfallmedizin',
    company: 'DRK Kliniken Berlin',
    location: 'Berlin',
    salaryMin: 55000,
    salaryMax: 70000,
    salaryCurrency: 'EUR',
    employmentType: 'full_time',
    experienceLevel: 'entry',
    specialization: 'Notfallmedizin',
    description: 'Eintrittsgelegenheit für Assistenzärzte in der Notfallmedizin.',
    postedAt: '2024-04-17',
    expiresAt: '2024-06-17',
  },
  {
    id: '3',
    title: 'Oberarzt (m/w/d) - Neurologie',
    company: 'Schön Klinik',
    location: 'München',
    salaryMin: 80000,
    salaryMax: 100000,
    salaryCurrency: 'EUR',
    employmentType: 'full_time',
    experienceLevel: 'senior',
    specialization: 'Neurologie',
    description: 'Leitungsposition in der Neurologie mit Entwicklungsmöglichkeiten.',
    postedAt: '2024-04-16',
    expiresAt: '2024-05-16',
  },
  {
    id: '4',
    title: 'Facharzt für Radiologie (Teilzeit möglich)',
    company: 'Radiologisches Zentrum',
    location: 'Köln',
    salaryMin: 70000,
    salaryMax: 90000,
    salaryCurrency: 'EUR',
    employmentType: 'part_time',
    experienceLevel: 'specialist',
    specialization: 'Radiologie',
    description: 'Flexible Arbeitszeiten, moderne Ausstattung, familienfreundlich.',
    postedAt: '2024-04-15',
    expiresAt: '2024-06-15',
  },
  {
    id: '5',
    title: 'Assistenzarzt - Innere Medizin',
    company: 'Klinikum Stuttgart',
    location: 'Stuttgart',
    salaryMin: 52000,
    salaryMax: 68000,
    salaryCurrency: 'EUR',
    employmentType: 'full_time',
    experienceLevel: 'entry',
    specialization: 'Innere Medizin',
    description: 'Breites Spektrum der Inneren Medizin mit Weiterbildungsmöglichkeiten.',
    postedAt: '2024-04-14',
    expiresAt: '2024-05-14',
  },
  {
    id: '6',
    title: 'Facharzt für Kardiologie',
    company: 'Herzzentrum Leipzig',
    location: 'Leipzig',
    salaryMin: 75000,
    salaryMax: 95000,
    salaryCurrency: 'EUR',
    employmentType: 'full_time',
    experienceLevel: 'specialist',
    specialization: 'Kardiologie',
    description: 'Spezialisierte Kardiologie-Abteilung mit Herzkatheterlabor.',
    postedAt: '2024-04-13',
    expiresAt: '2024-06-13',
  },
];

const employmentTypeLabels: Record<string, string> = {
  full_time: 'Vollzeit',
  part_time: 'Teilzeit',
  temporary: 'Befristet',
};

const experienceLevelLabels: Record<string, string> = {
  entry: 'Einstieg',
  intermediate: 'Mit Berufserfahrung',
  specialist: 'Facharzt',
  senior: 'Oberarzt/Leitung',
};

const specializations = [
  'Alle',
  'Innere Medizin',
  'Chirurgie',
  'Anästhesie',
  'Radiologie',
  'Kardiologie',
  'Neurologie',
  'Pädiatrie',
  'Notfallmedizin',
];

export default function JobsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('Alle');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());

  const filteredJobs = mockJobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSpecialization =
      selectedSpecialization === 'Alle' || job.specialization === selectedSpecialization;
    
    const matchesLocation =
      !selectedLocation || job.location.toLowerCase().includes(selectedLocation.toLowerCase());

    return matchesSearch && matchesSpecialization && matchesLocation;
  });

  const toggleSaveJob = (jobId: string) => {
    setSavedJobs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Stellenangebote
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Finden Sie Ihre nächste berufliche Herausforderung im Gesundheitswesen.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Stellenbezeichnung, Fachrichtung oder Unternehmen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedSpecialization}
                onChange={(e) => setSelectedSpecialization(e.target.value)}
                className="rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {specializations.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Ort"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-40 rounded-md border border-gray-300 py-2.5 pl-9 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filteredJobs.length} Stellenangebote gefunden
          </p>
          <button className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400">
            <Filter className="h-4 w-4" />
            Erweiterte Filter
          </button>
        </div>

        {/* Job Listings */}
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="rounded-xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {job.title}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {job.company}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Euro className="h-4 w-4" />
                          {job.salaryMin.toLocaleString('de-DE')} - {job.salaryMax.toLocaleString('de-DE')} €
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(job.postedAt).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSaveJob(job.id)}
                      className={`rounded-full p-2 transition-colors ${
                        savedJobs.has(job.id)
                          ? 'text-yellow-500 hover:text-yellow-600'
                          : 'text-gray-400 hover:text-yellow-500'
                      }`}
                    >
                      <Bookmark
                        className="h-5 w-5"
                        fill={savedJobs.has(job.id) ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>

                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                    {job.description}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 dark:bg-indigo-900/50 dark:text-indigo-300 dark:ring-indigo-300/20">
                      {job.specialization}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-900/50 dark:text-green-300 dark:ring-green-300/20">
                      {experienceLevelLabels[job.experienceLevel]}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-300/20">
                      {employmentTypeLabels[job.employmentType]}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <Link
                      href={`/dashboard/jobs/${job.id}`}
                      className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                    >
                      Details anzeigen
                    </Link>
                    <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                      Jetzt bewerben
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm dark:bg-gray-800">
            <p className="text-gray-500 dark:text-gray-400">
              Keine Stellenangebote gefunden. Passen Sie Ihre Suchkriterien an.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
