import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs = [
    {
      question: 'Für wen ist MedMatch geeignet?',
      answer: 'MedMatch richtet sich an Medizinstudenten, Assistenzärzte, Fachärzte und erfahrene Mediziner, die nach klinischen oder nicht-klinischen Karrieremöglichkeiten suchen. Egal ob du in der Klinik bleiben oder in die Industrie wechseln möchtest – wir haben passende Stellen für dich.'
    },
    {
      question: 'Ist die Nutzung von MedMatch kostenlos?',
      answer: 'Ja, die Registrierung und Nutzung von MedMatch ist für Arbeitssuchende komplett kostenlos. Du kannst dich kostenlos registrieren, dein Profil erstellen, Jobs durchsuchen und dich bewerben. Wir finanzieren uns über Partnerschaften mit Arbeitgebern.'
    },
    {
      question: 'Welche Arten von Jobs finde ich auf MedMatch?',
      answer: 'Wir bieten sowohl klinische als auch nicht-klinische Positionen: Ärztliche Tätigkeiten in Kliniken und Praxen, Medical Affairs, Clinical Research, Medical Writing, Gesundheitsmanagement, Beratung, und vieles mehr. Sowohl Vollzeit- als auch Teilzeitstellen sind verfügbar.'
    },
    {
      question: 'Wie funktioniert das Matching?',
      answer: 'Unser Algorithmus analysiert dein Profil (Fachrichtung, Erfahrung, Standortwünsche, Karriereziele) und vergleicht es mit den Anforderungen der Stellenangebote. Je besser die Übereinstimmung, desto höher wird die Stelle in deinen Empfehlungen angezeigt. Du kannst auch aktiv nach Jobs suchen und filtern.'
    },
    {
      question: 'Sind die Arbeitgeber verifiziert?',
      answer: 'Ja, wir prüfen alle Unternehmen, bevor sie Stellen bei uns schalten dürfen. Wir verifizieren die Unternehmensdaten und stellen sicher, dass es sich um seriöse Arbeitgeber handelt. Bewertungen anderer Ärzte helfen dir zusätzlich bei der Auswahl.'
    },
    {
      question: 'Wie lange dauert die Bewerbung?',
      answer: 'Mit MedMatch gehst du in wenigen Minuten zur Bewerbung. Da dein Profil bereits alle relevanten Informationen enthält, kannst du dich mit einem Klick bewerben – kein lästiges Copy-Paste von Lebenslauf und Anschreiben mehr. Die Rückmeldung vom Arbeitgeber erfolgt in der Regel innerhalb von 1-2 Wochen.'
    }
  ]

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Häufig gestellte Fragen
          </h2>
          <p className="text-xl text-gray-600">
            Alles, was du über MedMatch wissen musst.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                <ChevronDown 
                  className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${
                    openIndex === idx ? 'transform rotate-180' : ''
                  }`} 
                />
              </button>
              
              {openIndex === idx && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
