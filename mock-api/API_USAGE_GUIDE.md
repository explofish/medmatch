# MedMatch API Usage Guide for Frontend Developers

A practical guide for integrating with the MedMatch API from frontend applications.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Common Patterns](#common-patterns)
4. [Candidate Workflows](#candidate-workflows)
5. [Employer Workflows](#employer-workflows)
6. [Error Handling](#error-handling)
7. [Code Examples](#code-examples)
8. [Best Practices](#best-practices)

---

## Getting Started

### Base URL

```javascript
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.medmatch.de'
  : 'http://localhost:3000';
```

### Making Requests

All API requests should include:
- `Content-Type: application/json` for POST/PATCH requests
- Proper error handling
- Request timeouts

```javascript
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };
  
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }
  
  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}
```

---

## Authentication

### Current State (Development)

⚠️ **Note:** The API currently operates without authentication for local development.

### Future Implementation (Production)

```javascript
// Store token after login
localStorage.setItem('medmatch_token', response.data.token);

// Include in all requests
const config = {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('medmatch_token')}`
  }
};
```

---

## Common Patterns

### Pagination

All list endpoints return paginated results:

```javascript
// Response structure
{
  data: [...],           // Array of items
  pagination: {
    page: 1,             // Current page
    limit: 20,           // Items per page
    total: 150,          // Total items
    totalPages: 8,       // Total pages
    hasNextPage: true,   // Has next page?
    hasPrevPage: false   // Has previous page?
  }
}
```

### Pagination Example

```javascript
// Load first page
async function loadCandidates(page = 1, filters = {}) {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: '20',
    ...filters
  });
  
  const response = await apiRequest(`/api/candidates?${queryParams}`);
  
  return {
    candidates: response.data,
    hasMore: response.pagination.hasNextPage,
    totalPages: response.pagination.totalPages
  };
}

// Load next page (infinite scroll)
async function loadMoreCandidates(currentPage) {
  return await loadCandidates(currentPage + 1);
}
```

### Filtering

```javascript
// Filter candidates by location and specialty
const filters = {
  location: 'Berlin',
  specialty: 'Kardiologie',
  minExperience: '2',
  maxExperience: '10'
};

const response = await loadCandidates(1, filters);
```

### Sorting

```javascript
// Sort by experience, descending
const queryParams = new URLSearchParams({
  sortBy: 'experienceYears',
  sortOrder: 'desc'
});

const response = await apiRequest(`/api/candidates?${queryParams}`);
```

---

## Candidate Workflows

### 1. Registration Flow

```javascript
// Step 1: Register on waitlist
async function registerCandidate(formData) {
  const response = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: {
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      yearOfGraduation: formData.yearOfGraduation,
      specialization: formData.specialization,
      state: formData.state
    }
  });
  
  return response.data;
}

// Usage
const form = document.getElementById('signup-form');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const result = await registerCandidate({
      email: form.email.value,
      firstName: form.firstName.value,
      lastName: form.lastName.value,
      yearOfGraduation: form.graduation.value,
      specialization: form.specialization.value,
      state: form.state.value
    });
    
    // Success - show confirmation
    showSuccess(`Welcome, ${result.firstName}! You've been added to the waitlist.`);
  } catch (err) {
    // Handle duplicate email
    if (err.message.includes('already registered')) {
      showError('This email is already on the waitlist.');
    } else {
      showError('Registration failed. Please try again.');
    }
  }
});
```

### 2. Create Complete Profile

```javascript
async function createCandidateProfile(profileData) {
  const response = await apiRequest('/api/candidates', {
    method: 'POST',
    body: {
      email: profileData.email,
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      location: profileData.location,
      specialty: profileData.specialty,
      experienceYears: parseInt(profileData.experience, 10),
      cvUrl: profileData.cvUrl,
      preferences: {
        jobType: profileData.preferredJobType,    // 'full-time' | 'part-time'
        minSalary: parseInt(profileData.minSalary, 10),
        willingToRelocate: profileData.willingToRelocate
      }
    }
  });
  
  return response.data;
}
```

### 3. Update Profile

```javascript
async function updateCandidate(candidateId, updates) {
  const response = await apiRequest(`/api/candidates/${candidateId}`, {
    method: 'PATCH',
    body: updates  // Partial update - only send changed fields
  });
  
  return response.data;
}

// Usage examples
await updateCandidate(123, { location: 'Munich' });
await updateCandidate(123, { 
  experienceYears: 6,
  preferences: { jobType: 'part-time', minSalary: 90000 }
});
```

### 4. Find Job Matches

```javascript
async function getJobMatches(candidateId, options = {}) {
  const queryParams = new URLSearchParams({
    candidateId: candidateId.toString(),
    minScore: (options.minScore || 50).toString(),
    limit: (options.limit || 10).toString()
  });
  
  const response = await apiRequest(`/api/matches?${queryParams}`);
  
  return {
    candidate: response.candidate,
    matches: response.matches,
    total: response.totalMatches
  };
}

