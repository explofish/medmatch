import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      setShowBanner(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted')
    setShowBanner(false)
    // Track consent
    if (typeof window !== 'undefined' && (window as any).plausible) {
      (window as any).plausible('Cookie Consent', { props: { choice: 'accepted' } })
    }
  }

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined')
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-50">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 text-sm">
          <p>
            Wir verwenden Cookies und ähnliche Technologien, um unsere Website zu verbessern 
            und dein Nutzererlebnis zu personalisieren. Durch Klicken auf "Akzeptieren" stimmst 
            du der Verwendung von Cookies zu.{' '}
            <a href="/privacy" className="underline hover:text-primary-300">
              Mehr erfahren
            </a>
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            Ablehnen
          </button>
          <button
            onClick={handleAccept}
            className="px-6 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Akzeptieren
          </button>
          <button
            onClick={handleDecline}
            className="p-2 text-gray-400 hover:text-white transition-colors md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
