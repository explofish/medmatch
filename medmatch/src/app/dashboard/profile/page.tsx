'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { User, Mail, Phone, MapPin, GraduationCap, Building2, FileText, Briefcase } from 'lucide-react';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  specialization: string;
  graduationYear: string;
  university: string;
  bio: string;
  skills: string[];
  cvUrl: string;
}

const initialProfile: ProfileData = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+49 170 1234567',
  location: 'Berlin',
  specialization: 'Innere Medizin',
  graduationYear: '2022',
  university: 'Charité - Universitätsmedizin Berlin',
  bio: 'Ich bin ein engagierter Arzt mit Leidenschaft für die patientenzentrierte Versorgung. Meine Schwerpunkte liegen in der Diagnostik und Therapie komplexer Erkrankungen.',
  skills: ['Diagnostik', 'Patientenversorgung', 'Medizinische Dokumentation', 'Teamarbeit'],
  cvUrl: '',
};

const specializations = [
  'Innere Medizin',
  'Chirurgie',
  'Anästhesie',
  'Radiologie',
  'Kardiologie',
  'Neurologie',
  'Pädiatrie',
  'Orthopädie',
  'Dermatologie',
  'Notfallmedizin',
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSkillsChange = (skillsString: string) => {
    const skills = skillsString.split(',').map((s) => s.trim()).filter(Boolean);
    setProfile((prev) => ({ ...prev, skills }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setMessage({ type: 'success', text: 'Profil erfolgreich aktualisiert!' });
      setIsEditing(false);
    } catch {
      setMessage({ type: 'error', text: 'Fehler beim Speichern. Bitte versuchen Sie es erneut.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Mein Profil
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Verwalten Sie Ihre persönlichen Informationen und Qualifikationen.
            </p>
          </div>
          <button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={isSaving}
            className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${
              isEditing
                ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSaving ? 'Wird gespeichert...' : isEditing ? 'Speichern' : 'Bearbeiten'}
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 rounded-md p-4 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                : 'bg-red-50 text-red-800 dark:bg-red-900/50 dark:text-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          {/* Personal Information */}
          <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Persönliche Informationen
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Vorname
                  </label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={!isEditing}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nachname
                  </label>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={!isEditing}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    E-Mail
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100 text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!isEditing}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Standort
                  </label>
                  <input
                    type="text"
                    value={profile.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    disabled={!isEditing}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Berufliche Informationen
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fachrichtung
                  </label>
                  {isEditing ? (
                    <select
                      value={profile.specialization}
                      onChange={(e) => handleInputChange('specialization', e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      {specializations.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={profile.specialization}
                      disabled
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100 text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <GraduationCap className="h-4 w-4" />
                    Abschlussjahr
                  </label>
                  <input
                    type="number"
                    value={profile.graduationYear}
                    onChange={(e) => handleInputChange('graduationYear', e.target.value)}
                    disabled={!isEditing}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    Universität/Hochschule
                  </label>
                  <input
                    type="text"
                    value={profile.university}
                    onChange={(e) => handleInputChange('university', e.target.value)}
                    disabled={!isEditing}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fähigkeiten (kommagetrennt)
                  </label>
                  <input
                    type="text"
                    value={profile.skills.join(', ')}
                    onChange={(e) => handleSkillsChange(e.target.value)}
                    disabled={!isEditing}
                    placeholder="z.B. Diagnostik, Patientenversorgung, Teamarbeit"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Aktuelle Fähigkeiten: {profile.skills.join(', ')}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Über mich
                  </label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    disabled={!isEditing}
                    rows={4}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CV Upload */}
          <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Lebenslauf
              </h2>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="cv-upload"
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 ${
                    !isEditing && 'pointer-events-none opacity-50'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Klicken Sie zum Hochladen</span> oder ziehen Sie die Datei hierher
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PDF oder DOCX (max. 10MB)</p>
                  </div>
                  <input id="cv-upload" type="file" className="hidden" accept=".pdf,.docx" disabled={!isEditing} />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
