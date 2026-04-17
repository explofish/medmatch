import { Target, Zap, Shield, Users } from 'lucide-react'

export default function ValueProps() {
  const values = [
    {
      icon: Target,
      title: 'Spezialisierte Matching',
      description: 'Unser Algorithmus findet Jobs passend zu deiner Fachrichtung, Erfahrung und Ortspräferenz.'
    },
    {
      icon: Zap,
      title: 'Schnelle Bewerbung',
      description: 'Bewirb dich mit einem Klick. Dein Profil ist deine Bewerbung – kein lästiges Copy-Paste mehr.'
    },
    {
      icon: Shield,
      title: 'Verifizierte Arbeitgeber',
      description: 'Alle Unternehmen werden von uns geprüft. Keine dubiosen Angebote, nur seriöse Karrierechancen.'
    },
    {
      icon: Users,
      title: 'Community & Networking',
      description: 'Vernetze dich mit anderen Medizinern und erhalte Insider-Tipps zu Arbeitgebern.'
    }
  ]

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Warum MedMatch?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Wir kennen die Herausforderungen der medizinischen Berufswelt und haben die Lösung entwickelt.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {values.map((value, idx) => (
            <div key={idx} className="text-center p-6 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <value.icon className="w-7 h-7 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{value.title}</h3>
              <p className="text-gray-600">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
