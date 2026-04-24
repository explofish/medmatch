# MedMatch Job Platform Backend

Job matching platform backend for medical professionals in Germany. Built with Express.js and SQLite for local development.

## Features

- **Employer Management**: CRUD operations for hospitals and clinics
- **Job Postings**: Create and manage medical job listings
- **Candidate Profiles**: Track medical professionals and their preferences
- **Job Matching Algorithm**: Intelligent matching based on specialty, location, experience, and salary
- **REST API**: Full-featured API with pagination and filtering
- **Query Caching**: In-memory caching for improved performance
- **Request Logging**: Detailed logging with response times
- **Input Validation**: Centralized validation middleware

## Quick Start

```bash
# Install dependencies
npm install

# Seed database with sample data
npm run seed

# Start server
npm start
```

Server runs on `http://localhost:3001`

## Development Commands

```bash
# Run linter
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run benchmarks
npm run benchmark

# Seed database
npm run seed

# Health check
npm run health
```

## API Endpoints

### Health Check
- `GET /api/health` - Check API status and cache statistics

### Employers
- `GET /api/employers` - List employers (with filters, pagination)
- `GET /api/employers/:id` - Get employer profile
- `POST /api/employers` - Create employer
- `PATCH /api/employers/:id` - Update employer
- `DELETE /api/employers/:id` - Soft delete employer

**Query Parameters for GET /api/employers:**
- `location` - Filter by location (partial match)
- `type` - Filter by hospital type
- `size` - Filter by size (small, medium, large)
- `verified` - Only verified employers (true/false)
- `page`, `limit` - Pagination
- `sortBy`, `sortOrder` - Sorting

### Jobs
- `GET /api/jobs` - List jobs (with filters, pagination)
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs` - Create job posting
- `PATCH /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Soft delete job

**Query Parameters for GET /api/jobs:**
- `location` - Filter by location
- `specialty` - Filter by specialty
- `employerId` - Filter by employer
- `jobType` - full-time, part-time, contract
- `minSalary`, `maxSalary` - Salary range
- `minExperience` - Maximum experience required
- `status` - active, closed, draft
- `page`, `limit` - Pagination
- `sortBy` - postedAt, salaryMin, salaryMax, experienceRequired

### Candidates
- `GET /api/candidates` - List candidates
- `GET /api/candidates/:id` - Get candidate profile
- `POST /api/candidates` - Create candidate
- `PATCH /api/candidates/:id` - Update candidate
- `DELETE /api/candidates/:id` - Soft delete candidate
- `GET /api/candidates/:id/matches` - Get job matches for candidate

### Job Matching
- `GET /api/matches?candidateId=xxx` - Get job matches for candidate
- `GET /api/matches/score?candidateId=xxx&jobId=yyy` - Calculate match score
- `POST /api/matches/batch` - Batch match multiple candidates to a job

**Query Parameters for GET /api/matches:**
- `candidateId` (required) - Candidate ID
- `limit` - Max matches to return (default: 10)
- `minScore` - Minimum match score threshold
- `specialty`, `location`, `jobType` - Additional filters

### Applications
- `GET /api/applications` - List applications
- `GET /api/applications/:id` - Get application details
- `POST /api/applications` - Submit application
- `PATCH /api/applications/:id` - Update application status
- `DELETE /api/applications/:id` - Withdraw application

### Dashboard
- `GET /api/dashboard/employer/:id` - Employer dashboard stats
- `GET /api/dashboard/candidate/:id` - Candidate dashboard stats
- `GET /api/dashboard/admin` - System-wide admin stats

### Notifications
- `GET /api/notifications` - List notifications
- `PATCH /api/notifications/:id/read` - Mark notification as read

### Admin
- `POST /api/admin/clear-cache` - Clear query cache

## Job Matching Algorithm

The matching algorithm calculates a score from 0-100 based on:

| Factor | Weight | Scoring |
|--------|--------|---------|
| Specialty Match | 40% | Exact=40, Related=20-25, No match=0 |
| Location Match | 30% | Exact=30, Same region=20, Preferred=15 |
| Experience Match | 20% | Meets requirement=20, Close=10-15, Under=0 |
| Salary Match | 10% | Within range=10, Above max=10, Below=0-5 |

**Match Grades:**
- A (80-100): Excellent match
- B (60-79): Good match
- C (40-59): Fair match
- D (20-39): Poor match
- F (0-19): No match

