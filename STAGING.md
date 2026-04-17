# Staging Environment Configuration

## Staging URLs
- **Landing Page**: https://staging.medmatch.de (or Vercel preview URL)
- **Backend API**: https://api-staging.medmatch.de

## Environment Variables

### Landing Page (.env.staging)
```
BACKEND_URL=https://api-staging.medmatch.de
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=staging.medmatch.de
```

### Backend (.env.staging)
```
NODE_ENV=staging
DATABASE_URL=postgresql://user:pass@staging-db:5432/medmatch_staging
NEXTAUTH_URL=https://api-staging.medmatch.de
NEXTAUTH_SECRET=staging-secret-key-min-32-chars
CORS_ORIGINS=https://staging.medmatch.de,http://localhost:3000
```

## Staging Database
- Use separate PostgreSQL instance or schema
- Can use Railway staging environment or Supabase staging project
- Run migrations: `npx prisma migrate deploy`

## Testing Checklist

### Pre-Production Verification
- [ ] All pages load without errors
- [ ] Signup form submits successfully
- [ ] Email validation works
- [ ] Database records created
- [ ] API health check passes
- [ ] CORS configured correctly
- [ ] SSL certificates valid
- [ ] Mobile responsiveness verified
- [ ] Analytics tracking (if enabled for staging)

### Load Testing
```bash
# Install k6
# Test signup endpoint
k6 run --vus 10 --duration 30s load-test-signup.js
```

## Deployment Flow
1. Push to `develop` or `staging` branch
2. GitHub Actions deploys to staging
3. Run verification tests
4. Merge to `main` for production
