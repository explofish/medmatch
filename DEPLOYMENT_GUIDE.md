# MedMatch Production Deployment Guide

## Overview
This guide covers deploying the MedMatch platform to production using:
- **Landing Page**: Vercel (static hosting)
- **Backend API**: Railway or Render (with PostgreSQL)
- **Domain**: medmatch.de

## Architecture
```
medmatch.de         → Vercel (Landing Page Static Files)
api.medmatch.de     → Railway/Render (Next.js API + PostgreSQL)
```

## Prerequisites

1. **Domain**: medmatch.de (purchased via CEO)
2. **Vercel Account**: For landing page deployment
3. **Railway/Render Account**: For backend API and database
4. **PostgreSQL Database**: Provisioned via Railway/Render

## Deployment Steps

### Step 1: Backend API (Railway - Recommended)

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and init:**
   ```bash
   cd medmatch
   railway login
   railway init
   ```

3. **Add PostgreSQL:**
   ```bash
   railway add --database postgres
   ```

4. **Set environment variables:**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set NEXTAUTH_SECRET=$(openssl rand -base64 32)
   railway variables set NEXTAUTH_URL=https://api.medmatch.de
   railway variables set RESEND_API_KEY=your_resend_api_key_here
   railway variables set CORS_ORIGINS=https://medmatch.de,https://www.medmatch.de
   # DATABASE_URL is auto-set by Railway
   ```

   **Get Resend API Key:**
   - Sign up at resend.com
   - Create API key (free tier: 3,000 emails/day)
   - Verify medmatch.de domain in Resend dashboard

5. **Deploy:**
   ```bash
   railway up
   railway domain  # Get the URL for DNS setup
   ```

### Step 2: Landing Page (Vercel)

1. **Push to GitHub** (if not already)

2. **Connect to Vercel:**
   - Go to vercel.com
   - Import GitHub repo
   - Root Directory: `landing-page`
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Set Environment Variables in Vercel Dashboard:**
   ```
   BACKEND_URL=https://api.medmatch.de
   NEXT_PUBLIC_PLAUSIBLE_DOMAIN=medmatch.de
   ```

4. **Add Custom Domain:**
   - In Vercel project settings
   - Add domain: `medmatch.de`
   - Follow DNS instructions

### Step 3: DNS Configuration

In your domain registrar (where medmatch.de is managed):

**For Vercel (Landing Page):**
```
Type: A
Name: @ (or medmatch.de)
Value: 76.76.21.21 (Vercel's IP)

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**For Railway/Render (API):**
```
Type: CNAME
Name: api
Value: your-railway-app-url.railway.app
```

### Step 4: SSL/TLS

Both Vercel and Railway/Render provide free SSL certificates automatically.

## Verification

### Test Backend Health:
```bash
curl https://api.medmatch.de/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "medmatch-api",
  "database": "connected"
}
```

### Test Signup Flow:
```bash
curl -X POST https://api.medmatch.de/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","firstName":"Test","lastName":"User"}'
```

### Test Landing Page:
Visit `https://medmatch.de` and verify:
- All sections load correctly
- Signup form submits successfully
- Plausible Analytics tracking works

## Post-Deployment

1. **Verify Database**: Check that user records are being created
2. **Set up monitoring**: Use Railway/Render built-in monitoring
3. **Configure alerts**: Set up uptime monitoring (e.g., UptimeRobot)
4. **Test email delivery**: If email service is added later

## Troubleshooting

**Database connection errors:**
- Check DATABASE_URL is set correctly
- Ensure PostgreSQL is running
- Verify network access (IP allowlist)

**API not reachable from landing page:**
- Check CORS configuration
- Verify BACKEND_URL environment variable
- Test with curl from local machine

**Build failures:**
- Ensure all dependencies are in package.json
- Check Node.js version compatibility
- Review build logs in Vercel/Railway dashboard

## Maintenance

**Database Migrations:**
```bash
cd medmatch
npx prisma migrate deploy
```

**Updates:**
- Push to GitHub triggers auto-deploy on Vercel
- Use `railway up` for backend updates

## Cost Estimate

- **Vercel**: Free tier (Pro: $20/mo if limits exceeded)
- **Railway**: ~$5-10/mo (PostgreSQL + compute)
- **Domain**: ~€10-15/year

**Total Monthly**: €5-15 (starting)
