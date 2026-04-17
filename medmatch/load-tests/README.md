# Load Testing Guide for MedMatch

## Prerequisites

Install k6:
```bash
# Mac
brew install k6

# Windows
choco install k6

# Linux
curl -s https://api.github.com/repos/grafana/k6/releases/latest | grep browser_download_url | grep linux-amd64 | cut -d '"' -f 4 | wget -qi - && tar -xzf k6-v*.tar.gz && sudo cp k6-v*/k6 /usr/local/bin/
```

## Test Scripts

### 1. Health Check Load Test
Tests basic API availability under load:

```bash
cd medmatch/load-tests
k6 run health-check.js
```

**What it tests:**
- Health endpoint response time
- API availability under concurrent users
- 10-20 concurrent users over 16 minutes

**Expected results:**
- 95% of requests under 500ms
- Error rate below 1%

### 2. Signup Stress Test
Tests user registration endpoint:

```bash
cd medmatch/load-tests
k6 run signup-stress.js
```

**What it tests:**
- Signup endpoint performance
- Database write capacity
- 5 concurrent users creating accounts

**Expected results:**
- 95% of requests under 1000ms
- 201 (created) or 409 (duplicate) status codes
- Error rate below 5%

### 3. Custom Load Test
Run with custom parameters:

```bash
k6 run --env BASE_URL=https://api.medmatch.de signup-stress.js
```

## Interpreting Results

### Metrics to Watch

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Response Time (p95) | < 500ms | 500-1000ms | > 1000ms |
| Error Rate | < 1% | 1-5% | > 5% |
| Throughput | Stable | Fluctuating | Dropping |

### Output Example

```
✓ health status is 200
✓ health response time < 200ms

checks.....................: 100.00% ✓ 1200 ✗ 0
http_req_duration..........: avg=45.12ms, min=23ms, med=38ms, max=156ms, p(95)=89ms
http_req_failed............: 0.00% ✓ 0 ✗ 1200
iterations.................: 1200
```

## Pre-Production Load Testing

Before production deployment:

1. **Baseline Test** (health-check.js)
   - Verify API handles normal traffic
   - Establish performance baseline

2. **Stress Test** (signup-stress.js)
   - Verify database handles writes
   - Check for race conditions

3. **Spike Test** (custom script)
   - Simulate viral traffic spike
   - Verify auto-scaling works

## Post-Production Monitoring

After deployment, run weekly:
```bash
k6 run --out json=results.json health-check.js
```

Track trends over time to detect performance degradation.

## Troubleshooting

### High Error Rates
- Check database connection pool
- Verify API rate limiting isn't too aggressive
- Check Render/Vercel logs

### High Response Times
- Check database query performance
- Verify Prisma connection pooling
- Consider upgrading Render plan

### Rate Limiting (429 errors)
- Normal during load tests
- Adjust test sleep timings
- Or temporarily increase rate limits

---

**Note:** Run load tests against staging first, then production with caution.
