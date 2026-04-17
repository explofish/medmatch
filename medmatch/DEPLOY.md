# Railway/Render Deployment Guide for MedMatch Backend

## Prerequisites
1. Railway or Render account
2. PostgreSQL database provisioned

## Deployment Steps

### Option 1: Railway (Recommended)

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and create project:**
   ```bash
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
   railway variables set DATABASE_URL="your-postgres-url"
   ```

5. **Deploy:**
   ```bash
   railway up
   ```

### Option 2: Render

1. **Create Blueprint (`render.yaml`):**
   Already created in this directory

2. **Deploy via Render Dashboard:**
   - Connect GitHub repo
   - Use Blueprint for automatic setup

## Environment Variables Required

- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Random 32-byte base64 string
- `NEXTAUTH_URL`: Your API domain (e.g., https://api.medmatch.de)

## Post-Deployment

1. Run database migrations:
   ```bash
   npx prisma migrate deploy
   ```

2. Test health endpoint:
   ```bash
   curl https://api.medmatch.de/api/health
   ```

3. Test registration:
   ```bash
   curl -X POST https://api.medmatch.de/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123","firstName":"Test","lastName":"User"}'
   ```
