import { useState } from 'react'
import { ArrowRight, Check, AlertCircle } from 'lucide-react'
import { trackSignupSuccess } from '../lib/tracking'

// API Configuration - Glitch temporary hosting
// Replace with your actual Glitch project URL after deployment
const API_BASE_URL = 'https://medmatch-api.glitch.me'

export default function SignupCTA() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!agreed) {
      setError('Bitte akzeptiere die Nutzungsbedingungen und Datenschutzerklärung.')
      return
    }

    if (password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen lang sein.')
      return
    }

    setLoading(true)

    // Track signup attempt
    if (typeof window !== 'undefined' && (window as any).plausible) {
      (window as any).plausible('Signup Submit')
    }

    try {
      // Call Glitch API for signup
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          firstName: email.split('@')[0] || 'User', // Use email prefix as firstName
          lastName: 'Candidate', // Default lastName
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('Diese E-Mail ist bereits registriert.')
        }
        throw new Error(data.error || 'Registrierung fehlgeschlagen')
      }

      // Also store locally for backup/tracking
      const signups = JSON.parse(localStorage.getItem('medmatch_signups') || '[]')
      signups.push({
        email,
        timestamp: new Date().toISOString(),
        userType: 'graduate',
        apiId: data.data?.id
      })
      localStorage.setItem('medmatch_signups', JSON.stringify(signups))
      
      setSuccess(true)
      // Track signup across all analytics platforms
      trackSignupSuccess()
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Registrierung erfolgreich!
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Überprüfe deine E-Mail und bestätige deine Registrierung.
          </p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-8 py-4 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Zum Login
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="py-20 bg-primary-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Bereit für deinen nächsten Karriereschritt?
            </h2>
            <p className="text-xl text-primary-100 mb-6">
              Registriere dich kostenlos und finde noch heute deinen Traumjob in der Medizin.
            </p>
            <ul className="space-y-3 text-primary-100">
              <li className="flex items-center">
                <Check className="w-5 h-5 mr-3" />
                Kostenlose Registrierung
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 mr-3" />
                Personalisierte Job-Empfehlungen
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 mr-3" />
                Direkte Bewerbung mit einem Klick
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Jetzt kostenlos registrieren
            </h3>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail-Adresse
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="deine@email.de"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passwort
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Mindestens 6 Zeichen"
                  required
                  minLength={6}
                />
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label className="ml-2 text-sm text-gray-600">
                  Ich akzeptiere die{' '}
                  <a href="/terms" className="text-primary-600 hover:underline">Nutzungsbedingungen</a>
                  {' '}und die{' '}
                  <a href="/privacy" className="text-primary-600 hover:underline">Datenschutzerklärung</a>.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-8 py-4 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {loading ? (
                  'Registriere...'
                ) : (
                  <>
                    Registrieren
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-500">
              Bereits registriert?{' '}
              <a href="/login" className="text-primary-600 hover:underline font-medium">
                Hier anmelden
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
