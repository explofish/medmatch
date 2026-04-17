import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { Loader2, Heart, MapPin, Building2, Euro, ArrowRight, Sparkles } from 'lucide-react'

export default function Matches() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchMatches()
  }, [])

  const fetchMatches = async () => {
    try {
      const response = await api.get('/matches/my-matches?minScore=40')
      setMatches(response.data)
    } catch (error) {
      toast.error('Failed to load matches')
    } finally {
      setLoading(false)
    }
  }

  const generateMatches = async () => {
    setGenerating(true)
    try {
      await api.post('/matches/generate')
      toast.success('New matches generated!')
      fetchMatches()
    } catch (error) {
      toast.error('Failed to generate matches')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async (id, saved) => {
    try {
      await api.patch(`/matches/${id}/save`, { saved })
      toast.success(saved ? 'Match saved' : 'Match removed')
      fetchMatches()
    } catch (error) {
      toast.error('Failed to update match')
    }
  }

  const formatSalary = (min, max, currency = 'EUR') => {
    if (!min && !max) return 'Not specified'
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Job Matches</h1>
        <button
          onClick={generateMatches}
          disabled={generating}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
        >
          {generating ? (
            <>
              <Loader2 className="animate-spin mr-2 h-5 w-5" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Find Matches
            </>
          )}
        </button>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No matches yet</h3>
          <p className="text-gray-600 mb-4">Complete your profile and click "Find Matches" to get personalized job recommendations</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <div
              key={match.id}
              className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-primary-500"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-primary-100 text-primary-700 text-sm font-medium rounded">
                      {match.match_score}% Match
                    </span>
                    {match.match_reasons && (
                      <span className="text-sm text-gray-500">
                        {match.match_reasons.join(', ')}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {match.title}
                  </h3>
                  
                  <div className="flex items-center space-x-2 text-primary-600 font-medium mb-3">
                    <Building2 className="h-4 w-4" />
                    <span>{match.company_name}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                    <span className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {match.location_city || 'Location not specified'}
                      {match.is_remote && ' (Remote)'}
                    </span>
                    <span className="flex items-center">
                      <Euro className="h-4 w-4 mr-1" />
                      {formatSalary(match.salary_min, match.salary_max)}
                    </span>
                  </div>

                  <Link
                    to={`/jobs/${match.job_id}`}
                    className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
                  >
                    View Job
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>

                <button
                  onClick={() => handleSave(match.id, !match.is_saved_by_graduate)}
                  className="ml-4 p-2 rounded-full hover:bg-gray-100"
                >
                  <Heart
                    className={`h-6 w-6 ${
                      match.is_saved_by_graduate
                        ? 'text-red-500 fill-current'
                        : 'text-gray-400'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
