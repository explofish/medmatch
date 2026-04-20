'use client';

import { Briefcase, FileText, Star, TrendingUp } from 'lucide-react';

type ChangeType = 'positive' | 'negative' | 'neutral';

interface Stat {
  name: string;
  value: string;
  change: string;
  changeType: ChangeType;
  icon: React.ElementType;
}

const stats: Stat[] = [
  {
    name: 'Aktive Bewerbungen',
    value: '12',
    change: '+2',
    changeType: 'positive',
    icon: FileText,
  },
  {
    name: 'Vorgemerkte Jobs',
    value: '8',
    change: '+3',
    changeType: 'positive',
    icon: Star,
  },
  {
    name: 'Neue Stellen',
    value: '24',
    change: 'diese Woche',
    changeType: 'neutral',
    icon: Briefcase,
  },
  {
    name: 'Profilaufrufe',
    value: '156',
    change: '+12%',
    changeType: 'positive',
    icon: TrendingUp,
  },
];

export function DashboardStats() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.name}
          className="relative overflow-hidden rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800"
        >
          <dt>
            <div className="absolute rounded-lg bg-indigo-50 p-3 dark:bg-indigo-900/50">
              <stat.icon
                className="h-6 w-6 text-indigo-600 dark:text-indigo-400"
                aria-hidden="true"
              />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-500 dark:text-gray-400">
              {stat.name}
            </p>
          </dt>
          <dd className="ml-16 flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {stat.value}
            </p>
            <p
              className={`ml-2 flex items-baseline text-sm font-semibold ${
                stat.changeType === 'positive'
                  ? 'text-green-600 dark:text-green-400'
                  : stat.changeType === 'negative'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {stat.change}
            </p>
          </dd>
        </div>
      ))}
    </div>
  );
}
