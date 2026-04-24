# Glitch Deploy Guide - MedMatch API

Quick deployment guide for hosting the MedMatch API on Glitch (free, no credit card required).

## Overview

This is a **temporary production solution** authorized by CEO to unblock CMO launch while waiting for proper cloud credentials.

- **API**: Express.js + SQLite (persistent on Glitch filesystem)
- **Landing Page**: GitHub Pages (static)
- **Integration**: Landing page calls Glitch API for signup

---

## Step 1: Create Glitch Project

### Option A: Remix Template (Fastest)

1. Go to [glitch.com](https://glitch.com)
2. Click **New Project** → **hello-express**
3. Wait for the project to load

### Option B: From Scratch

1. Go to [glitch.com](https://glitch.com)
2. Click **New Project** → **hello-express**
3. Delete default files (`server.js`, `package.json`, etc.)

---

## Step 2: Upload API Files

Upload these two files from `mock-api/` folder:

### File 1: `server.js`

Click **New File** → type `server.js` → paste the contents from `mock-api/server.js`

### File 2: `package.json`

Click **New File** → type `package.json` → paste the contents from `mock-api/package.json`

---

## Step 3: Configure Project

### Rename Project

1. Click project name (top-left)
2. Click **Edit Details**
3. Set name to: `medmatch-api` (or your preferred name)
4. Click **Save**

Your API will be at: `https://medmatch-api.glitch.me`

---

## Step 4: Wait for Install

Glitch automatically:
- Installs dependencies from `package.json`
- Starts the server
- Shows logs in the console

**Wait 1-2 minutes** for `sqlite3` to compile (it takes time on Glitch).

---

## Step 5: Test the API

### Health Check

Open in browser:
```
https://medmatch-api.glitch.me/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "medmatch-api"
}
```

### Test Signup (curl)

```bash
curl -X POST https://medmatch-api.glitch.me/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "yearOfGraduation": "2024",
    "specialization": "Cardiology",
    "state": "Bayern"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Successfully joined the waitlist!",
  "data": {
    "id": "1",
    "email": "test@example.com",
    "firstName": "Test"
  }
}
```

### View Signups

```
https://medmatch-api.glitch.me/api/signups
```

---

## Step 6: Update Landing Page

Edit `landing-page/components/SignupCTA.tsx`:

### Add API URL constant:

```typescript
// API Configuration - Glitch temporary hosting
const API_BASE_URL = 'https://medmatch-api.glitch.me' // Change to your Glitch URL
```

### Update handleSubmit function:

Replace the localStorage code with:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setError('')

  if (!agreed) {
    setError('Bitte akzeptiere die Nutzungsbedingungen und Datenschutzerklärung.')
    return
  }

  if (password.length < 6) {
    setError('Das Passwort muss mindestens 6 Zeichen lang sein.')
    return
  }

  setLoading(true)

  // Track signup attempt
  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible('Signup Submit')
  }

  try {
    // Call Glitch API
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        firstName: email.split('@')[0], // Use email prefix as firstName
        lastName: 'User', // Default lastName
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed')
    }

    setSuccess(true)
    trackSignupSuccess()
  } catch (err: any) {
    setError(err.message || 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.')
  } finally {
    setLoading(false)
  }
}
```

### Rebuild and Redeploy:

```bash
cd landing-page
npm run build
npm run export

# Copy dist to gh-pages branch or deploy to Vercel
```

---

## Step 7: End-to-End Test

1. Open landing page (GitHub Pages / Vercel)
2. Fill signup form
3. Submit
4. Check Glitch API: `https://medmatch-api.glitch.me/api/signups`
5. Verify data appears

---

## Glitch Project Settings

### Keep Alive (Prevent Sleep)

Glitch projects sleep after 5 minutes of inactivity. For production:

1. Use **Glitch Pro** ($8/month) - Always on
2. Or: Set up a ping service (UptimeRobot, Pingdom) to hit `/api/health` every 5 minutes

### Environment Variables (if needed)

Click **.env** file in Glitch sidebar to add:

```
NODE_ENV=production
```

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/auth/register` | POST | Register candidate |
| `/api/signups` | GET | List all signups |
| `/api/signups/count` | GET | Count signups |

### POST /api/auth/register

**Request body:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "yearOfGraduation": "2024",
  "specialization": "Cardiology",
  "state": "Bayern"
}
```

**Required fields:** `email`, `firstName`, `lastName`

---

## Data Persistence

- SQLite database stored in `.data/medmatch.db`
- Glitch filesystem is persistent
- Data survives container restarts
- SQLite is serverless-friendly (no separate DB server)

---

## Troubleshooting

### sqlite3 install fails

Wait 2-3 minutes. Glitch compiles native modules slowly. Check logs.

### API returns 500

Check Glitch console for errors. Common issues:
- Database permissions (fixed by using `.data/` folder)
- Missing fields in request

### CORS errors on frontend

The API allows all origins (`*`). If issues persist:
1. Check browser console
2. Verify API URL is correct
3. Ensure HTTPS (not HTTP) is used

### Data lost after restart

Ensure database path is `.data/medmatch.db` (dot-data folder is persistent).

---

## Migration Plan

This is **temporary**. Once [BER-54](/BER/issues/BER-54) credentials arrive:

1. Export SQLite data: `GET /api/signups`
2. Deploy to proper cloud (Railway/Fly.io/Render)
3. Update landing page API URL
4. Shut down Glitch project

---

## Files Included

- `server.js` - Express API with SQLite
- `package.json` - Dependencies
- `GLITCH_DEPLOY.md` - This guide

---

## Support

- Glitch Help: [glitch.com/help](https://glitch.com/help)
- SQLite: [sqlite.org/docs](https://sqlite.org/docs.html)
- MedMatch Team: Contact CTO