// Display matches
function displayMatches(matches) {
  return matches.map(match => `
    <div class="job-card" data-score="${match.matchScore}">
      <div class="match-score">${match.matchScore}% Match</div>
      <h3>${match.job.title}</h3>
      <p class="employer">${match.job.employerName}</p>
      <p class="location">📍 ${match.job.location}</p>
      <p class="salary">💰 €${match.job.salaryMin?.toLocaleString()} - €${match.job.salaryMax?.toLocaleString()}</p>
      
      <div class="match-reasons">
        ${match.matchReasons.map(reason => `
          <span class="reason-tag">${reason}</span>
        `).join('')}
      </div>
      
      <button onclick="applyToJob(${match.job.id})">Apply Now</button>
    </div>
  `).join('');
}
```

---

## Employer Workflows

### 1. Create Employer Profile

```javascript
async function createEmployer(employerData) {
  const response = await apiRequest('/api/employers', {
    method: 'POST',
    body: {
      name: employerData.name,
      description: employerData.description,
      location: employerData.location,
      website: employerData.website,
      hospitalType: employerData.hospitalType,  // 'University Hospital' | 'City Hospital' | 'Clinic'
      size: employerData.size                     // 'Small' | 'Medium' | 'Large'
    }
  });
  
  return response.data;
}
```

### 2. Post a Job

```javascript
async function createJob(employerId, jobData) {
  const response = await apiRequest('/api/jobs', {
    method: 'POST',
    body: {
      employerId: employerId,
      title: jobData.title,
      specialty: jobData.specialty,
      location: jobData.location,
      description: jobData.description,
      requirements: jobData.requirements,
      salaryMin: parseInt(jobData.salaryMin, 10),
      salaryMax: parseInt(jobData.salaryMax, 10),
      jobType: jobData.jobType,              // 'full-time' | 'part-time' | 'contract'
      experienceRequired: parseInt(jobData.experienceRequired, 10),
      expiresAt: jobData.expiresAt           // ISO 8601 format
    }
  });
  
  return response.data;
}
```

### 3. View Employer with Jobs

```javascript
async function getEmployerProfile(employerId) {
  const response = await apiRequest(`/api/employers/${employerId}`);
  
  return {
    ...response.data,
    activeJobs: response.data.jobs.filter(job => job.status === 'active')
  };
}
```

---

## Error Handling

### Common Error Codes

| Status | Meaning | Handling |
|--------|---------|----------|
| 200 | Success | Process normally |
| 201 | Created | Show success message |
| 400 | Bad Request | Show validation errors |
| 404 | Not Found | Show "not found" message |
| 409 | Conflict | Handle duplicate (e.g., email exists) |
| 500 | Server Error | Show generic error, retry later |

### Error Handler Utility

```javascript
class APIError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function handleAPIError(response) {
  let errorData = {};
  try {
    errorData = await response.json();
  } catch (e) {
    // Not JSON response
  }
  
  switch (response.status) {
    case 400:
      if (errorData.errors) {
        // Validation errors - show field-specific messages
        throw new APIError(400, 'Validation failed', errorData.errors);
      }
      throw new APIError(400, errorData.error || 'Invalid request');
      
    case 404:
      throw new APIError(404, 'Resource not found');
      
    case 409:
      throw new APIError(409, errorData.error || 'Conflict', errorData.message);
      
    case 500:
      throw new APIError(500, 'Server error. Please try again later.');
      
    default:
      throw new APIError(response.status, 'An error occurred');
  }
}

// Form validation display
function displayValidationErrors(errors, formElement) {
  // Clear previous errors
  formElement.querySelectorAll('.error-message').forEach(el => el.remove());
  
  errors.forEach(error => {
    // Extract field name from error message
    const fieldMatch = error.match(/^([a-zA-Z]+)/);
    const fieldName = fieldMatch ? fieldMatch[1] : null;
    
    if (fieldName) {
      const field = formElement.querySelector(`[name="${fieldName}"]`);
      if (field) {
        const errorEl = document.createElement('span');
        errorEl.className = 'error-message';
        errorEl.textContent = error;
        field.parentNode.appendChild(errorEl);
        field.classList.add('error');
      }
    }
  });
}
```

---

## Code Examples

### React Hook for Candidates

```javascript
import { useState, useEffect, useCallback } from 'react';

function useCandidates(initialFilters = {}) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    hasMore: true
  });
  const [filters, setFilters] = useState(initialFilters);

  const loadCandidates = useCallback(async (page = 1, append = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...filters
      });
      
      const response = await apiRequest(`/api/candidates?${queryParams}`);
      
      setCandidates(prev => append ? [...prev, ...response.data] : response.data);
      setPagination({
        page,
        hasMore: response.pagination.hasNextPage
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadMore = useCallback(() => {
    if (!loading && pagination.hasMore) {
      loadCandidates(pagination.page + 1, true);
    }
  }, [loading, pagination, loadCandidates]);

  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination({ page: 1, hasMore: true });
  }, []);

  useEffect(() => {
    loadCandidates(1, false);
  }, [filters, loadCandidates]);

  return {
    candidates,
    loading,
    error,
    hasMore: pagination.hasMore,
    loadMore,
    updateFilters,
    refresh: () => loadCandidates(1, false)
  };
}

