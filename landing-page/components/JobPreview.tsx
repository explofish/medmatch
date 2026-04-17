import { MapPin, Euro, Clock, ArrowRight } from 'lucide-react'

export default function JobPreview() {
  const jobs = [
    {
      title: 'Medical Affairs Manager',
      company: 'BioPharm Deutschland',
      location: 'München',
      type: 'Vollzeit',
      salary: '70.000 € - 90.000 €',
      tags: ['Pharma', 'Führung', 'Home Office']
    },
    {
      title: 'Clinical Research Associate II',
      company: 'Synexus Clinical Research',
      location: 'Hamburg',
      type: 'Vollzeit',
      salary: '55.000 € - 70.000 €',
      tags: ['Forschung', 'Klinische Studien']
    },
    {
      title: 'Berufseinsteiger Medical Writing',
      company: 'MedWrite GmbH',
      location: 'Berlin / Remote',
      type: 'Vollzeit',
      salary: '45.000 € - 55.000 €',
      tags: ['Einstieg', 'Remote', 'Schreiben']
    },
    {
      title: 'Arzt im Öffentlichen Gesundheitsdienst',
      company: 'Gesundheitsamt München',
      location: 'München',
      type: 'Vollzeit',
      salary: '65.000 € - 80.000 €',
      tags: ['Öffentlicher Dienst', 'Tarif']
    }
  ]

  return (
    <section className="py-20 bg-primary-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Aktuelle Stellenangebote
          </h2>
          <p className="text-xl text-primary-200 max-w-2xl mx-auto">
            Ein Auszug aus unseren aktuellen Job-Angeboten für Mediziner.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {jobs.map((job, idx) => (
            <div key={idx} className="bg-primary-800 rounded-xl p-6 hover:bg-primary-700 transition-colors cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold mb-1">{job.title}</h3>
                  <p className="text-primary-300">{job.company}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-primary-400" />
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-primary-300 mb-4">
                <span className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {job.location}
                </span>
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {job.type}
                </span>
                <span className="flex items-center">
                  <Euro className="w-4 h-4 mr-1" />
                  {job.salary}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {job.tags.map((tag, i) => (
                  <span key={i} className="px-3 py-1 bg-primary-700 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button className="px-8 py-4 bg-white text-primary-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
            Alle Stellenanzeigen ansehen
          </button>
        </div>
      </div>
    </section>
  )
}
