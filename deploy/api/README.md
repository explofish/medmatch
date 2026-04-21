# MedMatch API

Express.js API with SQLite persistence for MedMatch.

## Deploy to Glitch

1. Go to https://glitch.com
2. Click "New Project" → "hello-express"
3. In the editor, click "Tools" → "Import/Export" → "Import from GitHub"
4. Enter: `explofish/medmatch`
5. Set project path: `deploy/api`
6. Wait for SQLite to compile (2-3 minutes)
7. Your API will be live at `https://your-project-name.glitch.me`

## Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/register` - Register for waitlist
- `GET /api/signups` - View all signups (admin)
- `GET /api/signups/count` - Count signups
