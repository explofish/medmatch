import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Signup endpoint load test
export const options = {
  stages: [
    { duration: '1m', target: 5 },   // Ramp up
    { duration: '3m', target: 5 },   // Steady state
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% under 1s
    http_req_failed: ['rate<0.05'],    // Less than 5% errors (some 409s expected for duplicates)
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://medmatch-api-staging.onrender.com';

export default function () {
  const randomEmail = `test-${randomString(8)}@loadtest.example.com`;
  
  const payload = JSON.stringify({
    email: randomEmail,
    password: 'TestPass123!',
    firstName: 'Load',
    lastName: 'Test',
    userType: 'graduate',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/api/auth/register`, payload, params);
  
  check(res, {
    'signup status is 201 or 409': (r) => r.status === 201 || r.status === 409,
    'signup response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  sleep(2); // Wait between requests
}
