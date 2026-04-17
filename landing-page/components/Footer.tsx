import { Linkedin, Twitter, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-white text-lg font-bold mb-4">MedMatch</h3>
            <p className="text-sm">
              Die erste Job-Plattform speziell für Medizinabsolventen in der DACH-Region.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Für Arbeitssuchende</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/jobs" className="hover:text-white transition-colors">Jobs finden</a></li>
              <li><a href="/how-it-works" className="hover:text-white transition-colors">So funktioniert's</a></li>
              <li><a href="/salary-guide" className="hover:text-white transition-colors">Gehaltsguide</a></li>
              <li><a href="/career-blog" className="hover:text-white transition-colors">Karriere-Blog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Für Arbeitgeber</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/employers" className="hover:text-white transition-colors">Stellen schalten</a></li>
              <li><a href="/pricing" className="hover:text-white transition-colors">Preise</a></li>
              <li><a href="/partner" className="hover:text-white transition-colors">Partner werden</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Kontakt</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/contact" className="hover:text-white transition-colors">Kontaktieren Sie uns</a></li>
              <li><a href="/help" className="hover:text-white transition-colors">Hilfe & Support</a></li>
              <li className="flex space-x-4 pt-2">
                <a href="https://linkedin.com" className="hover:text-white transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="https://twitter.com" className="hover:text-white transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="mailto:hello@medmatch.de" className="hover:text-white transition-colors">
                  <Mail className="w-5 h-5" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm">
          <p>&copy; {new Date().getFullYear()} MedMatch. Alle Rechte vorbehalten.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="/imprint" className="hover:text-white transition-colors">Impressum</a>
            <a href="/privacy" className="hover:text-white transition-colors">Datenschutz</a>
            <a href="/terms" className="hover:text-white transition-colors">AGB</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
