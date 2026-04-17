import { UserPlus, Search, Send, Briefcase } from 'lucide-react'

export default function HowItWorks() {
  const steps = [
    {
      icon: UserPlus,
      step: '01',
      title: 'Profil erstellen',
      description: 'Erstelle in wenigen Minuten dein Profil mit Fachrichtung, Erfahrung und Präferenzen.'
    },
    {
      icon: Search,
      step: '02',
      title: 'Jobs entdecken',
      description: 'Unser Algorithmus zeigt dir passende Stellen – klinisch und nicht-klinisch.'
    },
    {
      icon: Send,
      step: '03',
      title: 'Mit einem Klick bewerben',
      description: 'Dein Profil ist deine Bewerbung. Kein lästiges Anschreiben mehr nötig.'
    },
    {
      icon: Briefcase,
      step: '04',
      title: 'Traumjob finden',
      description: 'Erhalte Feedback von Arbeitgebern und starte deine neue Karriere.'
    }
  ]

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            So funktioniert MedMatch
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            In vier einfachen Schritten zu deinem neuen Job in der Medizin.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, idx) => (
            <div key={idx} className="relative">
              <div className="text-6xl font-bold text-primary-100 mb-4">{step.step}</div>
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <step.icon className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
