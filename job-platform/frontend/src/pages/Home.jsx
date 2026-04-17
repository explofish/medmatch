import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Search, Building2, Stethoscope, ArrowRight } from 'lucide-react'

export default function Home() {
  const { isAuthenticated, user } = useAuthStore()

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Find Your Perfect <span className="text-primary-600">Medical Career</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          MedMatch connects medical school graduates with top healthcare employers. 
          Whether you are looking for clinical or non-clinical roles, we help you find your path.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {!isAuthenticated ? (
            <>
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/jobs"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Browse Jobs
              </Link>
            </>
          ) : user?.userType === 'graduate' ? (
            <>
              <Link
                to="/matches"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                View My Matches
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/jobs"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Search Jobs
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/post-job"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                Post a Job
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                View Dashboard
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-white rounded-2xl shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose MedMatch?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Stethoscope className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Medical Focus</h3>
              <p className="text-gray-600">
                Specialized platform for medical professionals. Find opportunities in clinical and non-clinical fields.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Matching</h3>
              <p className="text-gray-600">
                Our algorithm matches you with jobs based on your specialization, location, and preferences.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Top Employers</h3>
              <p className="text-gray-600">
                Connect with leading hospitals, clinics, pharmaceutical companies, and healthcare startups.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold shrink-0">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">Create Your Profile</h3>
                <p className="text-gray-600">
                  Sign up as a medical graduate or employer. Add your specializations, experience, and preferences.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold shrink-0">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">Get Matched</h3>
                <p className="text-gray-600">
                  Our system suggests relevant jobs or candidates based on your profile and requirements.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold shrink-0">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">Connect & Apply</h3>
                <p className="text-gray-600">
                  Apply for jobs with one click or review applications from qualified candidates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
