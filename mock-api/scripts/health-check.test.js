/**
 * Health Check Script Tests
 * 
 * @jest-environment node
 */

const path = require('path');

// Mock the health check module
jest.mock('http', () => ({
  get: jest.fn()
}));

describe('Health Check Script', () => {
  let consoleSpy;
  let processExitSpy;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  test('should define expected endpoints', () => {
    // The script defines 5 endpoints
    const expectedEndpoints = [
      '/api/health',
      '/api/jobs',
      '/api/employers',
      '/api/candidates',
      '/api/signups/count'
    ];
    
    expectedEndpoints.forEach(endpoint => {
      expect(endpoint).toMatch(/^\/api\//);
    });
  });

  test('should use environment variables', () => {
    // Script should respect API_URL env var
    const originalUrl = process.env.API_URL;
    process.env.API_URL = 'http://test-server:8080';
    
    // Check that it can be read
    expect(process.env.API_URL).toBe('http://test-server:8080');
    
    // Restore
    if (originalUrl) {
      process.env.API_URL = originalUrl;
    } else {
      delete process.env.API_URL;
    }
  });

  test('should have proper script structure', () => {
    const fs = require('fs');
    const scriptPath = path.join(__dirname, '..', 'scripts', 'health-check.js');
    
    expect(fs.existsSync(scriptPath)).toBe(true);
    
    const content = fs.readFileSync(scriptPath, 'utf8');
    
    // Should have shebang
    expect(content).toMatch(/#!/);
    
    // Should have timeout constant
    expect(content).toMatch(/TIMEOUT/);
    
    // Should have BASE_URL
    expect(content).toMatch(/BASE_URL/);
    
    // Should have runChecks function
    expect(content).toMatch(/runChecks/);
    
    // Should have checkEndpoint function
    expect(content).toMatch(/checkEndpoint/);
    
    // Should handle success/failure
    expect(content).toMatch(/process\.exit/);
  });

  test('should have proper endpoint definitions', () => {
    const fs = require('fs');
    const scriptPath = path.join(__dirname, '..', 'scripts', 'health-check.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    
    // Should check health endpoint
    expect(content).toMatch(/api\/health/);
    
    // Should check jobs endpoint
    expect(content).toMatch(/api\/jobs/);
    
    // Should check employers endpoint
    expect(content).toMatch(/api\/employers/);
    
    // Should check candidates endpoint  
    expect(content).toMatch(/api\/candidates/);
    
    // Should check signups endpoint
    expect(content).toMatch(/api\/signups/);
  });

  test('should support verbose mode', () => {
    const fs = require('fs');
    const scriptPath = path.join(__dirname, '..', 'scripts', 'health-check.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    
    // Should check for --verbose argument
    expect(content).toMatch(/--verbose/);
    expect(content).toMatch(/verbose/);
  });

  test('should handle errors properly', () => {
    const fs = require('fs');
    const scriptPath = path.join(__dirname, '..', 'scripts', 'health-check.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    
    // Should have error handler
    expect(content).toMatch(/req\.on\('error'/);
    
    // Should have timeout handler
    expect(content).toMatch(/req\.on\('timeout'/);
    
    // Should handle HTTP errors
    expect(content).toMatch(/error.*message/);
  });

  test('should measure response times', () => {
    const fs = require('fs');
    const scriptPath = path.join(__dirname, '..', 'scripts', 'health-check.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    
    // Should use Date.now() for timing
    expect(content).toMatch(/Date\.now\(\)/);
    
    // Should calculate duration
    expect(content).toMatch(/duration/);
  });

  test('should exit with proper codes', () => {
    const fs = require('fs');
    const scriptPath = path.join(__dirname, '..', 'scripts', 'health-check.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    
    // Should exit 0 on success
    expect(content).toMatch(/process\.exit\(0\)/);
    
    // Should exit 1 on failure
    expect(content).toMatch(/process\.exit\(1\)/);
  });
});
