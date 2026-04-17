# MedMatch Staging Deployment Guide

## Staging URLs
- **Landing Page**: https://medmatch-demo.vercel.app
- **Backend API**: https://medmatch-api-demo.onrender.com
- **Health Check**: https://medmatch-api-demo.onrender.com/api/health

## Prerequisites

### Required Accounts
1. **GitHub** - For code repository
2. **Vercel** - For landing page hosting (free tier)
3. **Render** - For API hosting (free tier)
4. **Resend** (optional) - For email sending

## Deployment Steps

### Step 1: Push Code to GitHub

Create a GitHub repository and push the code:

```bash
# Create a new GitHub repository (via web interface)
# Then run:
git remote add origin https://github.com/YOUR_USERNAME/medmatch.git
git push -u origin master
```

### Step 2: Deploy Backend API to Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Select `render.staging.yaml` as the blueprint file
5. Render will automatically:
   - Deploy the API service (`medmatch-api-demo`)
   - Create a PostgreSQL database (`medmatch-demo-db`)
   - Run Prisma migrations

**Manual Environment Variables** (set in Render dashboard if needed):
- `RESEND_API_KEY` - Optional, for email sending. Get from [resend.com](https://resend.com)

### Step 3: Deploy Landing Page to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `landing-page`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Set environment variables:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://medmatch-api-demo.onrender.com
   NEXT_PUBLIC_PLAUSIBLE_DOMAIN=medmatch-demo.vercel.app
   ```
6. Deploy

### Step 4: Configure Custom Domain (Optional)

If you want to use `medmatch-demo.vercel.app`:
1. In Vercel project settings, go to "Domains"
2. Add `medmatch-demo.vercel.app`
3. Vercel will automatically assign this subdomain

## Configuration Files

### `vercel.staging.json`
Updated to point to staging API with API route rewrites.

### `render.staging.yaml`
Updated with:
- Service name: `medmatch-api-demo`
- Database name: `medmatch-demo-db`
- CORS origins including staging domain
- Prisma migrate in build command

### `medmatch/src/middleware.ts`
Updated default CORS origins to include staging domains.

## Post-Deployment Verification

### 1. Test Health Endpoint
```bash
curl https://medmatch-api-demo.onrender.com/api/health
```
Expected response:
```json
{
  "status": "healthy",
  "service": "medmatch-api",
  "database": "connected"
}
```

### 2. Test Signup Flow
1. Visit https://medmatch-demo.vercel.app
2. Fill out the signup form with test data:
   - Email: test@example.com
   - Password: testpass123
3. Submit and verify success message
4. Check that user was created in database (via Render logs)

### 3. Test CORS Configuration
```bash
curl -H "Origin: https://medmatch-demo.vercel.app" \
     -H "Content-Type: application/json" \
     -X POST \
     https://medmatch-api-demo.onrender.com/api/auth/register \
     -d '{"email":"test2@example.com","password":"testpass123"}'
```

## Updating Staging

After making changes to the code:

```bash
git add .
git commit -m "Your changes"
git push origin master
```

Both Render and Vercel will automatically redeploy on push (if auto-deploy is enabled).

## Free Tier Limits

### Render (Free)
- Web services: 750 hours/month (spins down after 15 min inactivity)
- PostgreSQL: 1 GB storage
- Bandwidth: 100 GB/month

### Vercel (Free/Hobby)
- 100 GB bandwidth/month
- 6,000 execution hours/month
- 1000 image optimizations/day

## Troubleshooting

### Database Connection Issues
Check Render logs for:
- Database connection string is correct
- Prisma migrations ran successfully
- Database is not suspended

### CORS Errors
Verify:
- `CORS_ORIGINS` env var includes `https://medmatch-demo.vercel.app`
- Middleware.ts has staging domains in default origins

### Build Failures
Common issues:
- Missing `npm install` in build command
- Prisma client not generated
- Environment variables not set

## Handoff to CMO

Once deployed, provide these URLs to the CMO:
- **Landing Page**: https://medmatch-demo.vercel.app
- **API Health**: https://medmatch-api-demo.onrender.com/api/health

These URLs can be used for:
- Campaign preview and testing
- Marketing asset validation
- Signup flow verification

## Migration to Production

When ready to deploy to production (`medmatch.de`):
1. Update `vercel.json` with production API URL
2. Update `render.yaml` with production domains
3. Update `NEXT_PUBLIC_BACKEND_URL` in production Vercel project
4. Run database migration on production database
5. Test thoroughly before DNS switch
