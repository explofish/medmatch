import { useState } from 'react'
import { ArrowRight, Search, Building2, GraduationCap } from 'lucide-react'

export default function Hero() {
  const [email, setEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Track event
    if (typeof window !== 'undefined' && (window as any).plausible) {
      (window as any).plausible('Hero Signup Click')
    }
    // Redirect to signup
    window.location.href = `/signup?email=${encodeURIComponent(email)}`
  }

  return (
    <section className="bg-gradient-to-br from-primary-50 to-white py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-6">
              <GraduationCap className="w-4 h-4 mr-2" />
              Exklusiv für Medizinabsolventen
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Finde deinen{' '}
              <span className="text-primary-600">Traumjob</span>
              {' '}in der Medizin
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Die erste Job-Plattform speziell für Medizinstudenten und Ärzte. 
              Entdecke klinische und nicht-klinische Karrieremöglichkeiten 
              passend zu deiner Spezialisierung.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 mb-8">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Deine E-Mail-Adresse"
                className="flex-1 px-6 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-lg"
                required
              />
              <button
                type="submit"
                className="px-8 py-4 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
              >
                Jetzt registrieren
                <ArrowRight className="ml-2 w-5 h-5" />
              </button>
            </form>

            <div className="flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center">
                <Search className="w-4 h-4 mr-2 text-primary-600" />
                <span>500+ aktive Stellen</span>
              </div>
              <div className="flex items-center">
                <Building2 className="w-4 h-4 mr-2 text-primary-600" />
                <span>150+ Partner-Unternehmen</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="bg-white rounded-2xl shadow-2xl p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-gray-900">Neueste Stellenanzeigen</h3>
                <span className="text-sm text-primary-600 cursor-pointer hover:underline">Alle anzeigen</span>
              </div>
              
              <div className="space-y-4">
                {[
                  { title: 'Medical Affairs Manager', company: 'Pharma GmbH', location: 'München', type: 'Vollzeit', salary: '65.000 € - 85.000 €' },
                  { title: 'Clinical Research Associate', company: 'CRO Berlin', location: 'Berlin', type: 'Vollzeit', salary: '55.000 € - 70.000 €' },
                  { title: 'Arzt im Präsidium', company: 'Klinikum Stuttgart', location: 'Stuttgart', type: 'Vollzeit', salary: 'Verhandlungsbasis' },
                ].map((job, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors cursor-pointer">
                    <h4 className="font-medium text-gray-900">{job.title}</h4>
                    <p className="text-sm text-gray-500">{job.company} • {job.location}</p>
                    <div className="flex items-center gap-3 mt-2 text-sm">
                      <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">{job.type}</span>
                      <span className="text-primary-600">{job.salary}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
