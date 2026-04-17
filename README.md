# MedMatch - Job Platform for Medical Graduates

[![Staging](https://img.shields.io/badge/staging-medmatch--demo.vercel.app-blue)](https://medmatch-demo.vercel.app)
[![Production](https://img.shields.io/badge/production-medmatch.de-lightgrey)](https://medmatch.de)

A modern job platform connecting medical graduates with employers in Germany.

## 🎯 Mission

We help Absolventen des Medizinstudiums (medical graduates) find their dream jobs by providing:
- Transparent employer reviews
- Personalized job recommendations
- Direct application process
- Fair working conditions data

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Landing Page   │────▶│  Backend API    │────▶│   PostgreSQL    │
│  (Next.js)      │     │  (Next.js)      │     │   Database      │
│  Static Export  │     │  REST API       │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
       │                         │
       ▼                         ▼
  Vercel Hosting          Render/Railway
  medmatch.de             api.medmatch.de
```

## 📁 Project Structure

```
├── landing-page/          # Frontend (Next.js, static export)
│   ├── components/        # React components
│   ├── pages/            # Next.js pages
│   ├── lib/              # Utilities (tracking, api)
│   └── dist/             # Build output
│
├── medmatch/             # Backend API (Next.js)
│   ├── src/
│   │   ├── app/          # API routes
│   │   │   ├── api/health/route.ts
│   │   │   └── api/auth/register/route.ts
│   │   ├── lib/          # Utilities (email, test)
│   │   └── middleware.ts # Security middleware
│   └── prisma/           # Database schema
│
├── .github/workflows/    # CI/CD pipelines
├── DEPLOYMENT_GUIDE.md   # Production deployment
├── STAGING_DEPLOYMENT.md # Staging deployment
└── STATUS.md             # Current project status
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn
- PostgreSQL (or use SQLite for dev)

### Local Development

```bash
# Clone repository
git clone <repo-url>
cd medmatch

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Landing Page Development

```bash
cd landing-page
npm install
npm run dev
```

## 📦 Deployment

### Production (medmatch.de)
See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

### Staging (medmatch-demo.vercel.app)
See [STAGING_DEPLOYMENT.md](./STAGING_DEPLOYMENT.md)

Quick staging deploy:
```bash
# Push to GitHub
git push origin main

# Deploy to Render (auto-deploys from blueprint)
# Deploy to Vercel (auto-deploys from Git)
```

## 🔧 API Endpoints

### Health Check
```bash
GET /api/health
Response: { "status": "healthy", "database": "connected" }
```

### User Registration
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "Max",
  "lastName": "Mustermann",
  "userType": "graduate"
}
```

## 🛡️ Security

- ✅ Password hashing (bcrypt)
- ✅ CORS protection
- ✅ Rate limiting (10 req/min)
- ✅ Security headers (X-Frame-Options, X-Content-Type-Options)
- ✅ Input validation
- ✅ SQL injection prevention (Prisma ORM)

See [SECURITY.md](./SECURITY.md) for details.

## 📊 Monitoring

- Health checks via `/api/health`
- Rate limit headers on all API responses
- Uptime monitoring setup guide in [MONITORING.md](./MONITORING.md)

## 🧪 Testing

```bash
# Backend
cd medmatch
npm run build  # Verify build passes

# Landing page
cd landing-page
npm run build  # Verify build passes
```

See [QA_CHECKLIST.md](./QA_CHECKLIST.md) for comprehensive testing.

## 📝 Documentation

| Document | Purpose |
|----------|---------|
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Production deployment |
| [STAGING_DEPLOYMENT.md](./STAGING_DEPLOYMENT.md) | Staging deployment |
| [PRE_LAUNCH_CHECKLIST.md](./PRE_LAUNCH_CHECKLIST.md) | Go-live checklist |
| [SECURITY.md](./SECURITY.md) | Security measures |
| [MONITORING.md](./MONITORING.md) | Uptime monitoring |
| [QA_CHECKLIST.md](./QA_CHECKLIST.md) | Testing procedures |
| [STATUS.md](./STATUS.md) | Current project status |

## 🤝 Contributing

This is a Paperclip company project. See task assignments in the Paperclip dashboard.

## 📄 License

Private - All rights reserved.

## 🆘 Support

For technical issues:
- CTO Agent: [BER issues assigned to CTO](./issues?q=assignee%3Acto)
- Deployment: See DEPLOYMENT_GUIDE.md
- Security: See SECURITY.md

---

**Status**: Technical preparation complete, awaiting domain deployment  
**Last Updated**: 2026-04-17
