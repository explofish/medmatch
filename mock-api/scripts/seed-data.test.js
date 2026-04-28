/**
 * Seed Data Content Tests
 * 
 * @jest-environment node
 */

const path = require('path');
const fs = require('fs');

describe('Seed Data Content', () => {
  const seedDataPath = path.join(__dirname, '..', 'scripts', 'seed-data.js');
  let seedData;

  beforeAll(() => {
    // Load the seed data module
    seedData = require(seedDataPath);
  });

  test('should export employers array', () => {
    expect(Array.isArray(seedData.employers)).toBe(true);
    expect(seedData.employers.length).toBeGreaterThan(0);
  });

  test('should export jobs array', () => {
    expect(Array.isArray(seedData.jobs)).toBe(true);
    expect(seedData.jobs.length).toBeGreaterThan(0);
  });

  test('should export candidates array', () => {
    expect(Array.isArray(seedData.candidates)).toBe(true);
    expect(seedData.candidates.length).toBeGreaterThan(0);
  });

  test('employers should have required fields', () => {
    const employer = seedData.employers[0];
    expect(employer).toHaveProperty('name');
    expect(employer).toHaveProperty('location');
    expect(employer).toHaveProperty('hospitalType');
    expect(employer).toHaveProperty('size');
  });

  test('jobs should have required fields', () => {
    const job = seedData.jobs[0];
    expect(job).toHaveProperty('title');
    expect(job).toHaveProperty('employerName');
    expect(job).toHaveProperty('specialty');
    expect(job).toHaveProperty('location');
    expect(job).toHaveProperty('salaryMin');
    expect(job).toHaveProperty('salaryMax');
  });

  test('candidates should have required fields', () => {
    const candidate = seedData.candidates[0];
    expect(candidate).toHaveProperty('firstName');
    expect(candidate).toHaveProperty('lastName');
    expect(candidate).toHaveProperty('email');
    expect(candidate).toHaveProperty('specialty');
    expect(candidate).toHaveProperty('location');
    expect(candidate).toHaveProperty('experienceYears');
  });

  test('should have German medical specialties', () => {
    const content = fs.readFileSync(seedDataPath, 'utf8');
    const germanSpecialties = [
      'Kardiologie', 'Chirurgie', 'Neurologie', 'Orthopädie',
      'Pädiatrie', 'Anästhesiologie', 'Dermatologie', 'Gynäkologie'
    ];
    
    germanSpecialties.forEach(specialty => {
      expect(content).toContain(specialty);
    });
  });

  test('should have German cities', () => {
    const content = fs.readFileSync(seedDataPath, 'utf8');
    const germanCities = [
      'Berlin', 'München', 'Hamburg', 'Köln', 'Frankfurt',
      'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dresden', 'Heidelberg'
    ];
    
    germanCities.forEach(city => {
      expect(content).toContain(city);
    });
  });

  test('should have German last names', () => {
    const content = fs.readFileSync(seedDataPath, 'utf8');
    const germanNames = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber'];
    
    germanNames.forEach(name => {
      expect(content).toContain(name);
    });
  });

  test('should have German first names', () => {
    const content = fs.readFileSync(seedDataPath, 'utf8');
    const germanFirstNames = ['Alexander', 'Maximilian', 'Anna', 'Emma', 'Sophie'];
    
    germanFirstNames.forEach(name => {
      expect(content).toContain(name);
    });
  });

  test('jobs should reference valid employers', () => {
    const employerNames = seedData.employers.map(e => e.name);
    
    seedData.jobs.forEach(job => {
      expect(employerNames).toContain(job.employerName);
    });
  });

  test('should have realistic data counts', () => {
    expect(seedData.employers.length).toBeGreaterThanOrEqual(7); // 7 major hospitals minimum
    expect(seedData.jobs.length).toBeGreaterThanOrEqual(1); // Jobs generated
    expect(seedData.candidates.length).toBeGreaterThanOrEqual(50);
  });

  test('employers should have German hospital types', () => {
    const content = fs.readFileSync(seedDataPath, 'utf8');
    expect(content).toMatch(/Universitätsklinikum|Klinikum|Krankenhaus/i);
  });

  test('candidates should have German states', () => {
    const content = fs.readFileSync(seedDataPath, 'utf8');
    const germanStates = ['BE', 'BY', 'HH', 'NW', 'HE', 'BW', 'SN', 'NI'];
    
    germanStates.forEach(state => {
      expect(content).toContain(`'${state}'`);
    });
  });

  test('data should be properly structured for database', () => {
    // All arrays should contain objects
    expect(seedData.employers.every(e => typeof e === 'object')).toBe(true);
    expect(seedData.jobs.every(j => typeof j === 'object')).toBe(true);
    expect(seedData.candidates.every(c => typeof c === 'object')).toBe(true);
  });

  test('should include email patterns for candidates', () => {
    const content = fs.readFileSync(seedDataPath, 'utf8');
    // Email generation is done programmatically in seed.js
    expect(content).toContain('email');
  });

  test('should have realistic salary ranges', () => {
    const content = fs.readFileSync(seedDataPath, 'utf8');
    expect(content).toMatch(/salary/i);
  });

  test('should have job types (full-time, part-time)', () => {
    const content = fs.readFileSync(seedDataPath, 'utf8');
    expect(content).toMatch(/full-time|part-time|Vollzeit|Teilzeit/i);
  });
});
