import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Loader2, Plus, X } from 'lucide-react'

export default function PostJob() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [specializations, setSpecializations] = useState([])
  const [selectedSpecs, setSelectedSpecs] = useState([])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  // Fetch specializations
  useState(() => {
    const fetchSpecs = async () => {
      try {
        const response = await api.get('/specializations')
        setSpecializations(response.data)
      } catch (error) {
        console.error('Failed to fetch specializations')
      }
    }
    fetchSpecs()
  }, [])

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      const jobData = {
        ...data,
        specializations: selectedSpecs.map(spec => ({
          id: spec.id,
          isRequired: spec.isRequired
        })),
      }

      await api.post('/jobs', jobData)
      toast.success('Job posted successfully!')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to post job')
    } finally {
      setIsLoading(false)
    }
  }

  const addSpecialization = (specId) => {
    const spec = specializations.find(s => s.id === specId)
    if (spec && !selectedSpecs.find(s => s.id === specId)) {
      setSelectedSpecs([...selectedSpecs, { ...spec, isRequired: true }])
    }
  }

  const removeSpecialization = (specId) => {
    setSelectedSpecs(selectedSpecs.filter(s => s.id !== specId))
  }

  const toggleRequired = (specId) => {
    setSelectedSpecs(selectedSpecs.map(s => 
      s.id === specId ? { ...s, isRequired: !s.isRequired } : s
    ))
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Post a New Job</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        {/* Job Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Job Title *
          </label>
          <input
            type="text"
            {...register('title', { required: 'Job title is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., Medical Affairs Manager"
          />
          {errors.title && (
            <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Job Description *
          </label>
          <textarea
            {...register('description', { required: 'Description is required' })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Describe the role, responsibilities, and what you're looking for..."
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
          )}
        </div>

        {/* Requirements */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Requirements
          </label>
          <textarea
            {...register('requirements')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="List required qualifications, experience, etc."
          />
        </div>

        {/* Location */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              {...register('locationCity')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., München"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <input
              type="text"
              {...register('locationState')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Bayern"
            />
          </div>
        </div>

        {/* Work Type */}
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('isRemote')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Remote available</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('isHybrid')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Hybrid</span>
          </label>
        </div>

        {/* Job Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Job Type *
          </label>
          <select
            {...register('jobType', { required: 'Job type is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select job type</option>
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="locum">Locum</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
          {errors.jobType && (
            <p className="text-red-500 text-sm mt-1">{errors.jobType.message}</p>
          )}
        </div>

        {/* Salary */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Salary (€)
            </label>
            <input
              type="number"
              {...register('salaryMin', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., 50000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maximum Salary (€)
            </label>
            <input
              type="number"
              {...register('salaryMax', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., 80000"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin mr-2 h-5 w-5" />
                Posting...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-5 w-5" />
                Post Job
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
