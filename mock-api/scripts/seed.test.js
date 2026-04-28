/**
 * Database Seed Script Tests
 * 
 * @jest-environment node
 */

const path = require('path');
const fs = require('fs');

describe('Seed Script', () => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'seed.js');
  const seedDataPath = path.join(__dirname, '..', 'scripts', 'seed-data.js');
  
  test('seed.js should exist', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  test('seed-data.js should exist', () => {
    expect(fs.existsSync(seedDataPath)).toBe(true);
  });

  test('should have shebang', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/^#!/);
  });

  test('should import required modules', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/require\(['"]sqlite3['"]\)/);
    expect(content).toMatch(/require\(['"]path['"]\)/);
    expect(content).toMatch(/require\(['"]fs['"]\)/);
  });

  test('should import seed data', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/require\(['"]\.\/seed-data['"]\)/);
    expect(content).toMatch(/employers/);
    expect(content).toMatch(/jobs/);
    expect(content).toMatch(/candidates/);
  });

  test('should define database path', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/DB_PATH/);
    expect(content).toMatch(/DATA_DIR/);
    expect(content).toMatch(/\.data/);
  });

  test('should create data directory if not exists', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/fs\.mkdirSync/);
    expect(content).toMatch(/recursive.*true/);
  });

  test('should have seed function', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/async function seed/);
  });

  test('should use transactions', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/BEGIN TRANSACTION/);
    expect(content).toMatch(/COMMIT/);
    expect(content).toMatch(/ROLLBACK/);
  });

  test('should clear existing data', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/DELETE FROM/);
  });

  test('should seed employers table', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/INSERT.*INTO.*employers/i);
  });

  test('should seed jobs table', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/INSERT.*INTO.*jobs/i);
  });

  test('should seed candidates table', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/INSERT.*INTO.*candidates/i);
  });

  test('should use prepared statements', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/db\.prepare/);
  });

  test('should have run helper function', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/function run/);
  });

  test('should handle errors gracefully', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/catch.*err/);
    expect(content).toMatch(/console\.error/);
  });

  test('should close database connection', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/db\.close/);
  });

  test('should call seed function', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/seed\(\)/);
  });

  test('should seed signups table', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/DELETE FROM signups/);
  });

  test('seed-data.js should export data arrays', () => {
    const content = fs.readFileSync(seedDataPath, 'utf8');
    expect(content).toMatch(/module\.exports/);
    expect(content).toMatch(/employers/);
    expect(content).toMatch(/jobs/);
    expect(content).toMatch(/candidates/);
  });

  test('should have realistic DACH data', () => {
    const content = fs.readFileSync(seedDataPath, 'utf8');
    // Should have German medical terms
    expect(content).toMatch(/Kardiologie|Innere|Chirurgie|Neurologie/i);
    // Should have German cities
    expect(content).toMatch(/Berlin|München|Hamburg|Köln|Frankfurt/i);
  });
});
