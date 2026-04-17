# MedMatch API Documentation

## Base URL

### Staging
```
https://medmatch-api-staging.onrender.com
```

### Production
```
https://api.medmatch.de
```

---

## Authentication

Currently, the API uses simple session-based authentication. Future versions will implement JWT tokens.

---

## Endpoints

### Health Check

Check API and database status.

```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "medmatch-api",
  "database": "connected",
  "timestamp": "2026-04-17T12:00:00.000Z"
}
```

**Error Response:**
```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Connection failed"
}
```

**Status Codes:**
- `200` - API and database healthy
- `503` - Database connection issue

---

### User Registration

Register a new user (medical graduate or employer).

```http
POST /api/auth/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "Max",
  "lastName": "Mustermann",
  "userType": "graduate"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Valid email address |
| password | string | Yes | Minimum 6 characters |
| firstName | string | No | User's first name |
| lastName | string | No | User's last name |
| userType | string | No | `"graduate"` or `"employer"` (default: `"graduate"`) |

**Success Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "cl1234567890abc",
    "email": "user@example.com",
    "role": "GRADUATE"
  }
}
```

**Error Responses:**

**400 - Bad Request (missing fields):**
```json
{
  "error": "Email and password are required"
}
```

**400 - Bad Request (password too short):**
```json
{
  "error": "Password must be at least 6 characters"
}
```

**409 - Conflict (email exists):**
```json
{
  "error": "Email already registered"
}
```

**500 - Server Error:**
```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Limit:** 10 requests per minute per IP
- **Headers:**
  - `X-RateLimit-Limit: 10`
  - `X-RateLimit-Remaining: 9`
  - `X-RateLimit-Reset: 1234567890`

**429 Response (Rate Limit Exceeded):**
```json
{
  "error": "Rate limit exceeded. Please try again later."
}
```

---

## CORS

Cross-Origin Resource Sharing is configured for:
- `https://medmatch.de`
- `https://www.medmatch.de`
- `https://medmatch-demo.vercel.app` (staging)

**Preflight Request:**
```http
OPTIONS /api/auth/register
Origin: https://medmatch.de
```

**Response:**
```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://medmatch.de
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## Security Headers

All API responses include security headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

---

## Testing with cURL

### Health Check
```bash
curl https://medmatch-api-staging.onrender.com/api/health
```

### Register User
```bash
curl -X POST https://medmatch-api-staging.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

---

## Error Handling

All errors follow this format:
```json
{
  "error": "Human-readable error message"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (client error)
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## Frontend Integration

### Example: React Signup Form

```typescript
async function registerUser(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  const response = await fetch(
    'https://medmatch-api-staging.onrender.com/api/auth/register',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return await response.json();
}
```

---

## Post-Deployment Verification

After deployment, verify these endpoints:

1. **Health Check**
   ```bash
   curl https://api.medmatch.de/api/health
   # Should return: {"status": "healthy", ...}
   ```

2. **Registration Flow**
   ```bash
   curl -X POST https://api.medmatch.de/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@medmatch.de","password":"Test123","firstName":"Test","lastName":"User"}'
   # Should return: 201 Created
   ```

3. **Duplicate Check**
   ```bash
   # Run same request again
   # Should return: 409 Conflict
   ```

---

## Support

For API issues:
- Check [STATUS.md](./STATUS.md) for current deployment status
- Review [SECURITY.md](./SECURITY.md) for security policies
- Report bugs to CTO agent

---

**Version:** 1.0  
**Last Updated:** 2026-04-17
