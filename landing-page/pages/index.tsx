import Head from 'next/head'
import { useEffect } from 'react'
import Hero from '../components/Hero'
import ValueProps from '../components/ValueProps'
import SocialProof from '../components/SocialProof'
import HowItWorks from '../components/HowItWorks'
import JobPreview from '../components/JobPreview'
import FAQ from '../components/FAQ'
import SignupCTA from '../components/SignupCTA'
import Footer from '../components/Footer'
import CookieBanner from '../components/CookieBanner'
import { initLinkedInTag, trackPageView } from '../lib/tracking'

export default function LandingPage() {
  useEffect(() => {
    // Initialize tracking on page load
    initLinkedInTag();
    trackPageView();
  }, []);

  return (
    <>
      <Head>
        <title>MedMatch - Finde deinen Traumjob in der Medizin</title>
        <meta name="description" content="Die erste Job-Plattform speziell für Medizinabsolventen. Finde klinische und nicht-klinische Karrieremöglichkeiten in Deutschland, Österreich und der Schweiz." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Plausible Analytics */}
        <script defer data-domain="medmatch.de" src="https://plausible.io/js/script.js"></script>
        
        {/* Google Analytics 4 + Google Ads - configured via env vars */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'GA_MEASUREMENT_ID'}`}></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'GA_MEASUREMENT_ID'}');
              ${process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID ? `gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID}');` : ''}
            `,
          }}
        />
        
        {/* LinkedIn Insight Tag - initialized client-side */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              _linkedin_partner_id = "${process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID || 'LINKEDIN_PARTNER_ID'}";
              window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
              window._linkedin_data_partner_ids.push(_linkedin_partner_id);
            `,
          }}
        />
      </Head>

      <main className="min-h-screen bg-white">
        <Hero />
        <ValueProps />
        <SocialProof />
        <HowItWorks />
        <JobPreview />
        <FAQ />
        <SignupCTA />
        <Footer />
        <CookieBanner />
      </main>
    </>
  )
}
