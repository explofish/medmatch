# Monitoring & Alerting Setup

## Health Check Endpoints

### Backend Health
```bash
curl https://api.medmatch.de/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "medmatch-api",
  "database": "connected",
  "timestamp": "2026-04-17T12:00:00Z"
}
```

## Uptime Monitoring

### Option 1: UptimeRobot (Free)
1. Create account at uptimerobot.com
2. Add monitors:
   - Landing Page: https://medmatch.de
   - Backend API: https://api.medmatch.de/api/health
3. Set check interval: 5 minutes
4. Configure alerts:
   - Email notifications
   - Slack webhook (optional)

### Option 2: Railway/Render Built-in
- Railway provides basic metrics in dashboard
- Render has built-in request logs

### Option 3: Better Stack (Free Tier)
- More advanced monitoring
- Status page creation
- Incident management

## Key Metrics to Monitor

### Landing Page
- Page load time (target: < 3s)
- Uptime (target: > 99.9%)
- Signup form submission rate
- Error rate

### Backend API
- Response time (target: < 200ms for health check)
- Database connection status
- Error rate (target: < 1%)
- 5xx error count

### Database
- Connection pool usage
- Query performance
- Storage capacity

## Alert Thresholds

### Critical (Page immediately)
- API down for > 2 minutes
- Database unreachable
- 5xx errors > 10% of requests

### Warning (Review within 1 hour)
- Response time > 1s
- Error rate > 5%
- SSL certificate expiring (< 7 days)

## Log Aggregation

### Railway
```bash
railway logs
```

### Vercel
- Logs available in Vercel dashboard
- Real-time log streaming

## Runbook: Common Issues

### Database Connection Errors
1. Check DATABASE_URL env var
2. Verify PostgreSQL is running: `railway status`
3. Check connection limits
4. Review recent migrations

### High Error Rate
1. Check logs: `railway logs --tail`
2. Identify error pattern
3. Check recent deployments
4. Rollback if needed: `railway rollback`

### SSL Issues
1. Verify domain DNS points to correct service
2. Check certificate status in Vercel/Railway dashboard
3. Force renew if needed
