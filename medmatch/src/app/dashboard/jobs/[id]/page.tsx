'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ArrowLeft, MapPin, Euro, Building2, Clock, Calendar, Bookmark, Share2 } from 'lucide-react';

const jobDetails = {
  id: '1',
  title: 'Facharzt für Anästhesie (m/w/d)',
  company: 'Universitätsklinikum Hamburg',
  companyDescription: 'Das Universitätsklinikum Hamburg ist eines der führenden Krankenhäuser in Norddeutschland mit über 1.500 Betten und einem hochmodernen OP-Trakt.',
  location: 'Hamburg',
  salaryMin: 65000,
  salaryMax: 85000,
  salaryCurrency: 'EUR',
  employmentType: 'full_time',
  experienceLevel: 'specialist',
  specialization: 'Anästhesie',
  description: `Wir suchen zum nächstmöglichen Zeitpunkt einen engagierten Facharzt für Anästhesie zur Verstärkung unseres Teams.

Zu Ihren Aufgaben gehören:
• Durchführung von Anästhesien in allen operativem Fächern
• Präoperative Evaluation und Aufklärung von Patienten
• Postoperative Schmerztherapie
• Betreuung auf der Intensivstation
• Teilnahme am Notarztdienst

Wir bieten:
• Attraktive Vergütung nach Tarifvertrag (TV-Ärzte VK)
• Flexible Arbeitszeitmodelle
• Fort- und Weiterbildungsmöglichkeiten
• Moderne Arbeitsplätze und Ausstattung
• Betriebliche Altersvorsorge
• Jobticket und Mitarbeiterrabatte`,
  requirements: `• Facharztanerkennung für Anästhesiologie
• Berufserfahrung im operativen Bereich wünschenswert
• Bereitschaft zur Teilnahme am Notarztdienst
• Teamfähigkeit und Kommunikationsstärke
• Sehr gute Deutschkenntnisse`,
  benefits: ['Betriebliche Altersvorsorge', 'Jobticket', 'Fortbildungsbudget', 'Kantine', 'Kinderbetreuung'],
  postedAt: '2024-04-18',
  expiresAt: '2024-05-18',
  contactName: 'Dr. Maria Schmidt',
  contactEmail: 'karriere@uk-hamburg.de',
};

const employmentTypeLabels: Record<string, string> = {
  full_time: 'Vollzeit',
  part_time: 'Teilzeit',
  temporary: 'Befristet',
};

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;

  // In a real app, fetch job details based on jobId
  const job = jobDetails;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          href="/dashboard/jobs"
          className="mb-6 inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Zurück zur Übersicht
        </Link>

        {/* Job Header */}
        <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
          <div className="p-6 md:p-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 dark:bg-indigo-900/50 dark:text-indigo-300 dark:ring-indigo-300/20">
                    {job.specialization}
                  </span>
                  <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-900/50 dark:text-green-300 dark:ring-green-300/20">
                    {employmentTypeLabels[job.employmentType]}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
                  {job.title}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
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
                    <Calendar className="h-4 w-4" />
                    Veröffentlicht: {new Date(job.postedAt).toLocaleDateString('de-DE')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Bewerbung bis: {new Date(job.expiresAt).toLocaleDateString('de-DE')}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="rounded-full p-2 text-gray-400 hover:text-yellow-500 dark:text-gray-400 dark:hover:text-yellow-500">
                  <Bookmark className="h-5 w-5" />
                </button>
                <button className="rounded-full p-2 text-gray-400 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400">
                  <Share2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="inline-flex items-center rounded-md bg-indigo-600 px-6 py-3 text-base font-medium text-white hover:bg-indigo-500">
                Jetzt bewerben
              </button>
              <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                <Bookmark className="mr-2 h-4 w-4" />
                Speichern
              </button>
            </div>
          </div>
        </div>

        {/* Job Content */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Stellenbeschreibung
                </h2>
                <div className="mt-4 prose prose-sm max-w-none text-gray-600 dark:text-gray-300 whitespace-pre-line">
                  {job.description}
                </div>
              </div>
            </div>

            {/* Requirements */}
            <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Anforderungen
                </h2>
                <div className="mt-4 prose prose-sm max-w-none text-gray-600 dark:text-gray-300 whitespace-pre-line">
                  {job.requirements}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Company Info */}
            <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
              <div className="p-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Über das Unternehmen
                </h3>
                <div className="mt-3">
                  <p className="font-medium text-gray-900 dark:text-white">{job.company}</p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    {job.companyDescription}
                  </p>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
              <div className="p-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Benefits
                </h3>
                <ul className="mt-3 space-y-2">
                  {job.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <span className="mr-2 text-green-500">✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Contact */}
            <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
              <div className="p-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Kontakt
                </h3>
                <div className="mt-3 text-sm">
                  <p className="font-medium text-gray-900 dark:text-white">{job.contactName}</p>
                  <a
                    href={`mailto:${job.contactEmail}`}
                    className="mt-1 block text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    {job.contactEmail}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
