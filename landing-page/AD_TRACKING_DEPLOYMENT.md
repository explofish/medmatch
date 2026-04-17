# Ad Tracking Deployment Guide

## Overview

This document describes how to deploy ad tracking pixels once ad accounts are created.

## Current Status

**Ready for deployment** - all code is prepared and will activate automatically when environment variables are configured.

## Required Environment Variables

Add these to your `.env.local` or deployment environment:

```bash
# LinkedIn Campaign Manager
NEXT_PUBLIC_LINKEDIN_PARTNER_ID=your_actual_partner_id_here
NEXT_PUBLIC_LINKEDIN_CONVERSION_ID=your_actual_conversion_id_here

# Google Ads
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID=AW-XXXXXXXXX
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL=XXXXXXXXXXXXXX

# Google Analytics 4 (if not already set)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

## How to Get These Values

### LinkedIn Insight Tag

1. Go to [LinkedIn Campaign Manager](https://business.linkedin.com)
2. Click on your ad account name
3. Navigate to **Account Assets** → **Insight Tag**
4. Copy the Partner ID (looks like `1234567`)
5. For conversion tracking, create a conversion action and note the Conversion ID

### Google Ads Conversion Tracking

1. Go to [Google Ads](https://ads.google.com)
2. Click **Tools & Settings** → **Conversions**
3. Click **New Conversion Action** → **Website**
4. Enter your domain and add the conversion action
5. You'll receive:
   - Conversion ID (looks like `AW-123456789`)
   - Conversion Label (looks like `AbCdEfGhIjKlMnOpQrStUv`)

## Deployment Steps

1. **Set environment variables** in your deployment platform (Vercel, etc.)
2. **Redeploy** the landing page
3. **Verify** tracking is working (see Testing section)

## Testing

### Verify LinkedIn Pixel

1. Install the [LinkedIn Pixel Helper](https://www.linkedin.com/help/lms/answer/a426288) Chrome extension
2. Visit your landing page
3. Open browser console and check for pixel fires

### Verify Google Ads

1. Install [Google Tag Assistant](https://tagassistant.google.com/) Chrome extension
2. Visit your landing page
3. Check that gtag.js loads and configuration fires

### Test Conversion Tracking

Submit a test signup and verify:

```javascript
// In browser console, check these are defined:
window.gtag        // Google Analytics/Ads
window.lintrk      // LinkedIn
window.plausible   // Plausible
```

## Files Modified

- `lib/tracking.ts` - New tracking utility library
- `pages/index.tsx` - Added GA4 and LinkedIn scripts
- `components/SignupCTA.tsx` - Updated to use centralized tracking

## Fallback Behavior

If environment variables are not set (PLACEHOLDER values):
- Plausible Analytics still works (already configured)
- Google Analytics placeholder won't cause errors
- LinkedIn tracking won't fire (gracefully skipped)
- No console errors will appear

## Post-Deployment Checklist

- [ ] All environment variables configured
- [ ] Site redeployed successfully
- [ ] LinkedIn Pixel Helper shows pixel firing
- [ ] Google Tag Assistant shows tags firing
- [ ] Test signup tracks conversion in all platforms
- [ ] UTM parameters are captured correctly
- [ ] No console errors

## Support

See `marketing/paid-acquisition/tracking-code-implementation.md` for full implementation specs.
