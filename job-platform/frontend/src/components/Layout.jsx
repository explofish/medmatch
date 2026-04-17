import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Briefcase, User, LogOut, Menu, X, Bell, Search, Heart } from 'lucide-react'
import { useState } from 'react'

export default function Layout() {
  const { isAuthenticated, user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const navLinks = []
  
  if (isAuthenticated) {
    navLinks.push({ to: '/profile', label: 'Profile', icon: User })
    
    if (user?.userType === 'graduate') {
      navLinks.push({ to: '/jobs', label: 'Find Jobs', icon: Search })
      navLinks.push({ to: '/matches', label: 'Matches', icon: Heart })
      navLinks.push({ to: '/applications', label: 'Applications', icon: Briefcase })
    } else if (user?.userType === 'employer') {
      navLinks.push({ to: '/dashboard', label: 'Dashboard', icon: Briefcase })
      navLinks.push({ to: '/post-job', label: 'Post Job', icon: Briefcase })
    }
  } else {
    navLinks.push({ to: '/jobs', label: 'Browse Jobs', icon: Search })
    navLinks.push({ to: '/login', label: 'Login', icon: User })
    navLinks.push({ to: '/register', label: 'Register', icon: User })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <Briefcase className="h-8 w-8 text-primary-600" />
                <span className="text-xl font-bold text-gray-900">MedMatch</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-4">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-100"
                >
                  <link.icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              ))}
              
              {isAuthenticated && (
                <>
                  <button className="p-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-gray-100 relative">
                    <Bell className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-gray-100"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </>
              )}
            </nav>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-gray-700 hover:bg-gray-100"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <link.icon className="h-5 w-5" />
                  <span>{link.label}</span>
                </Link>
              ))}
              
              {isAuthenticated && (
                <button
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center space-x-2 w-full px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-red-600 hover:bg-gray-100"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Briefcase className="h-5 w-5 text-primary-600" />
              <span className="font-semibold text-gray-900">MedMatch</span>
            </div>
            <p className="text-sm text-gray-500">
              Connecting medical graduates with their dream careers
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
