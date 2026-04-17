import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { Loader2, Briefcase, Users, Clock, CheckCircle, Building2, MapPin, Plus } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    pendingApplications: 0,
  })
  const [recentApplications, setRecentApplications] = useState([])
  const [myJobs, setMyJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch employer jobs
      const jobsResponse = await api.get('/employers/me/jobs')
      setMyJobs(jobsResponse.data)

      // Calculate stats
      const activeJobs = jobsResponse.data.filter(j => j.status === 'active')
      const totalApplications = jobsResponse.data.reduce((acc, job) => 
        acc + parseInt(job.applications_count || 0), 0
      )
      
      setStats({
        totalJobs: jobsResponse.data.length,
        activeJobs: activeJobs.length,
        totalApplications,
        pendingApplications: 0,
      })

      // Fetch recent applications
      const appsResponse = await api.get('/applications/received?limit=5')
      setRecentApplications(appsResponse.data)
    } catch (error) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const statusLabels = {
    submitted: 'New',
    viewed: 'Viewed',
    shortlisted: 'Shortlisted',
    interview_scheduled: 'Interview',
    offer_made: 'Offer',
    hired: 'Hired',
    rejected: 'Rejected',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin h-8 w-8 text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Employer Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Jobs</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalJobs}</p>
            </div>
            <Briefcase className="h-8 w-8 text-primary-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Jobs</p>
              <p className="text-3xl font-bold text-green-600">{stats.activeJobs}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Applications</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalApplications}</p>
            </div>
            <Users className="h-8 w-8 text-primary-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-3xl font-bold text-yellow-600">
                {recentApplications.filter(a => a.status === 'submitted').length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Applications</h2>
        
        {recentApplications.length === 0 ? (
          <p className="text-gray-600">No applications received yet</p>
        ) : (
          <div className="space-y-4">
            {recentApplications.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {app.first_name} {app.last_name}
                    </h3>
                    <p className="text-sm text-gray-600">{app.job_title}</p>
                  </div>
                </div>
                
                <span className="text-sm font-medium capitalize px-3 py-1 bg-gray-100 rounded-full">
                  {statusLabels[app.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Jobs */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">My Job Postings</h2>
          <Link
            to="/post-job"
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Post New Job
          </Link>
        </div>
        
        {myJobs.length === 0 ? (
          <p className="text-gray-600">No jobs posted yet. Create your first job posting!</p>
        ) : (
          <div className="space-y-4">
            {myJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h3 className="font-medium text-gray-900">{job.title}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                    <span className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {job.location_city || 'No location'}
                    </span>
                    <span className="capitalize">{job.status}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <span className="block text-2xl font-bold text-primary-600">
                      {job.applications_count || 0}
                    </span>
                    <span className="text-xs text-gray-600">Applications</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
