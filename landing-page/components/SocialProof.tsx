import { Star, Quote } from 'lucide-react'

export default function SocialProof() {
  const testimonials = [
    {
      name: 'Dr. Lisa Schmidt',
      role: 'Fachärztin für Innere Medizin',
      quote: 'Über MedMatch habe ich meinen Traumjob in der Pharmaindustrie gefunden. Der Matching-Algorithmus hat genau den richtigen Arbeitgeber für mich identifiziert.',
      rating: 5
    },
    {
      name: 'Dr. Max Weber',
      role: 'Assistenzarzt',
      quote: 'Endlich eine Plattform, die versteht, was Mediziner brauchen. Die Jobs sind qualitativ hochwertig und die Unternehmen sind seriös.',
      rating: 5
    },
    {
      name: 'Dr. Anna Müller',
      role: 'Medical Writer',
      quote: 'Der Wechsel von der Klinik in die Industrie war dank MedMatch viel einfacher als erwartet. Die Beratung war top!',
      rating: 5
    }
  ]

  const stats = [
    { value: '2.500+', label: 'Registrierte Ärzte' },
    { value: '500+', label: 'Aktive Stellen' },
    { value: '150+', label: 'Partner-Unternehmen' },
    { value: '85%', label: 'Matching-Genauigkeit' }
  ]

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="text-4xl lg:text-5xl font-bold text-primary-600 mb-2">{stat.value}</div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Das sagen unsere Nutzer
          </h2>
          <p className="text-xl text-gray-600">
            Tausende Mediziner vertrauen auf MedMatch für ihre Karriere.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, idx) => (
            <div key={idx} className="bg-white rounded-xl p-8 shadow-sm">
              <Quote className="w-8 h-8 text-primary-200 mb-4" />
              
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              <p className="text-gray-700 mb-6 leading-relaxed">
                "{testimonial.quote}"
              </p>
              
              <div>
                <div className="font-semibold text-gray-900">{testimonial.name}</div>
                <div className="text-sm text-gray-500">{testimonial.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
