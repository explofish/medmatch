'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  User,
  Briefcase,
  FileText,
  Settings,
  Menu,
  X,
  LogOut,
  Bell,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Profile', href: '/dashboard/profile', icon: User },
  { name: 'Jobs', href: '/dashboard/jobs', icon: Briefcase },
  { name: 'Applications', href: '/dashboard/applications', icon: FileText },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar */}
      <div className="lg:hidden">
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-gray-900/80 transition-opacity"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white dark:bg-gray-800">
              <div className="absolute right-0 top-0 -mr-12 pt-4">
                <button
                  type="button"
                  className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>
              <SidebarContent pathname={pathname} />
            </div>
          </div>
        )}
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4 dark:border-gray-700 dark:bg-gray-800">
          <SidebarContent pathname={pathname} />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top header */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 dark:text-gray-300 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 items-center justify-end gap-x-4 self-stretch lg:gap-x-6">
            {/* Notifications */}
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <span className="sr-only">View notifications</span>
              <Bell className="h-6 w-6" />
            </button>

            {/* Profile dropdown */}
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                JD
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-8 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <>
      <div className="flex h-16 shrink-0 items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">MM</span>
          </div>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            MedMatch
          </span>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-1">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-indigo-400'
                      }`}
                    >
                      <item.icon
                        className={`h-6 w-6 shrink-0 ${
                          isActive
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-gray-400 group-hover:text-indigo-600 dark:text-gray-400 dark:group-hover:text-indigo-400'
                        }`}
                      />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
          <li className="mt-auto">
            <Link
              href="/api/auth/signout"
              className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-red-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-red-400"
            >
              <LogOut className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-red-600 dark:text-gray-400 dark:group-hover:text-red-400" />
              Sign out
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
}
