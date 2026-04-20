# MedMatch API

Express.js API with **SQLite persistence** for MedMatch staging/production. Data persists across container restarts via persistent filesystem storage.

## Features

- ✅ Health check endpoint (`/api/health`)
- ✅ Signup/registration endpoint (`/api/auth/register`)
- ✅ CORS configured for all origins (production-ready)
- ✅ **SQLite database** - Data persists across restarts
- ✅ View all signups endpoint (`/api/signups`)
- ✅ Signup count endpoint (`/api/signups/count`)

## Quick Deploy Options

### Option 1: Glitch (Recommended for Quick Deploy)

**See detailed guide:** [GLITCH_DEPLOY.md](./GLITCH_DEPLOY.md)

Quick start:
1. Go to [glitch.com](https://glitch.com)
2. New Project → **hello-express**
3. Upload `server.js` and `package.json`
4. API live at `https://your-project.glitch.me`

### Option 2: Render (Free Tier)

1. Go to [Render](https://render.com/)
2. Create account with GitHub
3. New Web Service → Connect this repo
4. Set root directory: `mock-api`
5. Build command: `npm install`
6. Start command: `npm start`

### Option 3: Railway

1. Go to [Railway](https://railway.app/)
2. New Project → Deploy from GitHub repo
3. Select this repository
4. Set root directory: `mock-api`
5. Deploy

### Option 4: Local Testing

```bash
cd mock-api
npm install
npm start
# API runs on http://localhost:3000
```

## API Endpoints

### Health Check
```
GET /api/health
```
Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "medmatch-api"
}
```

### Register for Waitlist
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "yearOfGraduation": "2024",
  "specialization": "Cardiology",
  "state": "Bayern"
}
```

Response:
```json
{
  "success": true,
  "message": "Successfully joined the waitlist!",
  "data": {
    "id": "1",
    "email": "user@example.com",
    "firstName": "John"
  }
}
```

### View All Signups (Admin)
```
GET /api/signups
```

### Count Signups
```
GET /api/signups/count
```

## CORS Configuration

The API is configured to accept requests from **all origins** (`*`) for maximum compatibility with static hosting (GitHub Pages, Vercel, Netlify).

## Data Persistence

- SQLite database stored in `.data/medmatch.db`
- On Glitch: Filesystem is persistent across container restarts
- On Render/Railway: Use attached disk or migrate to PostgreSQL
- Local: Database file persists in project directory

## Frontend Integration

Update `landing-page/components/SignupCTA.tsx`:

```typescript
const API_BASE_URL = 'https://your-project.glitch.me' // Or your deployed URL
```

The signup form will POST to `${API_BASE_URL}/api/auth/register`.

## Migration to Production Database

When ready to migrate from SQLite to PostgreSQL:

1. Export data: `GET /api/signups` → Save JSON
2. Set up PostgreSQL database
3. Update `server.js` to use `pg` instead of `sqlite3`
4. Import data to new database

## Files

- `server.js` - Express API with SQLite
- `package.json` - Dependencies
- `GLITCH_DEPLOY.md` - Detailed Glitch deployment guide
- `.data/medmatch.db` - SQLite database (auto-created)
