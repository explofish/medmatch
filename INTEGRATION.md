# MedMatch Integration Guide

A comprehensive guide for integrating with the MedMatch job platform API.

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Authentication](#authentication)
- [Using the API Client](#using-the-api-client)
- [Common Operations](#common-operations)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Webhooks](#webhooks)
- [Frontend Integration](#frontend-integration)
- [Testing](#testing)
- [Common Pitfalls](#common-pitfalls)
- [Support](#support)

## Quick Start

### 1. Start the API Server

```bash
cd mock-api
npm install
npm start
```

The API will be available at `http://localhost:3000`

### 2. Include the Client Library

```html
<script type="module">
  import { MedMatchClient } from './medmatch-client.js';
  
  const client = new MedMatchClient({
    baseUrl: 'http://localhost:3000'
  });
  
  // Start making API calls
  const jobs = await client.listJobs();
  console.log(jobs);
</script>
```

### 3. Try the Examples

Open these files in your browser (with the API running):
- `examples/job-search.html` - Job search with filters
- `examples/application-form.html` - Candidate registration form
- `examples/employer-dashboard.html` - Employer management dashboard

## Installation

### Option 1: Direct Import (ES Modules)

```javascript
import { MedMatchClient } from './medmatch-client.js';
```

### Option 2: CDN (when deployed)

```html
<script type="module">
  import { MedMatchClient } from 'https://your-cdn.com/medmatch-client.js';
</script>
```

### Option 3: npm (future)

```bash
npm install @medmatch/client
```

## Authentication

Currently, the MedMatch mock API operates without authentication for local development. For production, you would implement:

### Bearer Token Authentication

```javascript
const client = new MedMatchClient({
  baseUrl: 'https://api.medmatch.example.com',
  headers: {
    'Authorization': 'Bearer YOUR_API_TOKEN'
  }
});
```

### API Key Authentication

```javascript
const client = new MedMatchClient({
  baseUrl: 'https://api.medmatch.example.com',
  headers: {
    'X-API-Key': 'your-api-key-here'
  }
});
```

## Using the API Client

### Initialization Options

```javascript
const client = new MedMatchClient({
  baseUrl: 'http://localhost:3000',  // API endpoint
  timeout: 10000,                     // Request timeout (ms)
  retries: 3,                        // Retry attempts on failure
  retryDelay: 1000,                  // Initial retry delay (ms)
  retryBackoff: 2,                   // Exponential backoff multiplier
  headers: {                         // Additional headers
    'X-Custom-Header': 'value'
  }
});
```

### Making API Calls

All methods return a Promise that resolves to:

```javascript
{
  success: true,
  data: { /* response body */ },
  status: 200,
  headers: /* Response Headers */
}
```

## Common Operations

### Health Check

```javascript
try {
  const response = await client.health();
  console.log('API is up:', response.data);
} catch (error) {
  console.error('API is down:', error.message);
}
```

### List Jobs with Filters

```javascript
const jobs = await client.listJobs({
  specialty: 'Kardiologie',
  location: 'Berlin',
  jobType: 'full-time',
  minSalary: 60000,
  maxSalary: 90000,
  page: 1,
  limit: 20,
  sortBy: 'postedAt',
  sortOrder: 'desc'
});

console.log(`Found ${jobs.data.pagination.total} jobs`);
jobs.data.data.forEach(job => {
  console.log(`${job.title} at ${job.employerName}`);
});
```

### Create a Candidate

```javascript
try {
  const candidate = await client.createCandidate({
    email: 'max.mustermann@example.com',
    firstName: 'Max',
    lastName: 'Mustermann',
    location: 'Berlin',
    specialty: 'Kardiologie',
    experienceYears: 5,
    preferences: {
      minSalary: 70000,
      willingToRelocate: 'maybe'
    }
  });
  
  console.log('Created candidate:', candidate.data.data.id);
} catch (error) {
  if (error.status === 409) {
    console.error('Email already exists');
  } else {
    console.error('Error:', error.message);
  }
}
```

### Get Job Matches for a Candidate

```javascript
const matches = await client.getMatches(candidateId, {
  minScore: 70,  // Only matches above 70%
  limit: 10
});

matches.data.matches.forEach(match => {
  console.log(`${match.job.title}: ${match.matchScore}% match`);
  console.log('Reasons:', match.matchReasons.join(', '));
});
```

### Update a Job

```javascript
const updated = await client.updateJob(jobId, {
  title: 'Senior Cardiologist',
  salaryMax: 95000,
  status: 'active'
});

console.log('Updated:', updated.data.data);
```

### Pagination Pattern

```javascript
async function getAllJobs() {
  const allJobs = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const response = await client.listJobs({ page, limit: 50 });
    const { data, pagination } = response.data;
    
    allJobs.push(...data);
    hasMore = pagination.hasNextPage;
    page++;
    
    // Rate limiting - be nice to the API
    if (hasMore) await new Promise(r => setTimeout(r, 100));
  }
  
  return allJobs;
}
```

## Error Handling

### Error Types

```javascript
import { MedMatchClient, MedMatchAPIError } from './medmatch-client.js';

try {
  await client.getJob(999999);
} catch (error) {
  if (error instanceof MedMatchAPIError) {
    console.log('Status:', error.status);
    console.log('Message:', error.message);
    console.log('Data:', error.data);
    
    if (error.isClientError()) {
      // 4xx errors - usually your fault
      if (error.status === 404) {
        console.log('Job not found');
      } else if (error.status === 400) {
        console.log('Validation failed:', error.data.errors);
      }
    } else if (error.isServerError()) {
      // 5xx errors - server problem
      console.log('Server error, retry later');
    }
  } else if (error.name === 'AbortError') {
    console.log('Request timed out');
  } else {
    console.log('Network or other error:', error.message);
  }
}
```

### Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK | Success |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Check request parameters |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate or conflicting data |
| 429 | Too Many Requests | Slow down, retry with backoff |
| 500 | Server Error | Report to admin, retry later |

## Rate Limiting

The client implements automatic retry with exponential backoff:

```javascript
const client = new MedMatchClient({
  retries: 3,        // Retry 3 times
  retryDelay: 1000,  // Start with 1 second
  retryBackoff: 2    // Double each time: 1s, 2s, 4s
});
```

### Manual Rate Limiting

```javascript
class RateLimitedClient {
  constructor(client, maxRequestsPerSecond = 10) {
    this.client = client;
    this.interval = 1000 / maxRequestsPerSecond;
    this.lastRequest = 0;
  }
  
  async throttledRequest(method, ...args) {
    const now = Date.now();
    const wait = this.lastRequest + this.interval - now;
    
    if (wait > 0) {
      await new Promise(r => setTimeout(r, wait));
    }
    
    this.lastRequest = Date.now();
    return this.client[method](...args);
  }
}
```

## Webhooks

### Receiving Webhooks

Set up an endpoint to receive real-time updates:

```javascript
const express = require('express');
const { createWebhookHandler, WebhookParser } = require('./webhook-utils.js');

const app = express();
const handler = createWebhookHandler({ secret: 'your-webhook-secret' });

app.post('/webhooks/medmatch', express.raw({ type: 'application/json' }), handler.handle);

// Or manually:
app.post('/webhooks/medmatch', (req, res) => {
  try {
    const event = WebhookParser.parse(req.body);
    
    switch (event.event) {
      case 'candidate.created':
        // Handle new candidate
        break;
      case 'job.created':
        // Handle new job
        break;
      case 'application.received':
        // Handle new application
        break;
    }
    
    res.json({ received: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

### Verifying Webhook Signatures

```javascript
const { WebhookVerifier } = require('./webhook-utils.js');

const verifier = new WebhookVerifier('your-webhook-secret');

// In your webhook handler
const signature = req.headers['x-medmatch-signature'];
const payload = req.body;

if (!verifier.verify(payload, signature)) {
  return res.status(401).send('Invalid signature');
}
```

### Supported Events

See `webhook-utils.js` for all event types:

- `candidate.created`, `candidate.updated`, `candidate.deleted`
- `job.created`, `job.updated`, `job.deleted`, `job.expired`
- `application.received`, `application.status_changed`
- `match.created`
- `employer.created`, `employer.updated`
- `signup.created`

## Frontend Integration

### Vanilla JavaScript

```html
<script type="module">
  import { MedMatchClient } from './medmatch-client.js';
  
  const client = new MedMatchClient();
  
  // Load jobs on page load
  async function loadJobs() {
    const container = document.getElementById('jobs');
    
    try {
      const response = await client.listJobs({ limit: 10 });
      const jobs = response.data.data;
      
      container.innerHTML = jobs.map(job => `
        <div class="job-card">
          <h3>${job.title}</h3>
          <p>${job.employerName} - ${job.location}</p>
        </div>
      `).join('');
    } catch (error) {
      container.innerHTML = `<p class="error">Error loading jobs: ${error.message}</p>`;
    }
  }
  
  loadJobs();
</script>
```

### React Hook Example

```javascript
import { useState, useEffect } from 'react';
import { MedMatchClient } from './medmatch-client.js';

const client = new MedMatchClient();

function useJobs(filters = {}) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchJobs() {
      try {
        setLoading(true);
        const response = await client.listJobs(filters);
        setJobs(response.data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchJobs();
  }, [JSON.stringify(filters)]);
  
  return { jobs, loading, error };
}

// Usage
function JobList() {
  const { jobs, loading, error } = useJobs({ specialty: 'Kardiologie' });
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <ul>
      {jobs.map(job => <li key={job.id}>{job.title}</li>)}
    </ul>
  );
}
```

### CORS Considerations

When deploying, ensure your API has proper CORS headers. See [CORS.md](./CORS.md) for platform-specific configurations.

## Testing

### Unit Testing with Jest

```javascript
// __tests__/medmatch-client.test.js
import { MedMatchClient } from '../medmatch-client.js';

describe('MedMatchClient', () => {
  let client;
  
  beforeEach(() => {
    client = new MedMatchClient({
      baseUrl: 'http://localhost:3000'
    });
  });
  
  test('health check returns ok', async () => {
    const response = await client.health();
    expect(response.data.status).toBe('ok');
  });
  
  test('creates a candidate', async () => {
    const candidate = {
      email: `test-${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      specialty: 'Kardiologie',
      experienceYears: 5
    };
    
    const response = await client.createCandidate(candidate);
    expect(response.data.data).toHaveProperty('id');
  });
});
```

### Integration Testing

```bash
# Start API server
cd mock-api && npm start

# Run tests
npm test

# Or manually test with curl
curl http://localhost:3000/api/health
curl http://localhost:3000/api/jobs
curl -X POST http://localhost:3000/api/candidates \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","firstName":"Test","lastName":"User"}'
```

## Common Pitfalls

### 1. Forgetting to Handle Async Errors

```javascript
// ❌ Wrong - unhandled rejection
const jobs = await client.listJobs(); // May throw

// ✅ Correct - always wrap in try/catch
try {
  const jobs = await client.listJobs();
} catch (error) {
  console.error('Failed to load jobs:', error);
}
```

### 2. Not Checking Pagination

```javascript
// ❌ Wrong - only gets first page
const jobs = await client.listJobs();
const allJobs = jobs.data.data; // Only 20 jobs!

// ✅ Correct - iterate through pages
const allJobs = [];
let page = 1;
while (true) {
  const response = await client.listJobs({ page });
  allJobs.push(...response.data.data);
  if (!response.data.pagination.hasNextPage) break;
  page++;
}
```

### 3. Ignoring Rate Limits

```javascript
// ❌ Wrong - hammering the API
const ids = [1, 2, 3, 4, 5];
const jobs = await Promise.all(ids.map(id => client.getJob(id)));

// ✅ Correct - sequential with delays
const jobs = [];
for (const id of ids) {
  const job = await client.getJob(id);
  jobs.push(job);
  await new Promise(r => setTimeout(r, 100)); // Be nice
}
```

### 4. Not Validating Input

```javascript
// ❌ Wrong - sending invalid data
await client.createCandidate({ email: 'invalid' });

// ✅ Correct - validate before sending
function validateCandidate(data) {
  if (!data.email?.includes('@')) throw new Error('Invalid email');
  if (!data.firstName) throw new Error('First name required');
  return true;
}
```

### 5. Hardcoding API URLs

```javascript
// ❌ Wrong - won't work in production
const client = new MedMatchClient({
  baseUrl: 'http://localhost:3000'
});

// ✅ Correct - use environment variables
const client = new MedMatchClient({
  baseUrl: process.env.API_URL || 'http://localhost:3000'
});
```

## Support

### Debug Mode

Enable detailed logging:

```javascript
const client = new MedMatchClient({
  baseUrl: 'http://localhost:3000'
});

// Add logging interceptor
const originalRequest = client._request.bind(client);
client._request = async function(...args) {
  console.log('API Request:', args[0]);
  const result = await originalRequest(...args);
  console.log('API Response:', result.status);
  return result;
};
```

### Getting Help

1. Check the [API documentation](./api-docs/openapi.yaml)
2. Review example implementations in `examples/`
3. Test with the mock API server
4. Check CORS.md for deployment issues

### API Versioning

The current API version is v1. The client library handles versioning automatically. When a new version is released:

```javascript
// Specify version explicitly (future feature)
const client = new MedMatchClient({
  baseUrl: 'http://localhost:3000',
  apiVersion: 'v2'
});
```

---

**Related Files:**
- [medmatch-client.js](./medmatch-client.js) - JavaScript client library
- [CORS.md](./CORS.md) - CORS configuration guide
- [webhook-utils.js](./webhook-utils.js) - Webhook utilities
- [examples/](./examples/) - Integration examples
