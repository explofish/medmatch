# CORS Configuration Guide

This guide covers Cross-Origin Resource Sharing (CORS) configuration for the MedMatch API, enabling frontend applications and third-party integrations to access the API from different domains.

## Table of Contents

- [What is CORS?](#what-is-cors)
- [Current CORS Configuration](#current-cors-configuration)
- [Production CORS Setup](#production-cors-setup)
- [Platform-Specific Configuration](#platform-specific-configuration)
- [Testing CORS Locally](#testing-cors-locally)
- [Common CORS Issues](#common-cors-issues)

## What is CORS?

CORS (Cross-Origin Resource Sharing) is a browser security feature that restricts web pages from making requests to a different domain than the one that served the page. For the MedMatch API to work with frontend applications, proper CORS configuration is essential.

## Current CORS Configuration

The MedMatch mock API server (`mock-api/server.js`) currently uses a permissive CORS configuration suitable for development:

```javascript
app.use(cors({
  origin: '*',  // Allow all origins (development only!)
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### ⚠️ Security Warning

The `origin: '*'` setting allows **any website** to access your API. This is acceptable for:
- Local development
- Public APIs with no sensitive data
- Testing and prototyping

**Never use `origin: '*'` in production** for APIs handling sensitive data or authenticated requests.

## Production CORS Setup

### Recommended Configuration

For production, whitelist specific origins:

```javascript
const allowedOrigins = [
  'https://medmatch.example.com',      // Production frontend
  'https://app.medmatch.example.com',  // Alternative domain
  'https://admin.medmatch.example.com' // Admin panel
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy does not allow access from this origin.';
      return callback(new Error(msg), false);
    }
    
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,  // Allow cookies/credentials
  maxAge: 86400       // Cache preflight for 24 hours
}));
```

### Environment-Based Configuration

Use environment variables for flexible CORS:

```javascript
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',') 
  : ['http://localhost:3000'];

app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: process.env.CORS_CREDENTIALS === 'true'
}));
```

**Environment variables:**
```bash
# .env file
CORS_ORIGINS=https://medmatch.example.com,https://app.medmatch.example.com
CORS_CREDENTIALS=true
```

## Platform-Specific Configuration

### Netlify

For Netlify-hosted frontends calling the API:

1. **Netlify `_headers` file** (in your frontend project):
```
/*
  Access-Control-Allow-Origin: https://your-api-domain.com
```

2. **Or in `netlify.toml`**:
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Access-Control-Allow-Origin = "https://your-api-domain.com"
```

### Vercel

In `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "https://your-api-domain.com" }
      ]
    }
  ]
}
```

### AWS API Gateway

```yaml
# Serverless Framework configuration
provider:
  name: aws
  cors:
    origin: 'https://medmatch.example.com'
    headers:
      - Content-Type
      - Authorization
    allowCredentials: true
```

### Cloudflare Workers

```javascript
export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://medmatch.example.com',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Handle actual request...
  }
};
```

### Nginx

```nginx
server {
    listen 80;
    server_name api.medmatch.example.com;
    
    location / {
        # CORS headers
        add_header 'Access-Control-Allow-Origin' 'https://medmatch.example.com' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PATCH, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
        
        # Handle preflight
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
        
        proxy_pass http://localhost:3000;
    }
}
```

### Apache

```apache
<VirtualHost *:80>
    ServerName api.medmatch.example.com
    
    # CORS headers
    Header always set Access-Control-Allow-Origin "https://medmatch.example.com"
    Header always set Access-Control-Allow-Methods "GET, POST, PATCH, DELETE, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
    
    # Handle preflight
    RewriteEngine On
    RewriteCond %{REQUEST_METHOD} OPTIONS
    RewriteRule ^(.*)$ $1 [R=204,L]
    
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
</VirtualHost>
```

## Testing CORS Locally

### Method 1: Browser Console

Open any website's console and run:

```javascript
// Test API from a different origin
fetch('http://localhost:3000/api/health')
  .then(r => r.json())
  .then(data => console.log('✅ CORS working:', data))
  .catch(err => console.error('❌ CORS error:', err));
```

### Method 2: Using curl

```bash
# Test preflight request
curl -i -X OPTIONS http://localhost:3000/api/health \
  -H "Origin: http://example.com" \
  -H "Access-Control-Request-Method: GET"

# Expected response headers:
# access-control-allow-origin: *
# access-control-allow-methods: GET, POST, PATCH, DELETE, OPTIONS

# Test actual request
curl -i http://localhost:3000/api/health \
  -H "Origin: http://example.com"
```

### Method 3: Using the Client Library

```javascript
import { MedMatchClient } from './medmatch-client.js';

const client = new MedMatchClient({
  baseUrl: 'http://localhost:3000'
});

// This will fail if CORS is not configured
client.health()
  .then(() => console.log('✅ CORS working!'))
  .catch(err => console.error('❌ CORS error:', err));
```

### Method 4: Browser DevTools

1. Open `examples/job-search.html` in a browser
2. Open DevTools → Network tab
3. Click "Search Jobs"
4. Check response headers for `access-control-allow-origin`

## Common CORS Issues

### Issue: "No 'Access-Control-Allow-Origin' header"

**Cause:** The API server isn't sending CORS headers.

**Solution:** 
```javascript
// Ensure cors middleware is before routes
const cors = require('cors');
app.use(cors());  // Must be before app.use(express.json()) and routes
app.use(express.json());
```

### Issue: "CORS policy: No 'Access-Control-Allow-Origin' header" with credentials

**Cause:** Using `credentials: true` with `origin: '*'`

**Solution:**
```javascript
// ❌ Wrong - can't use wildcard with credentials
app.use(cors({
  origin: '*',
  credentials: true  // This won't work!
}));

// ✅ Correct - specify exact origins
app.use(cors({
  origin: ['https://medmatch.example.com'],
  credentials: true
}));
```

### Issue: Preflight request fails (405 Method Not Allowed)

**Cause:** Server doesn't handle OPTIONS method.

**Solution:**
```javascript
// The cors middleware handles OPTIONS automatically
// But if using custom middleware:
app.options('*', cors());  // Enable preflight for all routes
```

### Issue: Headers not allowed

**Cause:** Custom headers not in `allowedHeaders`.

**Solution:**
```javascript
app.use(cors({
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header']
}));
```

## Security Best Practices

1. **Never use `origin: '*'`** in production for authenticated APIs
2. **Validate origins server-side** - Don't rely solely on CORS for security
3. **Use HTTPS** for production APIs
4. **Limit allowed methods** to only those your API supports
5. **Set `maxAge`** to cache preflight responses
6. **Review CORS headers** regularly as part of security audits

## Quick Reference

| Setting | Development | Production |
|---------|-------------|------------|
| `origin` | `'*'` | Specific domains only |
| `credentials` | `false` | `true` (if using cookies) |
| `methods` | All methods | Only needed methods |
| `allowedHeaders` | Minimal | Minimal |

---

**Related Files:**
- [medmatch-client.js](./medmatch-client.js) - JavaScript client with CORS support
- [INTEGRATION.md](./INTEGRATION.md) - Full integration guide
