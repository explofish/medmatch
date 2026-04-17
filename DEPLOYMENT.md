# MedMatch Production Deployment Guide

## Environment Variables

### Backend API (Vercel)

Required environment variables for the backend API:

```bash
# Database Configuration (Neon PostgreSQL or similar)
DB_HOST=your-db-host.neon.tech
DB_PORT=5432
DB_NAME=medmatch
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# Server Configuration
PORT=3001
NODE_ENV=production

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d

# CORS (comma-separated list of allowed origins)
CORS_ORIGINS=https://medmatch.de,https://www.medmatch.de

# Email Configuration (Resend recommended)
EMAIL_PROVIDER=resend
EMAIL_FROM=noreply@medmatch.de
EMAIL_FROM_NAME=MedMatch
EMAIL_RATE_LIMIT=60
RESEND_API_KEY=re_your_api_key_here
```

### Landing Page (Vercel)

Required environment variables for the landing page:

```bash
NEXT_PUBLIC_BACKEND_URL=https://medmatch-api.vercel.app
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=medmatch.de

# Optional: Ad tracking (fill in when ad accounts are ready)
NEXT_PUBLIC_LINKEDIN_PARTNER_ID=
NEXT_PUBLIC_LINKEDIN_CONVERSION_ID=
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID=
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

## Database Setup

1. Create a PostgreSQL database (Neon, Supabase, or Railway)
2. Run the schema:
   ```bash
   cd job-platform/backend
   npm run init-db
   ```
   Or manually execute `database/schema.sql`

## Deployment Steps

### 1. Deploy Backend API

```bash
cd job-platform/backend
vercel --prod
```

Set environment variables in Vercel dashboard after first deploy.

### 2. Deploy Landing Page

```bash
cd landing-page
vercel --prod
```

Make sure `NEXT_PUBLIC_BACKEND_URL` points to the deployed backend URL.

### 3. Configure Custom Domain (optional)

Add custom domain in Vercel dashboard for both projects.

### 4. Verify Deployment

- Test health endpoint: `GET https://medmatch-api.vercel.app/api/health`
- Test signup flow on landing page
- Verify email delivery

## Post-Deployment

1. Set up Plausible Analytics
2. Configure ad tracking pixels (when ready)
3. Set up monitoring/alerting
4. Create admin user manually