## Environment Variables

### Required
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment (development, test, production) | `development` |

### Optional
| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` |
| `LOG_BODY` | Log request bodies (true/false) | `false` |

### Production Variables
When deploying to production, these should be set:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins | `https://medmatch.de,https://app.medmatch.de` |
| `JWT_SECRET` | Secret for JWT signing | (generate strong secret) |
| `BCRYPT_ROUNDS` | Password hashing rounds | `12` |

See [SECURITY.md](./SECURITY.md) for detailed security configuration.

## Database

Uses SQLite for local development. Database file: `.data/medmatch.db`

**Tables:**
- `employers` - Hospital/clinic information
- `jobs` - Job postings
- `candidates` - Medical professional profiles
- `applications` - Job applications
- `notifications` - User notifications

**Indexes:**
Database includes optimized indexes for:
- Jobs: employerId, specialty, location, status, postedAt
- Candidates: specialty, location, email
- Applications: candidateId, jobId, status
- Employers: location
- Notifications: userType, userId, read status

## Sample Data

The seed script creates:
- 10 sample employers (hospitals and clinics across Germany/Switzerland)
- 20 sample job postings (various medical specialties)
- 5 sample candidates with different profiles
- Sample applications and notifications

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

Test coverage includes:
- API endpoint tests
- Matching algorithm tests
- Application workflow tests

## Performance

### Caching Strategy
- List endpoints: 30 second TTL
- Single item endpoints: 5 minute TTL
- Match results: 1 minute TTL
- Cache invalidation on write operations

### Query Optimization
- Database indexes on all query fields
- Soft delete pattern with isDeleted flag
- Pagination on all list endpoints (max 100 items/page)
- Response compression for large payloads

See [PERFORMANCE.md](./PERFORMANCE.md) for detailed performance analysis.

## Production Deployment

When BER-123 (PostgreSQL credentials) unblocks, the database layer can be swapped:

1. Replace `sqlite3` with `pg` or another PostgreSQL driver
2. Update connection code in `src/server.js`
3. No API changes required - same REST interface

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment checklist.

## API Examples

### Create a Job
```bash
curl -X POST http://localhost:3001/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "employerId": 1,
    "title": "Facharzt Kardiologie",
    "specialty": "Cardiology",
    "location": "Berlin",
    "jobType": "full-time",
    "salaryMin": 80000,
    "salaryMax": 100000
  }'
```

### Get Job Matches for Candidate
```bash
curl "http://localhost:3001/api/matches?candidateId=1&limit=5"
```

Response:
```json
{
  "candidate": { ... },
  "matches": [
    {
      "job": { ... },
      "matchScore": 85,
      "matchGrade": "A",
      "matchReasons": ["Specialty match", "Location match"],
      "matchDetails": { ... }
    }
  ],
  "summary": { ... }
}
```

## Project Structure

```
job-platform/backend/
├── src/
│   ├── middleware/
│   │   ├── compression.js     # Response compression
│   │   ├── errorHandler.js    # Error handling
│   │   ├── logging.js         # Request/response logging
│   │   └── validation.js      # Input validation
│   ├── routes/
│   │   ├── applications.js    # Application endpoints
│   │   ├── candidates.js      # Candidate endpoints
│   │   ├── dashboard.js       # Dashboard endpoints
│   │   ├── employers.js       # Employer endpoints
│   │   ├── jobs.js            # Job endpoints
│   │   ├── matches.js         # Matching endpoints
│   │   └── notifications.js   # Notification endpoints
│   ├── utils/
│   │   └── cache.js           # Query caching
│   ├── matching/
│   │   └── engine.js          # Matching algorithm
│   └── server.js              # Main server file
├── scripts/
│   ├── seed.js                # Database seeding
│   └── benchmark.js           # Performance benchmarks
├── tests/                     # Test files
├── .eslintrc.js              # ESLint configuration
├── .eslintignore             # ESLint ignore patterns
├── package.json
├── README.md
├── SECURITY.md               # Security documentation
├── DEPLOYMENT.md             # Deployment guide
└── PERFORMANCE.md            # Performance analysis
```

## Contributing

Code quality standards:
- Run `npm run lint` before committing
- Follow existing code style (enforced by ESLint)
- Write tests for new endpoints
- Update documentation for API changes

## License

MIT
