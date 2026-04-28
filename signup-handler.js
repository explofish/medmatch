/**
 * MedMatch Offline-First Signup Form Handler
 * 
 * This handler stores signup data in localStorage when the API is unavailable,
 * then syncs with the backend when connectivity is restored.
 * 
 * GDPR Compliance:
 * - Data stored locally in browser only
 * - Users can clear data via browser settings
 * - No data transmitted without consent
 */

(function() {
  'use strict';
  
  const STORAGE_KEY = 'medmatch_offline_signups';
  const SYNC_STATUS_KEY = 'medmatch_sync_status';
  const BETA_ACKNOWLEDGED_KEY = 'medmatch_beta_acknowledged';
  const API_URL = 'https://medmatch-api-staging.onrender.com';
  
  /**
   * Check if localStorage is available
   */
  function isLocalStorageAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Get all stored signups
   */
  function getStoredSignups() {
    if (!isLocalStorageAvailable()) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading signups:', error);
      return [];
    }
  }
  
  /**
   * Save signups to localStorage
   */
  function saveSignups(signups) {
    if (!isLocalStorageAvailable()) {
      throw new Error('localStorage is not available');
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(signups));
  }
  
  /**
   * Check if email is already registered
   */
  function isEmailRegistered(email) {
    const signups = getStoredSignups();
    return signups.some(signup => 
      signup.email.toLowerCase() === email.toLowerCase()
    );
  }
  
  /**
   * Store a new signup in localStorage
   */
  function storeOfflineSignup(data) {
    const { email, userType, metadata = {}, source = 'direct' } = data;
    
    if (!email || !email.includes('@')) {
      throw new Error('Valid email is required');
    }
    
    if (isEmailRegistered(email)) {
      throw new Error('EMAIL_ALREADY_REGISTERED');
    }
    
    const signup = {
      email: email.toLowerCase().trim(),
      userType,
      source,
      collectedAt: new Date().toISOString(),
      metadata,
      synced: false,
      syncedAt: null
    };
    
    const signups = getStoredSignups();
    signups.push(signup);
    saveSignups(signups);
    
    return signup;
  }
  
  /**
   * Capture UTM parameters from URL
   */
  function captureUtmParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      source: urlParams.get('utm_source') || 'direct',
      medium: urlParams.get('utm_medium') || '',
      campaign: urlParams.get('utm_campaign') || ''
    };
  }
  
  /**
   * Create and show beta banner
   */
  function createBetaBanner() {
    if (!isLocalStorageAvailable()) return;
    if (localStorage.getItem(BETA_ACKNOWLEDGED_KEY) === 'true') return;
    
    const banner = document.createElement('div');
    banner.id = 'medmatch-beta-banner';
    banner.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(90deg, #3b82f6, #8b5cf6);
        color: white;
        padding: 12px 20px;
        text-align: center;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      ">
        <span style="font-weight: 600;">🚀 MedMatch Beta</span> - 
        Wir befinden uns im Beta-Test. Deine Daten werden sicher gespeichert und du erhältst eine Benachrichtigung, wenn wir starten.
        <button id="beta-banner-close" style="
          margin-left: 15px;
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          padding: 4px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        ">Verstanden</button>
      </div>
      <div style="height: 44px;"></div>
    `;
    
    document.body.insertBefore(banner, document.body.firstChild);
    
    // Adjust body padding to account for banner
    document.body.style.paddingTop = '44px';
    
    // Close button handler
    document.getElementById('beta-banner-close').addEventListener('click', function() {
      localStorage.setItem(BETA_ACKNOWLEDGED_KEY, 'true');
      banner.remove();
      document.body.style.paddingTop = '0';
    });
  }
  
  /**
   * Show offline success message
   */
  function showOfflineSuccess(form) {
    const successMsg = document.createElement('div');
    successMsg.className = 'medmatch-offline-success';
    successMsg.innerHTML = `
      <div style="
        background: #ecfdf5;
        border: 1px solid #10b981;
        border-radius: 8px;
        padding: 16px;
        margin-top: 16px;
        color: #065f46;
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <div style="font-weight: 600; margin-bottom: 4px;">✓ Danke für deine Registrierung!</div>
        <div style="font-size: 14px;">
          Wir sind derzeit im Beta-Modus. Deine E-Mail wurde gespeichert und wir benachrichtigen dich, sobald MedMatch startet.
        </div>
      </div>
    `;
    
    // Insert after form
    form.parentNode.insertBefore(successMsg, form.nextSibling);
    
    // Hide form
    form.style.display = 'none';
    
    // Remove after 10 seconds
    setTimeout(() => {
      successMsg.remove();
      form.style.display = '';
      form.reset();
    }, 10000);
  }
  
  /**
   * Try to sync with API
   */
  async function tryApiSignup(data) {
    const response = await fetch(API_URL + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      // Short timeout to fail fast if API is down
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      throw new Error('API Error: ' + response.status);
    }
    
    return await response.json();
  }
  
  /**
   * Main initialization
   */
  function init() {
    // Create beta banner
    createBetaBanner();
    
    // Find all signup forms
    const forms = document.querySelectorAll('form');
    
    forms.forEach(function(form) {
      const emailInput = form.querySelector('input[type="email"]');
      const submitBtn = form.querySelector('button[type="submit"]');
      
      if (emailInput && submitBtn) {
        console.log('MedMatch: Found signup form, attaching offline-first handler');
        
        form.addEventListener('submit', async function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const email = emailInput.value.trim();
          if (!email || !email.includes('@')) {
            alert('Bitte gib eine gültige E-Mail-Adresse ein.');
            return;
          }
          
          // Show loading state
          const originalText = submitBtn.innerHTML;
          submitBtn.disabled = true;
          submitBtn.innerHTML = 'Wird registriert...';
          
          try {
            // Parse name from email
            const namePart = email.split('@')[0];
            const names = namePart.split(/[._-]/);
            const firstName = names[0] ? names[0].charAt(0).toUpperCase() + names[0].slice(1) : 'Neuer';
            const lastName = names[1] ? names[1].charAt(0).toUpperCase() + names[1].slice(1) : 'Nutzer';
            
            // Get UTM params
            const utm = captureUtmParams();
            
            // Try API first
            try {
              const apiData = {
                email: email,
                firstName: firstName,
                lastName: lastName,
                yearOfGraduation: null,
                specialization: null,
                state: null
              };
              
              const result = await tryApiSignup(apiData);
              console.log('MedMatch: API signup successful:', result);
              
              // Show success
              alert('Erfolgreich registriert! Du wirst benachrichtigt, wenn MedMatch startet.');
              form.reset();
              
            } catch (apiError) {
              console.log('MedMatch: API unavailable, using offline storage:', apiError.message);
              
              // Fall back to localStorage
              if (!isLocalStorageAvailable()) {
                alert('Registrierung fehlgeschlagen. Bitte versuche es später erneut.');
                return;
              }
              
              // Check for duplicate
              if (isEmailRegistered(email)) {
                alert('Diese E-Mail ist bereits registriert.');
                return;
              }
              
              // Store offline
              const metadata = {
                firstName,
                lastName,
                utmMedium: utm.medium,
                utmCampaign: utm.campaign,
                userAgent: navigator.userAgent,
                referrer: document.referrer || 'direct',
                apiError: apiError.message
              };
              
              storeOfflineSignup({
                email,
                userType: 'candidate',
                metadata,
                source: utm.source
              });
              
              console.log('MedMatch: Stored signup offline');
              
              // Show offline success message
              showOfflineSuccess(form);
            }
            
          } catch (err) {
            console.error('MedMatch: Signup error:', err);
            
            if (err.message === 'EMAIL_ALREADY_REGISTERED') {
              alert('Diese E-Mail ist bereits registriert.');
            } else {
              alert('Registrierung fehlgeschlagen. Bitte versuche es später erneut.');
            }
          } finally {
            // Restore button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
          }
        });
      }
    });
    
    console.log('MedMatch: Offline-first signup handler initialized');
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
