import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import { Search, MapPin, Briefcase, Euro, Loader2, Filter } from 'lucide-react'

export default function Jobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    location: '',
    jobType: '',
    specialization: '',
  })

  useEffect(() => {
    fetchJobs()
  }, [filters])

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.location) params.append('location', filters.location)
      if (filters.jobType) params.append('jobType', filters.jobType)
      if (filters.specialization) params.append('specialization', filters.specialization)
      
      const response = await api.get(`/jobs?${params.toString()}`)
      
      // Filter by search term client-side
      let filteredJobs = response.data
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filteredJobs = filteredJobs.filter(job => 
          job.title.toLowerCase().includes(searchLower) ||
          job.description?.toLowerCase().includes(searchLower) ||
          job.company_name?.toLowerCase().includes(searchLower)
        )
      }
      
      setJobs(filteredJobs)
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatSalary = (min, max, currency = 'EUR') => {
    if (!min && !max) return 'Salary not specified'
    const symbol = currency === 'EUR' ? '€' : currency
    if (min && max) return `${symbol}${min.toLocaleString()} - ${symbol}${max.toLocaleString()}`
    if (min) return `From ${symbol}${min.toLocaleString()}`
    return `Up to ${symbol}${max.toLocaleString()}`
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Browse Jobs</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Location"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <select
            value={filters.jobType}
            onChange={(e) => setFilters({ ...filters, jobType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Job Types</option>
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="locum">Locum</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>

          <button
            onClick={() => setFilters({ search: '', location: '', jobType: '', specialization: '' })}
            className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Clear Filters
          </button>
        </div>
      </div>

      {/* Job List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin h-8 w-8 text-primary-600" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
          <p className="text-gray-600">Try adjusting your search filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="block bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {job.title}
                  </h3>
                  <p className="text-primary-600 font-medium mb-2">
                    {job.company_name}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                    <span className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {job.location_city || 'Location not specified'}
                      {job.is_remote && ' (Remote)'}
                    </span>
                    <span className="flex items-center">
                      <Briefcase className="h-4 w-4 mr-1" />
                      {job.job_type?.replace('_', ' ')}
                    </span>
                    <span className="flex items-center">
                      <Euro className="h-4 w-4 mr-1" />
                      {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                    </span>
                  </div>

                  <p className="text-gray-600 line-clamp-2">
                    {job.description}
                  </p>

                  {job.specializations && job.specializations.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {job.specializations.slice(0, 3).map((spec) => (
                        <span
                          key={spec.id}
                          className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full"
                        >
                          {spec.name}
                        </span>
                      ))}
                      {job.specializations.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          +{job.specializations.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
