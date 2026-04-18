# MedMatch Mock API

Simple Express.js mock API for MedMatch staging/demo purposes. This API runs without a database (in-memory storage) and is perfect for quick deployment to validate the frontend signup flow.

## Features

- ✅ Health check endpoint
- ✅ Signup/registration endpoint (`/api/auth/register`)
- ✅ CORS configured for GitHub Pages
- ✅ In-memory storage (no database needed)
- ✅ View all signups endpoint (admin)

## Quick Deploy Options

### Option 1: Glitch (Recommended - Free, No Account Setup Required)

[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2c2a5be13%2Fremix-button-v2.svg)](https://glitch.com/edit/#!/remix/hello-express)

**Manual steps:**
1. Go to [Glitch](https://glitch.com/)
2. Click **New Project** → **hello-express**
3. Delete the default files
4. Upload `server.js` and `package.json` from this folder
5. The API will be live instantly at `https://your-project-name.glitch.me`

### Option 2: Replit

1. Go to [Replit](https://replit.com/)
2. Create new Repl → Node.js
3. Copy `server.js` and `package.json` contents
4. Click Run
5. API will be live at your Replit URL

### Option 3: Render (Free Tier)

1. Go to [Render](https://render.com/)
2. Create account with GitHub
3. New Web Service → Connect this repo
4. Set root directory: `mock-api`
5. Build command: `npm install`
6. Start command: `npm start`

### Option 4: Local Testing

```bash
cd mock-api
npm install
npm start
# API runs on http://localhost:3001
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
  "timestamp": "2024-01-15T10:30:00.000Z"
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

### View All Signups (Admin)
```
GET /api/signups
```

## CORS Configuration

The API is configured to accept requests from:
- `https://explofish.github.io` (production landing page)
- `http://localhost:3000` (local development)
- `http://localhost:3001` (local development)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment | production |

## Limitations

- Data is stored in memory (lost on server restart)
- Not suitable for production use
- Perfect for demos and staging

## Frontend Integration

The landing page at `https://explofish.github.io/medmatch/` is configured to send signup requests to this API. Update the `API_BASE_URL` in the frontend to match your deployed API URL.
