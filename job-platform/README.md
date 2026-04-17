# MedMatch - Job Matching Platform for Medical Graduates

A full-stack web application connecting medical school graduates with relevant job opportunities in clinical and non-clinical healthcare roles.

## Features

### For Medical Graduates
- **Profile Creation**: Build a comprehensive profile with education, specializations, and preferences
- **Job Search**: Filter jobs by location, specialization, job type, and salary
- **Smart Matching**: AI-powered matching algorithm suggests relevant jobs based on profile
- **One-Click Apply**: Easy application process with cover letter support
- **Application Tracking**: Track status of all submitted applications

### For Employers
- **Company Profile**: Showcase company information and culture
- **Job Posting**: Create detailed job postings with requirements and specializations
- **Application Management**: Review, shortlist, and manage candidate applications
- **Dashboard**: View statistics and recent applications at a glance

### Technical Features
- JWT-based authentication
- PostgreSQL database with full-text search capabilities
- RESTful API design
- Responsive React frontend
- Smart matching algorithm (specialization + location + job type)
- Email system for partnership outreach with tracking

## Architecture

```
job-platform/
├── backend/              # Node.js/Express API
│   ├── database/         # SQL schema
│   ├── email-system/     # Partnership outreach email system
│   ├── routes/           # API endpoints
│   └── server.js         # Entry point
└── frontend/             # React SPA
    ├── src/
    │   ├── components/   # Reusable UI components
    │   ├── pages/        # Page components
    │   ├── stores/       # Zustand state management
    │   └── utils/        # API utilities
    └── index.html
```

## Tech Stack

### Backend
- Node.js 18+
- Express.js
- PostgreSQL 14+
- JWT Authentication
- bcryptjs for password hashing

### Frontend
- React 18
- Vite (build tool)
- Tailwind CSS
- React Query (data fetching)
- Zustand (state management)
- React Hook Form (forms)
- Lucide React (icons)

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Backend Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Initialize database:
```bash
npm run init-db
```

4. Start server:
```bash
npm run dev
```

Server runs on http://localhost:3001

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start development server:
```bash
npm run dev
```

Frontend runs on http://localhost:5173

## Signup API Documentation

### `POST /api/auth/signup`

Register a new candidate from the landing page.

**Request Body:**
```json
{
  "email": "string (required) - Valid email address",
  "password": "string (required) - Min 8 characters",
  "graduationYear": "number (optional) - Year of graduation (1900-2100)",
  "specialty": "string (optional) - Medical specialty of interest",
  "location": "string (optional) - City, State format"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Account created successfully. Please check your email to verify your account.",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "userType": "graduate",
    "emailVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Validation failed (invalid email, short password, etc.)
- `409` - Email already exists
- `500` - Server error

### `GET /api/auth/verify-email?token={token}`

Verify email address with the token sent via email.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully. You can now log in.",
  "email": "user@example.com"
}
```

**Error Responses:**
- `400` - Invalid or expired token

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new candidate from landing page
- `GET /api/auth/verify-email` - Verify email with token
- `POST /api/auth/register` - Register new user (general)
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Email System (Partnership Outreach)
- `GET /api/email/templates` - List available email templates
- `POST /api/email/send` - Send single email
- `POST /api/email/send-bulk` - Send bulk emails with rate limiting
- `GET /api/email/analytics` - View campaign statistics
- `GET /api/email/verify-config` - Verify email configuration

### Jobs
- `GET /api/jobs` - List all jobs (with filters)
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs` - Create job (employer only)
- `PATCH /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job

### Applications
- `GET /api/applications/my-applications` - Get my applications
- `GET /api/applications/received` - Get received applications (employer)
- `POST /api/applications` - Submit application
- `PATCH /api/applications/:id/status` - Update application status

### Matching
- `GET /api/matches/my-matches` - Get job matches
- `POST /api/matches/generate` - Generate new matches

## Database Schema

### Core Tables
- `users` - Base user accounts
- `graduate_profiles` - Graduate-specific data
- `employer_profiles` - Employer-specific data
- `jobs` - Job postings
- `applications` - Job applications
- `matches` - Algorithm-generated matches
- `specializations` - Medical specializations lookup
- `email_tracking` - Email campaign analytics
- `email_verification_tokens` - Email verification

## Email System

The email system supports partnership outreach to medical schools, professional associations, and employers.

**Features:**
- Multi-provider support (SendGrid, AWS SES, Resend, Mailgun)
- Pre-built partnership templates
- Bulk sending with rate limiting
- Open/click/bounce tracking

**Documentation:** See [backend/email-system/CMO-GUIDE.md](./backend/email-system/CMO-GUIDE.md)

## Success Criteria Met

✅ A graduate can create a profile, search jobs, and apply  
✅ An employer can post a job and review applications  
✅ Basic matching suggests relevant jobs to graduates  
✅ Landing page signup with email verification  
✅ Email system for partnership outreach with tracking  

## Phase 2 Enhancements (Future)

- [ ] Resume/CV upload
- [ ] Advanced search filters
- [ ] Saved searches
- [ ] Company reviews
- [ ] Salary insights/analytics
- [ ] Mobile app
- [ ] Interview scheduling
- [ ] Messaging between candidates and employers
- [ ] Email provider configuration for production

## License

MIT
