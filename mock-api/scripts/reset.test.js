/**
 * Database Reset Script Tests
 * 
 * @jest-environment node
 */

const path = require('path');
const fs = require('fs');

describe('Database Reset Script', () => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'reset.js');
  
  test('should exist', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  test('should have shebang', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/^#!/);
  });

  test('should import sqlite3', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/require\(['"]sqlite3['"]\)/);
  });

  test('should import path module', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/require\(['"]path['"]\)/);
  });

  test('should define database path', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/DB_PATH/);
    expect(content).toMatch(/medmatch\.db/);
  });

  test('should support environment variables', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/process\.env\.DB_PATH/);
  });

  test('should define data directory', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/DATA_DIR/);
    expect(content).toMatch(/\.data/);
  });

  test('should define tables to reset', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/tables/);
    expect(content).toMatch(/jobs/);
    expect(content).toMatch(/employers/);
    expect(content).toMatch(/candidates/);
    expect(content).toMatch(/signups/);
  });

  test('should have async reset function', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/async function reset/);
  });

  test('should use DELETE FROM for clearing tables', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/DELETE FROM/);
  });

  test('should track deleted rows', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/this\.changes/);
  });

  test('should handle errors gracefully', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/catch.*error|try.*catch/i);
    expect(content).toMatch(/console\.error/);
    expect(content).toMatch(/process\.exit\(1\)/);
  });

  test('should close database connection', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/finally/);
    expect(content).toMatch(/db\.close/);
  });

  test('should call reset function', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/reset\(\)/);
  });

  test('should have user-friendly console output', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/console\.log/);
    expect(content).toMatch(/Database Reset|Clearing|complete/i);
  });

  test('should use emoji for visual feedback', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/🗑️|✅|❌|✨/);
  });

  test('should process tables sequentially', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/for.*of tables/);
    expect(content).toMatch(/await/);
  });

  test('should handle database open errors', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/Error opening database/);
  });

  test('should be relatively short and focused', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    const lines = content.split('\n').length;
    expect(lines).toBeLessThan(70);
  });
});
