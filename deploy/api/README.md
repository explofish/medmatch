# MedMatch API Deployment

Simple Express.js API with SQLite database for MedMatch waitlist signups.

## Deploy to Glitch

1. Go to https://glitch.com
2. Click "New Project" → "hello-express"
3. In editor: Tools → Import/Export → Import from GitHub
4. Enter: `explofish/medmatch/deploy/api`
5. Wait for SQLite to compile
6. Test: `https://your-project.glitch.me/api/health`

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/register` - Register candidate
- `GET /api/signups` - List signups
- `GET /api/signups/count` - Count signups
