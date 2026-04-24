# MedMatch API Documentation

Interactive API documentation for the MedMatch job matching platform.

## Quick Start

### View Online
Visit the interactive documentation at:  
**https://explofish.github.io/medmatch/api-docs/**

### Run Locally
```bash
# Clone the repository
git clone https://github.com/explofish/medmatch.git
cd medmatch/api-docs

# Serve with any static file server
npx serve .

# Or with Python
python3 -m http.server 8080
```

Then open http://localhost:8080

## What's Included

| Resource | Description | Link |
|----------|-------------|------|
| **Interactive Docs** | Swagger UI documentation | [View](/medmatch/api-docs/) |
| **OpenAPI Spec** | Complete API specification (YAML) | [Download](openapi.yaml) |
| **Postman Collection** | Ready-to-import Postman collection | [Download](postman-collection.json) |
| **Developer Guide** | Detailed API usage guide | [View](../mock-api/API_DOCUMENTATION.md) |

## API Base URLs

| Environment | URL |
|-------------|-----|
| Local | `http://localhost:3000` |
| Staging | `https://api-staging.medmatch.de` |
| Production | `https://api.medmatch.de` |

## Authentication

The API currently operates in development mode without authentication. Production deployment will use JWT-based authentication.

## Main Endpoints

### Health
- `GET /api/health` - Health check

### Authentication
- `POST /api/auth/register` - Register new candidate

### Candidates
- `GET /api/candidates` - List candidates
- `GET /api/candidates/:id` - Get candidate by ID
- `POST /api/candidates` - Create candidate
- `PATCH /api/candidates/:id` - Update candidate
- `DELETE /api/candidates/:id` - Soft delete candidate

### Employers
- `GET /api/employers` - List employers
- `GET /api/employers/:id` - Get employer with jobs
- `POST /api/employers` - Create employer
- `PATCH /api/employers/:id` - Update employer

### Jobs
- `GET /api/jobs` - List jobs with filters
- `GET /api/jobs/:id` - Get job by ID
- `POST /api/jobs` - Create job
- `PATCH /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Soft delete job

### Matching
- `GET /api/matches?candidateId=xxx` - Get ranked job matches

## Features

- ✅ Interactive API explorer (try endpoints directly)
- ✅ Request/response examples
- ✅ Schema definitions
- ✅ Error handling documentation
- ✅ Downloadable OpenAPI spec
- ✅ Postman collection

## Development

The documentation is built with [Swagger UI](https://swagger.io/tools/swagger-ui/) and served as static HTML. It's automatically deployed to GitHub Pages.

## License

MIT License - see main repository for details.
