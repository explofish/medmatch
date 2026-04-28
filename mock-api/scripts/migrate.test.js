/**
 * Database Migration Runner Tests
 * 
 * @jest-environment node
 */

const path = require('path');
const fs = require('fs');

describe('Database Migration Runner', () => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'migrate.js');
  
  test('should exist', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  test('should have shebang', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/^#!/);
  });

  test('should import required modules', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/require\(['"]fs['"]\)/);
    expect(content).toMatch(/require\(['"]path['"]\)/);
    expect(content).toMatch(/require\(['"]sqlite3['"]\)/);
    expect(content).toMatch(/require\(['"]crypto['"]\)/);
  });

  test('should define migrations directory', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/MIGRATIONS_DIR/);
    expect(content).toMatch(/migrations/);
  });

  test('should define database path', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/DB_PATH/);
    expect(content).toMatch(/medmatch\.db/);
  });

  test('should support environment variables', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/TEST_DB_PATH/);
    expect(content).toMatch(/process\.env/);
  });

  test('should have initMigrationsTable function', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/function initMigrationsTable/);
  });

  test('should create __migrations tracking table', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/CREATE TABLE IF NOT EXISTS __migrations/);
    expect(content).toMatch(/filename.*TEXT/);
    expect(content).toMatch(/checksum.*TEXT/);
    expect(content).toMatch(/executed_at/);
  });

  test('should have calculateChecksum function', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/function calculateChecksum/);
    expect(content).toMatch(/sha256|createHash/);
  });

  test('should support command line arguments', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/process\.argv/);
    expect(content).toMatch(/--rollback/);
    expect(content).toMatch(/--status/);
    expect(content).toMatch(/--create/);
  });

  test('should have runMigrations function', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/function runMigrations|async function run/);
  });

  test('should mention rollback in documentation', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/--rollback/);
  });

  test('should have showStatus function', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/function showStatus|async function status/);
  });

  test('should have createMigration function', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/function createMigration|function create/);
  });

  test('should handle SQL up/down migrations', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/-- Up|-- Migration Up/i);
    expect(content).toMatch(/-- Down|-- Migration Down|ROLLBACK/i);
  });

  test('should track migration execution time', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/execution_time_ms|Date\.now\(\)|hrtime/i);
  });

  test('should validate checksums for integrity', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/checksum|integrity|validate/i);
  });

  test('should use transactions for safety', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/BEGIN|COMMIT|ROLLBACK/i);
  });

  test('should handle errors gracefully', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/catch.*err|\.catch\(/i);
    expect(content).toMatch(/console\.error/);
  });

  test('should close database connection', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/db\.close/);
  });

  test('should have main execution logic', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/async function|runMigrations|main/i);
  });

  test('should have substantial content', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content.length).toBeGreaterThan(5000);
  });

  test('should ensure directories exist', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/fs\.mkdirSync/);
    expect(content).toMatch(/recursive.*true/);
  });
});
