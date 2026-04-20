'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Bell, Lock, Mail, Shield, Moon, Globe } from 'lucide-react';

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [jobAlerts, setJobAlerts] = useState(true);
  const [applicationUpdates, setApplicationUpdates] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Einstellungen
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Verwalten Sie Ihre Kontoeinstellungen und Präferenzen.
          </p>
        </div>

        <div className="space-y-6">
          {/* Notifications */}
          <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Bell className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Benachrichtigungen
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">E-Mail-Benachrichtigungen</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Erhalten Sie wichtige Updates per E-Mail
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-indigo-600 peer-focus:ring-4 peer-focus:ring-indigo-300 dark:bg-gray-700 dark:peer-focus:ring-indigo-800"></div>
                  <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-all peer-checked:left-5"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Job-Alerts</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Benachrichtigungen über neue passende Stellen
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={jobAlerts}
                    onChange={(e) => setJobAlerts(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-indigo-600 peer-focus:ring-4 peer-focus:ring-indigo-300 dark:bg-gray-700 dark:peer-focus:ring-indigo-800"></div>
                  <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-all peer-checked:left-5"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Bewerbungs-Updates</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Status-Updates zu Ihren Bewerbungen
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={applicationUpdates}
                    onChange={(e) => setApplicationUpdates(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-indigo-600 peer-focus:ring-4 peer-focus:ring-indigo-300 dark:bg-gray-700 dark:peer-focus:ring-indigo-800"></div>
                  <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-all peer-checked:left-5"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Moon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Erscheinungsbild
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Dunkler Modus</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Dunkles Farbschema verwenden
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={(e) => setDarkMode(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-indigo-600 peer-focus:ring-4 peer-focus:ring-indigo-300 dark:bg-gray-700 dark:peer-focus:ring-indigo-800"></div>
                  <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-all peer-checked:left-5"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Sprache</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Anzeigesprache der Plattform
                  </p>
                </div>
                <select className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Sicherheit
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Passwort ändern</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Aktualisieren Sie Ihr Passwort
                  </p>
                </div>
                <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                  Passwort ändern
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Zwei-Faktor-Authentifizierung</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Zusätzliche Sicherheit für Ihr Konto
                  </p>
                </div>
                <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                  Einrichten
                </button>
              </div>
            </div>
          </div>

          {/* Privacy */}
          <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Datenschutz
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Profilsichtbarkeit</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Wer kann Ihr Profil sehen
                  </p>
                </div>
                <select className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  <option value="public">Alle Arbeitgeber</option>
                  <option value="applied">Nur bei Bewerbungen</option>
                  <option value="private">Privat</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Konto löschen</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Alle Daten dauerhaft entfernen
                  </p>
                </div>
                <button className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-600 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30">
                  Konto löschen
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
