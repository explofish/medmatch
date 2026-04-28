# MedMatch API

Express.js API with **SQLite persistence** for MedMatch staging/production. Data persists across container restarts via persistent filesystem storage.

## Features

- ✅ Health check endpoint (`/api/health`)
- ✅ Signup/registration endpoint (`/api/auth/register`)
- ✅ Candidate profile CRUD endpoints (`/api/candidates`)
- ✅ CORS configured for all origins (production-ready)
- ✅ **SQLite database** - Data persists across restarts
- ✅ View all signups endpoint (`/api/signups`)
- ✅ Signup count endpoint (`/api/signups/count`)
- ✅ Input validation and error handling
- ✅ Pagination, filtering, and sorting
- ✅ Soft delete support
- ✅ Unit tests included

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

### Signup / Waitlist

#### Register for Waitlist
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

#### View All Signups (Admin)
```
GET /api/signups
```

#### Count Signups
```
GET /api/signups/count
```

### Candidate Profiles

#### List Candidates
```
GET /api/candidates?page=1&limit=20&location=Berlin&specialty=Cardiology&sortBy=experienceYears&sortOrder=desc
```

Query parameters:
- `location` - Filter by location (partial match)
- `specialty` - Filter by specialty (partial match)
- `minExperience` - Minimum years of experience
- `maxExperience` - Maximum years of experience
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `sortBy` - Sort field (default: `createdAt`)
- `sortOrder` - `asc` or `desc` (default: `desc`)

Response:
```json
{
  "data": [
    {
      "id": 1,
      "email": "doctor@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "location": "Berlin",
      "specialty": "Cardiology",
      "experienceYears": 5,
      "cvUrl": "https://example.com/cv.pdf",
      "preferences": { "jobType": "full-time" },
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

#### Get Single Candidate
```
GET /api/candidates/:id
```

#### Create Candidate
```
POST /api/candidates
Content-Type: application/json

{
  "email": "doctor@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "location": "Berlin",
  "specialty": "Cardiology",
  "experienceYears": 5,
  "cvUrl": "https://example.com/cv.pdf",
  "preferences": {
    "jobType": "full-time",
    "desiredSalary": 80000
  }
}
```

#### Update Candidate (Partial)
```
PATCH /api/candidates/:id
Content-Type: application/json

{
  "location": "Munich",
  "experienceYears": 6
}
```

#### Delete Candidate (Soft Delete)
```
DELETE /api/candidates/:id
```

See full API documentation: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## Running Tests

### Install and Run
```bash
cd mock-api
npm install
npm test
```

### Test Coverage
The test suite includes **100 comprehensive tests** achieving **81.66% statement coverage**:

| Category | Tests | Coverage |
|----------|-------|----------|
| **Candidates** | 21 | CRUD, validation, filtering, pagination, soft delete |
| **Employers** | 11 | CRUD, validation, filtering, jobs relationship |
| **Jobs** | 18 | CRUD, validation, filtering, soft delete, error cases |
| **Matching Algorithm** | 11 | Score calculation, specialty/location/experience/salary matching |
| **Matches API** | 6 | Ranking, filtering, error cases |
| **Signup / Auth** | 4 | Registration, duplicate handling, count endpoints |
| **Seed & Health** | 4 | Data seeding, health check, idempotency |

### Test Output Example
```
 PASS  server.test.js
  Candidate API
    POST /api/candidates
      ✓ should create a new candidate with valid data
      ✓ should reject duplicate email
      ✓ should reject missing required fields
    ...
  
Test Suites: 1 passed, 1 total
Tests:       100 passed, 100 total
Coverage:    81.66% Stmts | 85.97% Branch | 98.57% Funcs | 81.98% Lines
```

### Watch Mode (Development)
```bash
npm run test:watch
```

### CI-Ready Configuration
Tests use SQLite in-memory database and run without external dependencies.

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

## Documentation

- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Complete API endpoint documentation
- [docs/openapi.yml](./docs/openapi.yml) - OpenAPI 3.0 specification (import into Swagger UI, Postman, or Insomnia)
- [docs/postman-collection.json](./docs/postman-collection.json) - Ready-to-use Postman collection
- [GLITCH_DEPLOY.md](./GLITCH_DEPLOY.md) - Detailed Glitch deployment guide

## Quick Start (5 Minutes)

### 1. Install Dependencies
```bash
cd mock-api
npm install
```

### 2. Start the Server
```bash
npm start
```

### 3. Test the API
```bash
# Health check
curl http://localhost:3000/api/health

# Register a candidate
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","firstName":"Max","lastName":"Mustermann"}'

# List candidates
curl http://localhost:3000/api/candidates
```

**Done!** API is running at `http://localhost:3000`

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        MedMatch API                          │
├─────────────────────────────────────────────────────────────┤
│  Express.js Server (Node.js 18+)                             │
│  ├── CORS Middleware (All Origins)                           │
│  ├── JSON Body Parser                                        │
│  └── Error Handling Middleware                               │
├─────────────────────────────────────────────────────────────┤
│  API Endpoints                                               │
│  ├── /api/health          → Health check                   │
│  ├── /api/auth/register   → Signup/Waitlist                │
│  ├── /api/candidates      → CRUD operations                │
│  ├── /api/employers       → CRUD operations                │
│  ├── /api/jobs            → CRUD operations                │
│  ├── /api/matches         → Job matching algorithm         │
│  └── /api/seed            → Sample data                    │
├─────────────────────────────────────────────────────────────┤
│  SQLite Database                                             │
│  ├── signups          - Waitlist registrations             │
│  ├── candidates       - Candidate profiles                 │
│  ├── employers        - Hospital/employer profiles         │
│  └── jobs             - Job postings                       │
└─────────────────────────────────────────────────────────────┘
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server port |
| `TEST_DB_PATH` | No (tests only) | `.data/medmatch.db` | Test database path |

**Note:** Production deployment variables (RAILWAY_TOKEN, FLY_API_TOKEN, etc.) are configured in hosting platform, not in code.

## Contributing

### Development Setup
```bash
# Clone and install
cd mock-api
npm install

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm run test:watch
```

### Code Standards
- All endpoints must have corresponding tests
- Use JSDoc comments for public functions
- Maintain 80%+ test coverage
- Follow existing error handling patterns

### Testing
```bash
# Unit tests
npm test

# Specific test suite
npm test -- --testNamePattern="Candidate API"
```

## Files

- `server.js` - Express API with SQLite (1615 lines, fully documented)
- `server.test.js` - Comprehensive test suite (38 tests, 80%+ coverage target)
- `package.json` - Dependencies and scripts
- `.data/medmatch.db` - SQLite database (auto-created)

## API Development Status

### Implemented ✓
- Candidate profile CRUD endpoints
- Pagination, filtering, sorting
- Input validation
- Soft delete
- Unit tests
- API documentation

### Ready for Production
When BER-123 unblocks production credentials:
- These endpoints will work immediately with production database
- Only database connection config needs to change