// Usage
function CandidateList() {
  const { 
    candidates, 
    loading, 
    error, 
    hasMore, 
    loadMore, 
    updateFilters 
  } = useCandidates({ location: 'Berlin' });

  return (
    <div>
      <input 
        type="text" 
        placeholder="Filter by specialty..."
        onChange={(e) => updateFilters({ specialty: e.target.value })}
      />
      
      {error && <div className="error">{error}</div>}
      
      <div className="candidate-list">
        {candidates.map(candidate => (
          <CandidateCard key={candidate.id} candidate={candidate} />
        ))}
      </div>
      
      {hasMore && (
        <button onClick={loadMore} disabled={loading}>
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

### Vue Composable for Job Matching

```javascript
// composables/useJobMatches.js
import { ref, computed } from 'vue';

export function useJobMatches() {
  const matches = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const candidate = ref(null);

  const fetchMatches = async (candidateId, minScore = 50) => {
    loading.value = true;
    error.value = null;
    
    try {
      const queryParams = new URLSearchParams({
        candidateId: candidateId.toString(),
        minScore: minScore.toString(),
        limit: '20'
      });
      
      const response = await apiRequest(`/api/matches?${queryParams}`);
      
      matches.value = response.matches;
      candidate.value = response.candidate;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  const topMatches = computed(() => 
    matches.value.filter(m => m.matchScore >= 80)
  );

  const goodMatches = computed(() => 
    matches.value.filter(m => m.matchScore >= 60 && m.matchScore < 80)
  );

  return {
    matches,
    candidate,
    loading,
    error,
    topMatches,
    goodMatches,
    fetchMatches
  };
}

// Usage in component
export default {
  setup() {
    const { 
      matches, 
      loading, 
      error, 
      topMatches, 
      goodMatches, 
      fetchMatches 
    } = useJobMatches();

    onMounted(() => {
      fetchMatches(123);  // Candidate ID
    });

    return {
      matches,
      loading,
      error,
      topMatches,
      goodMatches
    };
  }
};
```

---

## Best Practices

### 1. Request Caching

```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function cachedRequest(endpoint, options = {}) {
  const cacheKey = `${endpoint}:${JSON.stringify(options)}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await apiRequest(endpoint, options);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  
  return data;
}
```

### 2. Debounced Search

```javascript
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Debounced filter update
const debouncedFilter = debounce((filters) => {
  updateFilters(filters);
}, 300);

// Usage
<input onInput={(e) => debouncedFilter({ specialty: e.target.value })} />
```

### 3. Optimistic Updates

```javascript
async function updateWithOptimisticUI(candidateId, updates) {
  // Save current state
  const previousData = candidates.value.find(c => c.id === candidateId);
  
  // Optimistically update UI
  candidates.value = candidates.value.map(c => 
    c.id === candidateId ? { ...c, ...updates } : c
  );
  
  try {
    await updateCandidate(candidateId, updates);
  } catch (err) {
    // Revert on error
    candidates.value = candidates.value.map(c => 
      c.id === candidateId ? previousData : c
    );
    showError('Update failed');
  }
}
```

### 4. Request Cancellation

```javascript
const abortControllers = new Map();

async function cancellableRequest(key, endpoint, options = {}) {
  // Cancel previous request with same key
  if (abortControllers.has(key)) {
    abortControllers.get(key).abort();
  }
  
  const controller = new AbortController();
  abortControllers.set(key, controller);
  
  try {
    const response = await apiRequest(endpoint, {
      ...options,
      signal: controller.signal
    });
    
    abortControllers.delete(key);
    return response;
  } catch (err) {
    abortControllers.delete(key);
    if (err.name === 'AbortError') {
      return null; // Request was cancelled
    }
    throw err;
  }
}

// Usage - auto-cancels previous search
onSearchChange((query) => {
  cancellableRequest('search', `/api/jobs?specialty=${query}`);
});
```

### 5. Loading States

```javascript
function useLoadingState() {
  const states = ref(new Map());
  
  const isLoading = (key) => states.value.get(key) || false;
  
  const withLoading = async (key, fn) => {
    states.value.set(key, true);
    try {
      return await fn();
    } finally {
      states.value.set(key, false);
    }
  };
  
  return { isLoading, withLoading };
}
```

---

## Security Considerations

### Current Development Mode

⚠️ **Important:** The API currently has **no authentication**. In production:

1. **Never expose candidate emails** in public listings
2. **Always verify permissions** before data access
3. **Use HTTPS** for all requests
4. **Implement rate limiting** on your frontend

### Production Checklist

- [ ] Store JWT tokens securely (httpOnly cookies preferred)
- [ ] Implement token refresh logic
- [ ] Add CSRF protection for state-changing requests
- [ ] Sanitize all user input before display (XSS prevention)
- [ ] Use Content Security Policy headers

---

## Additional Resources

- [API Documentation](./API_DOCUMENTATION.md) - Full endpoint reference
- [OpenAPI Spec](./openapi.yaml) - Machine-readable API specification
- [Security Audit](./SECURITY_AUDIT.md) - Security review and recommendations

---

*Generated for BER-209 - API Security Audit & Documentation*
