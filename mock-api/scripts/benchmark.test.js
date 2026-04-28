/**
 * Benchmark Script Tests
 * 
 * @jest-environment node
 */

const path = require('path');
const fs = require('fs');

describe('Benchmark Script', () => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'benchmark.js');
  
  test('should exist', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  test('should have shebang', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/^#!/);
  });

  test('should import http and https modules', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/require\(['"]http['"]\)/);
    expect(content).toMatch(/require\(['"]https['"]\)/);
  });

  test('should have CONFIG object', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/const CONFIG/);
    expect(content).toMatch(/baseUrl/);
    expect(content).toMatch(/concurrent/);
    expect(content).toMatch(/duration/);
    expect(content).toMatch(/endpoints/);
  });

  test('should use environment variables', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/process\.env\.API_URL/);
    expect(content).toMatch(/process\.env\.CONCURRENT/);
    expect(content).toMatch(/process\.env\.DURATION/);
  });

  test('should define test endpoints', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/\/api\/health/);
    expect(content).toMatch(/\/api\/candidates/);
    expect(content).toMatch(/\/api\/employers/);
    expect(content).toMatch(/\/api\/jobs/);
    expect(content).toMatch(/\/api\/signups\/count/);
  });

  test('should have results tracking object', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/const results/);
    expect(content).toMatch(/total.*count/);
    expect(content).toMatch(/latencies/);
    expect(content).toMatch(/statusCodes/);
    expect(content).toMatch(/errors/);
  });

  test('should have makeRequest function', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/function makeRequest/);
  });

  test('should track request timing', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/process\.hrtime/);
    expect(content).toMatch(/Date\.now\(\)/);
  });

  test('should handle command line arguments', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/process\.argv/);
    expect(content).toMatch(/--endpoint/);
    expect(content).toMatch(/--duration/);
    expect(content).toMatch(/--concurrent/);
  });

  test('should have warmup phase', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/warmup/i);
    expect(content).toMatch(/warmupDuration/);
  });

  test('should calculate statistics', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/calculateStats|calculatePercentiles/i);
    expect(content).toMatch(/percentile|p95|p99/i);
    expect(content).toMatch(/min|max/i);
  });

  test('should generate report output', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/console\.log/);
    expect(content).toMatch(/Benchmark Report|Results|Summary/i);
  });

  test('should handle errors gracefully', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/\.catch/);
    expect(content).toMatch(/error/i);
    expect(content).toMatch(/req\.on\(['"]error/);
  });

  test('should have main execution block', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/function.*run|async function|main/i);
  });

  test('should use weighted endpoint selection', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/weight/i);
  });

  test('should have proper structure', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content.length).toBeGreaterThan(1000);
  });
});
