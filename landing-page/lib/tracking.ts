// Tracking configuration - to be updated with actual IDs when accounts are created
export const TRACKING_CONFIG = {
  // LinkedIn Insight Tag
  linkedIn: {
    partnerId: process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID || 'PLACEHOLDER',
    conversionId: process.env.NEXT_PUBLIC_LINKEDIN_CONVERSION_ID || 'PLACEHOLDER',
  },
  // Google Ads
  googleAds: {
    conversionId: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID || 'PLACEHOLDER',
    conversionLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL || 'PLACEHOLDER',
  },
  // Google Analytics 4
  ga4: {
    measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'PLACEHOLDER',
  },
  // Plausible (already configured)
  plausible: {
    domain: 'medmatch.de',
  },
};

// Check if tracking is properly configured
export const isTrackingConfigured = () => {
  return (
    TRACKING_CONFIG.linkedIn.partnerId !== 'PLACEHOLDER' &&
    TRACKING_CONFIG.googleAds.conversionId !== 'PLACEHOLDER'
  );
};

// Initialize LinkedIn Insight Tag
export const initLinkedInTag = () => {
  if (TRACKING_CONFIG.linkedIn.partnerId === 'PLACEHOLDER') {
    console.warn('LinkedIn Insight Tag not configured - waiting for account setup');
    return;
  }

  const partnerId = TRACKING_CONFIG.linkedIn.partnerId;
  
  // @ts-ignore
  window._linkedin_partner_id = partnerId;
  // @ts-ignore
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
  // @ts-ignore
  window._linkedin_data_partner_ids.push(partnerId);
  
  // @ts-ignore
  (function(l: any) {
    // @ts-ignore
    if (!l) { (window as any).lintrk = function(a: any, b: any) { ((window as any).lintrk.q as any).push([a, b]); }; }
    // @ts-ignore
    (window as any).lintrk.q = (window as any).lintrk.q || [];
    const s = document.getElementsByTagName("script")[0];
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
    s.parentNode?.insertBefore(script, s);
  })((window as any).lintrk);
};

// Track LinkedIn conversion
export const trackLinkedInConversion = () => {
  if (typeof window !== 'undefined' && (window as any).lintrk) {
    const conversionId = TRACKING_CONFIG.linkedIn.conversionId;
    if (conversionId !== 'PLACEHOLDER') {
      (window as any).lintrk('track', { conversion_id: conversionId });
    }
  }
};

// Track Google Ads conversion
export const trackGoogleAdsConversion = () => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    const { conversionId, conversionLabel } = TRACKING_CONFIG.googleAds;
    if (conversionId !== 'PLACEHOLDER' && conversionLabel !== 'PLACEHOLDER') {
      // @ts-ignore
      gtag('event', 'conversion', {
        'send_to': `${conversionId}/${conversionLabel}`,
        'value': 5.0,
        'currency': 'EUR',
        'transaction_id': generateTransactionId(),
      });
    }
  }
};

// Generate unique transaction ID
const generateTransactionId = () => {
  return 'medmatch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Track signup event across all platforms
export const trackSignupSuccess = () => {
  // Plausible (already configured)
  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible('Signup Success');
  }

  // Google Ads conversion
  trackGoogleAdsConversion();

  // LinkedIn conversion
  trackLinkedInConversion();

  // GA4 event
  if (typeof window !== 'undefined' && (window as any).gtag) {
    // @ts-ignore
    gtag('event', 'waitlist_signup', {
      'stage': 'registration',
      'source': getUTMParameter('utm_source') || 'organic',
    });
  }
};

// UTM Parameter utilities
export const getUTMParameter = (paramName: string): string | null => {
  if (typeof window === 'undefined') return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  const value = urlParams.get(paramName);
  if (value) return value;

  // Check localStorage for stored params
  try {
    const stored = localStorage.getItem('medmatch_utm_data');
    if (stored) {
      const data = JSON.parse(stored);
      const storedDate = new Date(data.timestamp);
      const now = new Date();
      const daysDiff = (now.getTime() - storedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff <= 30 && data.params[paramName]) {
        return data.params[paramName];
      }
    }
  } catch {
    // localStorage not available
  }
  
  return null;
};

// Store UTM parameters on page load
export const storeUTMParameters = () => {
  if (typeof window === 'undefined') return;
  
  const urlParams = new URLSearchParams(window.location.search);
  const utmParams: Record<string, string> = {};
  
  urlParams.forEach((value, key) => {
    if (key.startsWith('utm_')) {
      utmParams[key] = value;
    }
  });
  
  if (Object.keys(utmParams).length > 0) {
    try {
      localStorage.setItem('medmatch_utm_data', JSON.stringify({
        params: utmParams,
        timestamp: new Date().toISOString(),
        landingPage: window.location.pathname,
      }));
    } catch {
      // localStorage not available
    }
  }
};

// Track page view with UTM data
export const trackPageView = () => {
  if (typeof window === 'undefined') return;
  
  storeUTMParameters();
  
  const utmSource = getUTMParameter('utm_source');
  const utmCampaign = getUTMParameter('utm_campaign');
  const utmMedium = getUTMParameter('utm_medium');
  
  // Plausible custom event
  if ((window as any).plausible) {
    (window as any).plausible('Page View', {
      props: {
        source: utmSource || 'direct',
        campaign: utmCampaign || 'none',
        medium: utmMedium || 'none',
      },
    });
  }
  
  // GA4 event
  if ((window as any).gtag) {
    // @ts-ignore
    gtag('event', 'page_view', {
      'page_path': window.location.pathname,
      'custom_source': utmSource || 'direct',
      'custom_campaign': utmCampaign || 'none',
      'custom_medium': utmMedium || 'none',
    });
  }
};
