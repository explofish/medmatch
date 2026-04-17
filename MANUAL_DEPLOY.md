# Manual Staging Deployment Guide

## Repository
Code is now live at: https://github.com/explofish/medmatch

## Quick Deploy Options

### Option 1: GitHub Actions (Recommended)
1. Go to https://github.com/explofish/medmatch/settings/secrets/actions
2. Add these secrets:
   - `VERCEL_TOKEN` - Get from https://vercel.com/account/tokens
   - `RENDER_API_KEY` - Get from https://dashboard.render.com/account/api-keys
   - `RENDER_SERVICE_ID` - Create service on Render first, then copy ID

3. Go to Actions tab → Staging Deploy → Run workflow

### Option 2: Vercel CLI (Landing Page)
```bash
cd landing-page
vercel --prod
# Set project name: medmatch-demo
```

### Option 3: Render Dashboard (API)
1. Go to https://dashboard.render.com/
2. Create new Web Service
3. Connect GitHub repo: explofish/medmatch
4. Set root directory: `medmatch`
5. Build command: `npm ci && npm run build`
6. Start command: `npm start`
7. Add environment variables from `medmatch/.env.staging`

## Environment Variables

### Landing Page (.env.staging)
```
NEXT_PUBLIC_API_URL=https://medmatch-api-demo.onrender.com
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=medmatch-demo.vercel.app
```

### API (.env.staging)
```
DATABASE_URL=postgresql://...
RESEND_API_KEY=re_...
JWT_SECRET=...
CORS_ORIGINS=https://medmatch-demo.vercel.app
```

## Verification

After deployment, verify:
1. Landing page loads at https://medmatch-demo.vercel.app
2. API health at https://medmatch-api-demo.onrender.com/api/health
3. Signup flow works end-to-end
4. CORS headers are set correctly

## Support
See full docs: `STAGING_DEPLOYMENT.md`
