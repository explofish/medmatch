# MedMatch API Documentation

REST API for job matching platform with SQLite persistence for local development.

## Base URL

Local development: `http://localhost:3000`

## Authentication

Currently no authentication required for local development.

## Rate Limiting

The API implements token bucket rate limiting to ensure fair usage and platform stability.

### Rate Limit Tiers

| Tier | Requests per 15min | Use Case |
|------|-------------------|----------|
| `anonymous` | 100 | Unauthenticated requests |
| `free` | 1,000 | Standard API users |
| `premium` | 10,000 | Paid tier users |
| `internal` | 100,000 | Internal services |

### Rate Limit Headers

All API responses include rate limit information:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed per window |
| `X-RateLimit-Remaining` | Remaining requests in current window |
| `Retry-After` | Seconds until retry (when limited) |

### Rate Limit Response

When rate limit is exceeded:

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 900,
  "limit": 1000
}
```

**Status Code:** `429 Too Many Requests`

### Endpoint-Specific Limits

| Endpoint | Rate Limit | Notes |
|----------|------------|-------|
| `POST /api/auth/register` | 100/15min (anonymous) | Stricter to prevent abuse |
| `POST /api/auth/*` | 100/15min (anonymous) | Authentication endpoints |
| `GET /api/*` | 1,000/15min (free) | Standard read operations |
| `POST /api/*` | 1,000/15min (free) | Standard write operations |
| `GET /api/signups/*` | 100,000/15min (internal) | Admin endpoints |

## Response Caching

The API implements response caching to improve performance and reduce server load.

### Cache Headers

| Header | Description |
|--------|-------------|
| `X-Cache` | `HIT` (cached) or `MISS` (fresh) |
| `X-Cache-Key` | Cache key (debug purposes) |

### Cache Duration by Endpoint

| Endpoint Type | Cache TTL | Notes |
|---------------|-----------|-------|
| `GET /api/jobs` | 5 minutes | Job listings |
| `GET /api/candidates` | 1 minute | Candidate profiles |
| `GET /api/employers` | 5 minutes | Employer listings |
| `GET /api/candidates/:id` | 1 minute | Individual profile |
| `GET /api/health` | No cache | Health check |

### Cache Bypass

Add `?nocache=1` to any GET request to bypass caching:

```bash
curl "http://localhost:3000/api/jobs?nocache=1"
```

## Response Compression

API responses are automatically compressed using gzip or brotli (if supported).

### Compression Headers

| Header | Description |
|--------|-------------|
| `Content-Encoding` | `gzip`, `deflate`, or `br` (brotli) |
| `X-Compression-Ratio` | Percentage size reduction |
| `Vary` | `Accept-Encoding` |

### Compression Threshold

Responses larger than 1KB are automatically compressed.

---

## Endpoints Overview

| Category | Endpoint | Description |
|----------|----------|-------------|
| **Health** | `GET /api/health` | Health check |
| **Signups** | `POST /api/auth/register` | Register new signup |
| | `GET /api/signups` | List all signups |
| | `GET /api/signups/count` | Count signups |
| **Candidates** | `GET /api/candidates` | List candidates with filters |
| | `GET /api/candidates/:id` | Get candidate by ID |
| | `POST /api/candidates` | Create candidate |
| | `PATCH /api/candidates/:id` | Update candidate |
| | `DELETE /api/candidates/:id` | Soft delete candidate |
| **Employers** | `GET /api/employers` | List employers |
| | `GET /api/employers/:id` | Get employer with jobs |
| | `POST /api/employers` | Create employer |
| | `PATCH /api/employers/:id` | Update employer |
| **Jobs** | `GET /api/jobs` | List jobs with filters |
| | `GET /api/jobs/:id` | Get job by ID |
| | `POST /api/jobs` | Create job |
| | `PATCH /api/jobs/:id` | Update job |
| | `DELETE /api/jobs/:id` | Soft delete job |
| **Matching** | `GET /api/matches?candidateId=xxx` | Get ranked job matches |
| **Seed** | `POST /api/seed` | Seed sample data |

---

## Health Check

### GET /api/health
Check if the API is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "medmatch-api"
}
```

---

## Signups

### POST /api/auth/register
Register a new signup.

**Request Body:**
```json
{
  "email": "doctor@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "yearOfGraduation": "2020",
  "specialization": "Kardiologie",
  "state": "Berlin"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Successfully joined the waitlist!",
  "data": {
    "id": "1",
    "email": "doctor@example.com",
    "firstName": "John"
  }
}
```

---

## Candidates

### GET /api/candidates
List all candidates with pagination, filtering, and sorting.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `location` | string | Filter by location (partial match) |
| `specialty` | string | Filter by specialty (partial match) |
| `minExperience` | integer | Minimum years of experience |
| `maxExperience` | integer | Maximum years of experience |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (default: 20, max: 100) |
| `sortBy` | string | Sort field: `id`, `firstName`, `lastName`, `location`, `specialty`, `experienceYears`, `createdAt`, `updatedAt` |
| `sortOrder` | string | Sort direction: `asc` or `desc` (default: `desc`) |

**Example Request:**
```bash
curl "http://localhost:3000/api/candidates?location=Berlin&specialty=Kardiologie&page=1&limit=10"
```

**Example Response:**
```json
{
  "data": [
    {
      "id": 1,
      "email": "doctor@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "location": "Berlin",
      "specialty": "Kardiologie",
      "experienceYears": 5,
      "cvUrl": "https://example.com/cv.pdf",
      "preferences": {
        "jobType": "full-time",
        "minSalary": 80000,
        "willingToRelocate": true
      },
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### GET /api/candidates/:id
Get a single candidate by ID.

**Response (200):**
```json
{
  "data": {
    "id": 1,
    "email": "doctor@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "location": "Berlin",
    "specialty": "Kardiologie",
    "experienceYears": 5,
    "cvUrl": "https://example.com/cv.pdf",
    "preferences": {
      "jobType": "full-time",
      "minSalary": 80000
    },
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

### POST /api/candidates
Create a new candidate profile.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email address (must be unique) |
| `firstName` | string | Yes | Candidate's first name |
| `lastName` | string | Yes | Candidate's last name |
| `location` | string | No | City or region |
| `specialty` | string | No | Medical specialty (e.g., "Kardiologie") |
| `experienceYears` | integer | No | Years of experience (must be >= 0) |
| `cvUrl` | string | No | URL to CV/resume |
| `preferences` | object | No | JSON object with candidate preferences |

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/candidates" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "location": "Berlin",
    "specialty": "Kardiologie",
    "experienceYears": 5,
    "cvUrl": "https://example.com/cv.pdf",
    "preferences": {
      "jobType": "full-time",
      "minSalary": 80000,
      "willingToRelocate": true
    }
  }'
```

**Response (201):**
```json
{
  "message": "Candidate created successfully",
  "data": {
    "id": "1",
    "email": "doctor@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "location": "Berlin",
    "specialty": "Kardiologie",
    "experienceYears": 5,
    "cvUrl": "https://example.com/cv.pdf",
    "preferences": {
      "jobType": "full-time",
      "minSalary": 80000,
      "willingToRelocate": true
    },
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

### PATCH /api/candidates/:id
Update a candidate profile (partial update).

**Request Body:** Same as POST, all optional.

**Example Request:**
```bash
curl -X PATCH "http://localhost:3000/api/candidates/1" \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Munich",
    "experienceYears": 6,
    "preferences": {
      "jobType": "part-time",
      "minSalary": 90000
    }
  }'
```

**Response (200):**
```json
{
  "message": "Candidate updated successfully",
  "data": {
    "id": 1,
    "email": "doctor@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "location": "Munich",
    "specialty": "Kardiologie",
    "experienceYears": 6,
    "cvUrl": "https://example.com/cv.pdf",
    "preferences": {
      "jobType": "part-time",
      "minSalary": 90000
    },
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### DELETE /api/candidates/:id
Soft delete a candidate profile.

**Response (200):**
```json
{
  "message": "Candidate deleted successfully",
  "data": {
    "id": "1"
  }
}
```

---

## Employers

### GET /api/employers
List all employers with pagination and filtering.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `location` | string | Filter by location (partial match) |
| `hospitalType` | string | Filter by hospital type |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (default: 20, max: 100) |

**Example Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Charité - Universitätsmedizin Berlin",
      "description": "Europas größte Universitätsklinik",
      "location": "Berlin",
      "website": "https://www.charite.de",
      "hospitalType": "University Hospital",
      "size": "Large",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

### GET /api/employers/:id
Get employer profile with their active jobs.

**Response (200):**
```json
{
  "data": {
    "id": 1,
    "name": "Charité - Universitätsmedizin Berlin",
    "description": "Europas größte Universitätsklinik",
    "location": "Berlin",
    "website": "https://www.charite.de",
    "hospitalType": "University Hospital",
    "size": "Large",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z",
    "jobs": [
      {
        "id": 1,
        "title": "Facharzt Kardiologie",
        "specialty": "Kardiologie",
        "location": "Berlin",
        "salaryMin": 75000,
        "salaryMax": 95000,
        "jobType": "full-time",
        "experienceRequired": 5,
        "status": "active",
        "postedAt": "2024-01-15T10:00:00.000Z"
      }
    ]
  }
}
```

---

### POST /api/employers
Create a new employer profile.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Employer/hospital name |
| `description` | string | No | Description of the employer |
| `location` | string | No | City or region |
| `website` | string | No | Website URL |
| `hospitalType` | string | No | Type: "University Hospital", "City Hospital", "Clinic", etc. |
| `size` | string | No | "Small", "Medium", "Large" |

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/employers" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Hospital",
    "description": "Modern medical facility",
    "location": "Berlin",
    "website": "https://testhospital.de",
    "hospitalType": "City Hospital",
    "size": "Large"
  }'
```

**Response (201):**
```json
{
  "message": "Employer created successfully",
  "data": {
    "id": 1,
    "name": "Test Hospital",
    "description": "Modern medical facility",
    "location": "Berlin",
    "website": "https://testhospital.de",
    "hospitalType": "City Hospital",
    "size": "Large",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

### PATCH /api/employers/:id
Update an employer profile (partial update).

**Response (200):**
```json
{
  "message": "Employer updated successfully",
  "data": {
    "id": 1,
    "name": "Test Hospital",
    "description": "Updated description",
    ...
  }
}
```

---

## Jobs

### GET /api/jobs
List all jobs with filters, pagination, and sorting.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `employerId` | integer | Filter by employer ID |
| `specialty` | string | Filter by specialty (partial match) |
| `location` | string | Filter by location (partial match) |
| `jobType` | string | Filter by job type: "full-time", "part-time" |
| `minSalary` | integer | Minimum salary |
| `maxSalary` | integer | Maximum salary |
| `minExperience` | integer | Minimum experience required |
| `maxExperience` | integer | Maximum experience required |
| `status` | string | Filter by status: "active", "closed" (default: "active") |
| `sortBy` | string | Sort field: `id`, `title`, `specialty`, `location`, `salaryMin`, `salaryMax`, `postedAt` |
| `sortOrder` | string | Sort direction: `asc` or `desc` |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (default: 20, max: 100) |

**Example Request:**
```bash
curl "http://localhost:3000/api/jobs?specialty=Kardiologie&location=Berlin&minSalary=70000"
```

**Example Response:**
```json
{
  "data": [
    {
      "id": 1,
      "employerId": 1,
      "employerName": "Charité - Universitätsmedizin Berlin",
      "hospitalType": "University Hospital",
      "title": "Facharzt Kardiologie",
      "specialty": "Kardiologie",
      "location": "Berlin",
      "description": "Spannende Position in Kardiologie am Standort Berlin.",
      "requirements": "Facharztanerkennung. Erfahrung in Kardiologie erforderlich.",
      "salaryMin": 75000,
      "salaryMax": 95000,
      "jobType": "full-time",
      "experienceRequired": 5,
      "status": "active",
      "postedAt": "2024-01-15T10:00:00.000Z",
      "expiresAt": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

### GET /api/jobs/:id
Get a single job with employer details.

**Response (200):**
```json
{
  "data": {
    "id": 1,
    "employerId": 1,
    "title": "Facharzt Kardiologie",
    "specialty": "Kardiologie",
    "location": "Berlin",
    "description": "Spannende Position in Kardiologie...",
    "requirements": "Facharztanerkennung...",
    "salaryMin": 75000,
    "salaryMax": 95000,
    "jobType": "full-time",
    "experienceRequired": 5,
    "status": "active",
    "postedAt": "2024-01-15T10:00:00.000Z",
    "expiresAt": null,
    "employerName": "Charité - Universitätsmedizin Berlin",
    "employerDescription": "Europas größte Universitätsklinik",
    "employerLocation": "Berlin",
    "employerWebsite": "https://www.charite.de",
    "hospitalType": "University Hospital",
    "size": "Large"
  }
}
```

---

### POST /api/jobs
Create a new job posting.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `employerId` | integer | Yes | ID of the employer |
| `title` | string | Yes | Job title |
| `specialty` | string | No | Medical specialty required |
| `location` | string | No | Job location |
| `description` | string | No | Job description |
| `requirements` | string | No | Job requirements |
| `salaryMin` | integer | No | Minimum salary (EUR) |
| `salaryMax` | integer | No | Maximum salary (EUR) |
| `jobType` | string | No | "full-time", "part-time", or "contract" |
| `experienceRequired` | integer | No | Years of experience required |
| `expiresAt` | string | No | Expiration date (ISO 8601) |

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/jobs" \
  -H "Content-Type: application/json" \
  -d '{
    "employerId": 1,
    "title": "Facharzt Kardiologie",
    "specialty": "Kardiologie",
    "location": "Berlin",
    "description": "Spannende Position in der Kardiologie-Abteilung",
    "requirements": "Facharztanerkennung in Kardiologie",
    "salaryMin": 75000,
    "salaryMax": 95000,
    "jobType": "full-time",
    "experienceRequired": 5
  }'
```

**Response (201):**
```json
{
  "message": "Job created successfully",
  "data": {
    "id": 1,
    "employerId": 1,
    "employerName": "Charité - Universitätsmedizin Berlin",
    "title": "Facharzt Kardiologie",
    "specialty": "Kardiologie",
    "location": "Berlin",
    ...
  }
}
```

---

### PATCH /api/jobs/:id
Update a job posting (partial update).

**Response (200):**
```json
{
  "message": "Job updated successfully",
  "data": {
    "id": 1,
    "title": "Updated Title",
    "salaryMax": 100000,
    ...
  }
}
```

---

### DELETE /api/jobs/:id
Soft delete a job posting.

**Response (200):**
```json
{
  "message": "Job deleted successfully",
  "data": {
    "id": "1"
  }
}
```

---

## Job Matching

### GET /api/matches
Get ranked job matches for a candidate.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `candidateId` | integer | Yes | ID of the candidate to match |
| `minScore` | integer | No | Minimum match score (0-100, default: 0) |
| `limit` | integer | No | Maximum number of matches (default: 20, max: 100) |

**Matching Algorithm:**

The matching algorithm calculates a score (0-100) based on:

| Criteria | Weight | Description |
|----------|--------|-------------|
| Specialty match | 40% | Exact or partial specialty match |
| Location match | 25% | Exact or nearby location match |
| Experience match | 20% | Candidate experience vs required |
| Salary match | 15% | Salary meets candidate minimum |

**Example Request:**
```bash
curl "http://localhost:3000/api/matches?candidateId=1&minScore=50&limit=10"
```

**Example Response:**
```json
{
  "candidate": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "specialty": "Kardiologie",
    "location": "Berlin",
    "experienceYears": 5
  },
  "matches": [
    {
      "job": {
        "id": 1,
        "employerId": 1,
        "employerName": "Charité - Universitätsmedizin Berlin",
        "hospitalType": "University Hospital",
        "title": "Facharzt Kardiologie",
        "specialty": "Kardiologie",
        "location": "Berlin",
        "salaryMin": 75000,
        "salaryMax": 95000,
        "jobType": "full-time",
        "experienceRequired": 3,
        "postedAt": "2024-01-15T10:00:00.000Z"
      },
      "matchScore": 95,
      "matchReasons": [
        "Specialty is an exact match",
        "Location is an exact match",
        "Experience exceeds requirements (5 vs 3 years)",
        "Salary meets your minimum requirements"
      ],
      "matchedCriteria": 4
    },
    {
      "job": {
        "id": 2,
        "employerId": 2,
        "employerName": "Universitätsklinikum Heidelberg",
        "title": "Assistenzarzt Chirurgie",
        "specialty": "Chirurgie",
        "location": "Heidelberg",
        ...
      },
      "matchScore": 25,
      "matchReasons": [
        "No strong matches found"
      ],
      "matchedCriteria": 0
    }
  ],
  "totalMatches": 2,
  "totalJobsConsidered": 20,
  "minScore": 50
}
```

---

## Seed Data

### POST /api/seed
Seed the database with sample employers (10) and jobs (20) for development/testing.

**Response (200):**
```json
{
  "message": "Seed data inserted",
  "employersInserted": 10,
  "jobsInserted": 20
}
```

**Sample Employers:**
- Charité - Universitätsmedizin Berlin
- Universitätsklinikum Heidelberg
- Klinikum München
- Universitätsklinikum Hamburg-Eppendorf
- And 6 more...

**Sample Jobs:**
- Assistenzarzt positions (0 years exp, €50-65k)
- Facharzt positions (3-5 years exp, €70-100k)
- Oberarzt positions (8+ years exp, €85-120k)

---

## Running the API

### Start the Server
```bash
cd mock-api
npm install
npm start
```

The server will start on port 3000 (or the port specified by `PORT` environment variable).

### Run Tests
```bash
cd mock-api
npm install
npm test
```

---

## Database

The API uses SQLite with the database file stored in `mock-api/.data/medmatch.db`.

### Schema

**candidates table:**
```sql
CREATE TABLE candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  location TEXT,
  specialty TEXT,
  experienceYears INTEGER,
  cvUrl TEXT,
  preferences TEXT,        -- JSON stored as text
  isDeleted INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**employers table:**
```sql
CREATE TABLE employers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  website TEXT,
  hospitalType TEXT,
  size TEXT,
  isDeleted INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**jobs table:**
```sql
CREATE TABLE jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employerId INTEGER NOT NULL,
  title TEXT NOT NULL,
  specialty TEXT,
  location TEXT,
  description TEXT,
  requirements TEXT,
  salaryMin INTEGER,
  salaryMax INTEGER,
  jobType TEXT,
  experienceRequired INTEGER,
  postedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  expiresAt DATETIME,
  status TEXT DEFAULT 'active',
  isDeleted INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employerId) REFERENCES employers(id)
);
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created successfully |
| 400 | Bad request - validation failed |
| 404 | Resource not found |
| 409 | Conflict - duplicate email |
| 500 | Internal server error |

---

## Development Notes

- All timestamps are in ISO 8601 format (UTC)
- Email addresses are normalized to lowercase
- The `preferences` field accepts any valid JSON object
- Soft delete means data is not permanently lost, just hidden from API responses
- Ready for production deployment with PostgreSQL when BER-123 unblocks
