export async function testSignupFlow() {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'User'
  };

  try {
    const response = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });

    const data = await response.json();
    console.log('Signup test result:', response.status, data);
    return response.ok;
  } catch (error) {
    console.error('Signup test failed:', error);
    return false;
  }
}

export async function testHealthCheck() {
  try {
    const response = await fetch('http://localhost:3001/api/health');
    const data = await response.json();
    console.log('Health check result:', data);
    return data.status === 'healthy';
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}
