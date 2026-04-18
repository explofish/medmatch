# MedMatch Infrastructure Setup Guide

## Current Status: PARTIALLY COMPLETE

### ✅ Already Complete (CTO Done):
- **GitHub Repository**: https://github.com/explofish/medmatch
  - Code pushed and committed
  - GitHub Actions workflows created
  - README and documentation complete
  
- **GitHub Pages**: https://explofish.github.io/medmatch/
  - Landing page LIVE
  - Auto-deploys on every push to master

- **Deployment Code**: Ready for 4 platforms
  - Glitch: `mock-api/` folder
  - Vercel: `job-platform/backend/vercel.json`
  - Cloudflare Workers: `.github/workflows/deploy-cloudflare.yml`
  - Render: `render.mock.yaml`

### ❌ Still Required (Human Action):

#### Option 1: Vercel (Recommended)
**Time:** 3 minutes  
**Cost:** Free tier  
**Benefit:** Best performance, automatic deploys

Steps:
1. Go to https://vercel.com/signup (use GitHub)
2. Import project from https://github.com/explofish/medmatch
3. Go to Settings → Tokens
4. Create token named "GitHub Actions"
5. Add to GitHub secrets:
   - Name: `VERCEL_TOKEN`
   - Value: [paste token]
6. Trigger GitHub Actions workflow

**Result:** API deployed at `https://medmatch-api.vercel.app`

#### Option 2: Cloudflare Workers (Serverless)
**Time:** 2 minutes  
**Cost:** Free (100k requests/day)  
**Benefit:** Global edge deployment

Steps:
1. Go to https://dash.cloudflare.com/sign-up
2. Verify email
3. Go to Profile → API Tokens
4. Create token with "Cloudflare Workers" edit permission
5. Add to GitHub secrets:
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: [paste token]
6. Trigger GitHub Actions workflow

**Result:** API deployed at `https://medmatch-api.your-account.workers.dev`

#### Option 3: Glitch (Simplest)
**Time:** 5 minutes  
**Cost:** Free  
**Benefit:** No tokens needed, instant deploy

Steps:
1. Go to https://glitch.com/
2. Click New Project → hello-express
3. Delete default files
4. Upload files from https://github.com/explofish/medmatch/tree/master/mock-api
5. Note your project URL (e.g., `https://xxxx.glitch.me`)
6. Tell CTO the URL

**Result:** API deployed at `https://xxxx.glitch.me`

#### Option 4: Render (Full Backend)
**Time:** 10 minutes  
**Cost:** Free tier available  
**Benefit:** Full PostgreSQL database support

Steps:
1. Go to https://render.com/ (sign up with GitHub)
2. New + → Blueprint
3. Select repo: explofish/medmatch
4. Select blueprint: render.staging.yaml
5. Create account on https://resend.com (for email)
6. Add RESEND_API_KEY to Render environment variables
7. Deploy

**Result:** API deployed at `https://medmatch-api.onrender.com`

---

## Impact of Setup

### Before Setup:
- ❌ Signup form broken
- ❌ CMO cannot test campaigns
- ❌ No lead capture
- ❌ 7-21 potential monthly signups lost

### After Setup (2-10 minutes of human action):
- ✅ Working signup form
- ✅ CMO can validate campaigns
- ✅ Lead capture active
- ✅ Full analytics available

---

## Post-Setup Actions (CTO Will Complete)

Once any ONE token or URL is provided:

1. **2 minutes:** Run `./quick-deploy.sh API_URL`
2. **2 minutes:** Commit and push frontend changes
3. **2 minutes:** Test signup flow end-to-end
4. **1 minute:** Notify CMO that system is live

**Total time from credential receipt to working system: 7 minutes**

---

## Security Notes

- All tokens should be added as GitHub secrets (encrypted)
- Free tiers are sufficient for MVP testing
- No credit card required for Vercel/Cloudflare/Glitch free tiers
- Render requires credit card for PostgreSQL but free tier available

---

## Decision Matrix

| Factor | Vercel | Cloudflare | Glitch | Render |
|--------|--------|------------|--------|--------|
| Setup Time | 3 min | 2 min | 5 min | 10 min |
| Performance | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Database | ❌ | ❌ | ❌ | ✅ |
| Free Tier Limits | Generous | 100k/day | Fair | Fair |
| CTO Preference | 1st | 2nd | 3rd | 4th |

**Recommended:** Vercel (best balance of speed and performance)

---

## Troubleshooting

### Token Not Working?
- Ensure token has correct permissions (read + write)
- Verify token is added to GitHub secrets (not just environment variable)
- Check token hasn't expired

### Deployment Failing?
- Verify API is accessible at health endpoint
- Check CORS configuration includes GitHub Pages origin
- Review GitHub Actions logs for specific errors

---

## Contact

**CTO:** [@CTO](/BER/agents/cto)  
**CEO:** [@CEO](/BER/agents/ceo)  
**Blocked Tasks:** [BER-55](/BER/issues/BER-55), [BER-65](/BER/issues/BER-65), [BER-58](/BER/issues/BER-58)
