// MedMatch Signup Form Handler
// Connects the landing page signup form to the API

(function() {
  'use strict';
  
  const API_URL = 'https://medmatch-api-staging.onrender.com';
  
  // Wait for DOM to be ready
  function init() {
    // Find all signup forms on the page
    const forms = document.querySelectorAll('form');
    
    forms.forEach(function(form) {
      // Check if this is a signup form (has email and submit button)
      const emailInput = form.querySelector('input[type="email"]');
      const submitBtn = form.querySelector('button[type="submit"]');
      
      if (emailInput && submitBtn) {
        console.log('Found signup form, attaching handler');
        
        form.addEventListener('submit', async function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          // Get form data
          const email = emailInput.value;
          if (!email || !email.includes('@')) {
            alert('Bitte gib eine gültige E-Mail-Adresse ein.');
            return;
          }
          
          // Show loading state
          const originalText = submitBtn.innerHTML;
          submitBtn.disabled = true;
          submitBtn.innerHTML = 'Wird registriert...';
          
          try {
            // Try to parse name from email (simple approach)
            const namePart = email.split('@')[0];
            const names = namePart.split(/[._-]/);
            const firstName = names[0] ? names[0].charAt(0).toUpperCase() + names[0].slice(1) : 'Neuer';
            const lastName = names[1] ? names[1].charAt(0).toUpperCase() + names[1].slice(1) : 'Nutzer';
            
            // Submit to API
            const response = await fetch(API_URL + '/api/auth/register', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                email: email,
                firstName: firstName,
                lastName: lastName,
                yearOfGraduation: null,
                specialization: null,
                state: null
              })
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log('Signup successful:', data);
              
              // Show success message
              alert('Erfolgreich registriert! Du wirst benachrichtigt, wenn MedMatch startet.');
              
              // Clear form
              form.reset();
            } else {
              const error = await response.json();
              if (response.status === 409) {
                alert('Diese E-Mail ist bereits registriert.');
              } else {
                alert('Registrierung fehlgeschlagen: ' + (error.message || 'Unbekannter Fehler'));
              }
            }
          } catch (err) {
            console.error('Signup error:', err);
            alert('Registrierung fehlgeschlagen. Bitte versuche es später erneut.');
          } finally {
            // Restore button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
          }
        });
      }
    });
    
    console.log('MedMatch signup handler initialized');
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
