# Plan: Code Quality & Technical Debt Resolution

## Overview
This plan addresses the findings from the comprehensive code quality review of the MedMatch codebase.

## Phase 1: Critical Security Fixes (Immediate)

### 1.1 CORS Configuration (BER-242)
**Status:** Ready to implement  
**Effort:** 1 hour  
**File:** mock-api/server.js, deploy/api/server.js

Changes needed:
- Make CORS origins configurable via `ALLOWED_ORIGINS` environment variable
- Default to restricted origins in production
- Allow wildcard only in development

### 1.2 Authentication Middleware (BER-243)
**Status:** Ready to implement  
**Effort:** 2-3 hours  
**File:** New: middleware/auth.js, Update: server.js

Changes needed:
- Create API key-based authentication middleware
- Protect admin endpoints (GET /api/signups, GET /api/signups/count)
- Add AUTH_API_KEY environment variable support

## Phase 2: Performance Fixes (High Priority)

### 2.1 N+1 Query Fix (BER-244)
**Status:** Ready to implement  
**Effort:** 1 hour  
**File:** mock-api/server.js:1028-1073

Changes needed:
- Combine employer and jobs queries using JOIN
- Maintain existing response format

### 2.2 Seed Data Race Condition (BER-245)
**Status:** Ready to implement  
**Effort:** 1 hour  
**File:** mock-api/server.js:1824-1926

Changes needed:
- Replace setTimeout with proper async/await
- Use Promise-based approach for sequential inserts

## Phase 3: Code Organization (Medium Priority)

### 3.1 Modularize Routes
**Status:** Backlog  
**Effort:** 4-6 hours  

Split server.js into:
- routes/candidates.js
- routes/employers.js
- routes/jobs.js
- routes/matches.js
- routes/auth.js
- middleware/pagination.js (shared)
- middleware/validation.js (shared)

### 3.2 Extract Shared Utilities
**Status:** Backlog  
**Effort:** 2-3 hours

- Create utils/pagination.js
- Create utils/validation.js
- Create utils/errors.js (standardized error responses)

## Phase 4: Non-Critical Improvements (Backlog)

### 4.1 Code Style Consistency
- Add ESLint rules for quote consistency
- Add JSDoc requirements for all endpoints
- Standardize error message formatting

### 4.2 Testing Improvements
- Add integration tests for middleware
- Add load tests for rate limiting
- Add security-focused tests

### 4.3 Documentation
- API documentation for webhook utilities
- Architecture decision records (ADRs)
- Deployment guide updates

## Timeline

| Phase | Issues | Estimated Time | Priority |
|-------|--------|----------------|----------|
| 1 | BER-242, BER-243 | 3-4 hours | Critical |
| 2 | BER-244, BER-245 | 2 hours | High |
| 3 | Modularization | 4-6 hours | Medium |
| 4 | Improvements | Ongoing | Low |

## Dependencies
- Phase 1 can be done in parallel
- Phase 2 depends on Phase 1 test environment
- Phase 3 depends on Phase 2 completion

## Risk Mitigation
- All changes include test updates
- Database migrations not required (no schema changes)
- Backward compatibility maintained for API responses
