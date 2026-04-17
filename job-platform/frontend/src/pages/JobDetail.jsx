import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import { MapPin, Briefcase, Euro, Building2, Calendar, Loader2, Send, ArrowLeft } from 'lucide-react'

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [showApplyForm, setShowApplyForm] = useState(false)

  useEffect(() => {
    fetchJob()
  }, [id])

  const fetchJob = async () => {
    try {
      const response = await api.get(`/jobs/${id}`)
      setJob(response.data)
    } catch (error) {
      toast.error('Failed to load job details')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) {
      toast.error('Please login to apply')
      navigate('/login', { state: { from: { pathname: `/jobs/${id}` } } })
      return
    }

    setApplying(true)
    try {
      await api.post('/applications', {
        jobId: id,
        coverLetter,
      })
      toast.success('Application submitted successfully!')
      setShowApplyForm(false)
      setCoverLetter('')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit application')
    } finally {
      setApplying(false)
    }
  }

  const formatSalary = (min, max, currency = 'EUR') => {
    if (!min && !max) return 'Salary not specified'
    const symbol = currency === 'EUR' ? '€' : currency
    if (min && max) return `${symbol}${min.toLocaleString()} - ${symbol}${max.toLocaleString()}`
    if (min) return `From ${symbol}${min.toLocaleString()}`
    return `Up to ${symbol}${max.toLocaleString()}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin h-8 w-8 text-primary-600" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Job not found</h2>
        <button
          onClick={() => navigate('/jobs')}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          Back to jobs
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/jobs')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to jobs
      </button>

      <div className="bg-white rounded-lg shadow-sm p-8">
        {/* Header */}
        <div className="border-b pb-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{job.title}</h1>
          
          <div className="flex items-center space-x-2 text-primary-600 font-medium mb-4">
            <Building2 className="h-5 w-5" />
            <span className="text-lg">{job.company_name}</span>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span className="flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              {job.location_city || 'Location not specified'}
              {job.location_state && `, ${job.location_state}`}
              {job.is_remote && ' (Remote available)'}
            </span>
            <span className="flex items-center">
              <Briefcase className="h-4 w-4 mr-1" />
              {job.job_type?.replace('_', ' ')}
            </span>
            <span className="flex items-center">
              <Euro className="h-4 w-4 mr-1" />
              {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
            </span>
            {job.application_deadline && (
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Apply by {new Date(job.application_deadline).toLocaleDateString()}
              </span>
            )}
          </div>

          {job.specializations && job.specializations.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {job.specializations.map((spec) => (
                <span
                  key={spec.id}
                  className={`px-3 py-1 text-sm rounded-full ${
                    spec.isRequired
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {spec.name} {spec.isRequired && '(Required)'}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Description</h2>
            <p className="text-gray-600 whitespace-pre-line">{job.description}</p>
          </section>

          {job.responsibilities && (
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Responsibilities</h2>
              <p className="text-gray-600 whitespace-pre-line">{job.responsibilities}</p>
            </section>
          )}

          {job.requirements && (
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Requirements</h2>
              <p className="text-gray-600 whitespace-pre-line">{job.requirements}</p>
            </section>
          )}
        </div>

        {/* Apply Section */}
        {user?.userType === 'graduate' && job.status === 'active' && (
          <div className="mt-8 pt-6 border-t">
            {!showApplyForm ? (
              <button
                onClick={() => setShowApplyForm(true)}
                className="w-full bg-primary-600 text-white py-3 px-6 rounded-md hover:bg-primary-700 font-medium"
              >
                Apply for this position
              </button>
            ) : (
              <form onSubmit={handleApply} className="space-y-4">
                <h3 className="text-lg font-semibold">Submit Application</h3>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Write a brief cover letter (optional)..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={4}
                />
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={applying}
                    className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center"
                  >
                    {applying ? (
                      <>
                        <Loader2 className="animate-spin mr-2 h-5 w-5" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-5 w-5" />
                        Submit Application
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowApplyForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
