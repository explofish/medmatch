import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Loader2, Briefcase, MapPin, Building2, Clock, CheckCircle, XCircle, Hourglass } from 'lucide-react'

const statusIcons = {
  submitted: <Hourglass className="h-5 w-5 text-yellow-500" />,
  viewed: <CheckCircle className="h-5 w-5 text-blue-500" />,
  shortlisted: <CheckCircle className="h-5 w-5 text-green-500" />,
  interview_scheduled: <Clock className="h-5 w-5 text-purple-500" />,
  offer_made: <CheckCircle className="h-5 w-5 text-green-600" />,
  hired: <CheckCircle className="h-5 w-5 text-green-700" />,
  rejected: <XCircle className="h-5 w-5 text-red-500" />,
  withdrawn: <XCircle className="h-5 w-5 text-gray-400" />,
}

const statusLabels = {
  submitted: 'Submitted',
  viewed: 'Viewed',
  shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview Scheduled',
  offer_made: 'Offer Made',
  hired: 'Hired',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

export default function Applications() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      const response = await api.get('/applications/my-applications')
      setApplications(response.data)
    } catch (error) {
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async (id) => {
    if (!confirm('Are you sure you want to withdraw this application?')) return
    
    try {
      await api.delete(`/applications/${id}`)
      toast.success('Application withdrawn')
      fetchApplications()
    } catch (error) {
      toast.error('Failed to withdraw application')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin h-8 w-8 text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>

      {applications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
          <p className="text-gray-600">Start applying for jobs to track your applications here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {app.job_title}
                  </h3>
                  
                  <div className="flex items-center space-x-2 text-primary-600 font-medium mb-3">
                    <Building2 className="h-4 w-4" />
                    <span>{app.company_name}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                    <span className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {app.location_city || 'Location not specified'}
                    </span>
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      Applied {new Date(app.submitted_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {statusIcons[app.status]}
                    <span className={`font-medium ${
                      app.status === 'rejected' ? 'text-red-600' :
                      app.status === 'hired' ? 'text-green-700' :
                      app.status === 'offer_made' ? 'text-green-600' :
                      'text-gray-700'
                    }`}>
                      {statusLabels[app.status]}
                    </span>
                  </div>
                </div>

                {['submitted', 'viewed'].includes(app.status) && (
                  <button
                    onClick={() => handleWithdraw(app.id)}
                    className="ml-4 text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Withdraw
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
