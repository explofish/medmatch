# Complete Staging Deployment Guide

## ✅ COMPLETED: Landing Page
**URL:** https://explofish.github.io/medmatch/
**Status:** Live and accessible
**Auto-deploy:** Yes (on every push to master)

## ⏳ PENDING: Backend API

### Option 1: Render (Recommended - Free)
**Steps:**
1. Go to https://dashboard.render.com/
2. Click "New +" → "Blueprint"
3. Connect GitHub repo: `explofish/medmatch`
4. Select `render.staging.yaml` blueprint
5. Add environment variables:
   - `RESEND_API_KEY` (get from https://resend.com)
6. Deploy

**Result:** https://medmatch-api-demo.onrender.com

### Option 2: Vercel (Free)
**Steps:**
1. Go to https://vercel.com/
2. Import GitHub repo: `explofish/medmatch`
3. Set root directory: `medmatch`
4. Build command: `npm run build`
5. Add environment variables from `.env.staging`

**Result:** https://medmatch-api-demo.vercel.app

### Option 3: Railway (Free Tier)
**Steps:**
1. Go to https://railway.app/
2. New Project → Deploy from GitHub repo
3. Select `explofish/medmatch`
4. Add PostgreSQL database
5. Configure environment variables

**Result:** https://medmatch-api-demo.up.railway.app

## Environment Variables Required

```bash
# Database
DATABASE_URL=postgresql://...

# Email
RESEND_API_KEY=re_...

# Auth
NEXTAUTH_SECRET=random-secret-key
NEXTAUTH_URL=https://your-api-url.com

# CORS
CORS_ORIGINS=https://explofish.github.io/medmatch,http://localhost:3000
```

## Testing After Deployment

1. Health check: `GET https://your-api-url.com/api/health`
2. Test signup: `POST https://your-api-url.com/api/auth/register`
3. Verify CORS: Landing page should successfully call API

## Production Deployment

Once staging works:
1. Purchase medmatch.de domain
2. Update Vercel/Render with custom domain
3. Update landing page env vars
4. Deploy production

---
**Last Updated:** 2026-04-18
**Repository:** https://github.com/explofish/medmatch
