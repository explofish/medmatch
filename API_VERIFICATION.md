# API Deployment Verification Guide

Quick verification steps to confirm the MedMatch API is deployed and working correctly.

## Health Check Endpoint

Test the API is responding:

```bash
curl https://YOUR_API_URL/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Signup Flow Test

### 1. Test Signup Endpoint

```bash
curl -X POST https://YOUR_API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "yearOfGraduation": "2024",
    "specialization": "Cardiology",
    "state": "Bayern"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Successfully joined the waitlist!",
  "data": {
    "id": "1234567890",
    "email": "test@example.com",
    "firstName": "Test"
  }
}
```

### 2. Verify Signup Storage

```bash
curl https://YOUR_API_URL/api/signups
```

**Expected Response:**
```json
{
  "count": 1,
  "signups": [
    {
      "id": "1234567890",
      "email": "test@example.com",
      "firstName": "Test",
      "lastName": "User",
      ...
    }
  ]
}
```

## Frontend Integration Test

### Update Frontend Config

Edit the landing page JavaScript to point to new API:

```javascript
// In index.html or landing page JS
const API_BASE_URL = 'https://YOUR_API_URL';  // Update this
```

### Test from Browser Console

1. Open https://explofish.github.io/medmatch/
2. Open browser console (F12)
3. Test CORS:

```javascript
fetch('https://YOUR_API_URL/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

**Expected:** `{status: "ok", timestamp: "..."}`

### Test Full Signup Flow

1. Fill out the signup form on the landing page
2. Submit
3. Check for success message
4. Verify in API admin endpoint: `GET /api/signups`

## CORS Configuration Verification

The API must accept requests from:
- `https://explofish.github.io`
- `https://explofish.github.io/medmatch/`

Test CORS preflight:

```bash
curl -X OPTIONS https://YOUR_API_URL/api/auth/register \
  -H "Origin: https://explofish.github.io" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

**Expected:** 200 OK with CORS headers

## Troubleshooting

### CORS Errors
If browser shows CORS errors:
1. Verify API CORS config includes `https://explofish.github.io`
2. Check preflight OPTIONS request returns 200
3. Ensure `Access-Control-Allow-Origin` header is present

### 404 Not Found
If endpoints return 404:
1. Verify API is running (health check works)
2. Check URL path matches `/api/...`
3. Confirm routes are registered in server.js

### Signup Not Working
If signup form fails:
1. Check browser console for errors
2. Verify network request to `/api/auth/register`
3. Check response status code and body
4. Test with curl to isolate frontend vs backend issue

## Post-Deployment Checklist

- [ ] Health check returns 200 OK
- [ ] Signup endpoint accepts POST requests
- [ ] CORS headers present on all responses
- [ ] Frontend successfully connects to API
- [ ] Signup form works end-to-end
- [ ] Admin can view signups at `/api/signups`
- [ ] Landing page signup flow tested in browser

## Platform-Specific URLs

After deployment, update these:

| Platform | Expected URL Format |
|----------|-------------------|
| Glitch | `https://xxxx.glitch.me` |
| Vercel | `https://medmatch-api.vercel.app` |
| Cloudflare | `https://medmatch-api.your-account.workers.dev` |
| Render | `https://medmatch-api.onrender.com` |
| Fly.io | `https://medmatch-api.fly.dev` |

## Rollback Plan

If deployment fails:
1. Keep previous API URL in frontend config
2. Update DNS/frontend to point to working URL
3. Debug failed deployment separately
