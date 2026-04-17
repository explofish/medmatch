# QA Testing Checklist - MedMatch Deployment

## Pre-Deployment Checks

### Build Verification
- [ ] Landing page builds without errors (`npm run build`)
- [ ] Backend builds without errors (`npm run build`)
- [ ] All TypeScript types pass (`npx tsc --noEmit`)
- [ ] No console errors in browser dev tools

## Post-Deployment Verification

### Landing Page (https://medmatch.de)

#### Visual & Layout
- [ ] Hero section displays correctly
- [ ] Value propositions visible
- [ ] Testimonials render properly
- [ ] Pricing section visible
- [ ] FAQ section accordion works
- [ ] Footer links clickable
- [ ] Mobile responsive (test on phone)
- [ ] Tablet responsive (test on iPad/simulator)

#### Functionality
- [ ] Navigation smooth scroll works
- [ ] Signup button opens form/modal
- [ ] Form validation works (required fields)
- [ ] Email validation rejects invalid emails
- [ ] Password validation (min 8 chars)
- [ ] Form submit shows loading state
- [ ] Success message displays after signup
- [ ] Error message displays on failure

#### Performance
- [ ] Page loads in < 3 seconds
- [ ] Images load properly
- [ ] No broken links

### Backend API (https://api.medmatch.de)

#### Health Endpoint
```bash
curl https://api.medmatch.de/api/health
```
- [ ] Returns `{"status": "healthy"}`
- [ ] Response time < 200ms
- [ ] Database shows "connected"

#### Signup Endpoint
```bash
curl -X POST https://api.medmatch.de/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"qa-test@example.com","password":"TestPass123","firstName":"QA","lastName":"Test"}'
```
- [ ] Returns 200/201 on valid signup
- [ ] Returns 409 if email exists
- [ ] Returns 400 on invalid data
- [ ] User record created in database
- [ ] Response includes user ID (no password hash)

#### CORS
- [ ] Landing page can call API
- [ ] No CORS errors in browser console
- [ ] Preflight requests succeed

#### Error Handling
- [ ] 404 returns JSON error (not HTML)
- [ ] 500 errors are logged
- [ ] Database errors handled gracefully

### Database

#### Data Integrity
- [ ] Users table exists
- [ ] Signups persist after page refresh
- [ ] Email uniqueness enforced
- [ ] Timestamps auto-populated

### Security

#### SSL/TLS
- [ ] HTTPS works (no mixed content warnings)
- [ ] SSL certificate valid
- [ ] HSTS headers present

#### Headers
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] No server version disclosure

### Analytics & Tracking

#### Plausible (if configured)
- [ ] Page views tracked
- [ ] Signup events tracked
- [ ] Dashboard shows data

#### Ad Pixels (BER-39)
- [ ] LinkedIn Insight Tag firing
- [ ] Google Ads conversion tracking
- [ ] Tag Assistant shows correct tags

## Signup Flow End-to-End Test

1. [ ] Visit https://medmatch.de
2. [ ] Click "Join Waitlist" or "Get Started"
3. [ ] Fill signup form:
   - Email: qa-e2e-test@example.com
   - Password: QATest123!
   - First Name: QA
   - Last Name: E2E
4. [ ] Submit form
5. [ ] Verify success message appears
6. [ ] Check database for new user record
7. [ ] Try signup with same email → should show "already exists"

## Load Testing (Optional)

```bash
# Install k6: https://k6.io/docs/get-started/installation/

# Test signup endpoint with 10 concurrent users for 30 seconds
k6 run --vus 10 --duration 30s - <<EOF
import http from 'k6/http';
export default function () {
  http.post('https://api.medmatch.de/api/auth/register', {
    email: \`load-test-\${__VU}@example.com\`,
    password: 'TestPass123',
    firstName: 'Load',
    lastName: 'Test'
  }, { headers: { 'Content-Type': 'application/json' } });
}
EOF
```

- [ ] API handles concurrent requests
- [ ] Response times remain < 500ms under load
- [ ] No 500 errors during load test

## Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Regression Testing

If deploying updates, verify:
- [ ] Existing user data intact
- [ ] API backwards compatible
- [ ] No breaking changes to signup flow

## Sign-Off

**QA Tester:** _______________
**Date:** _______________
**Environment:** Production / Staging
**Result:** ✅ PASS / ❌ FAIL (list blockers)
