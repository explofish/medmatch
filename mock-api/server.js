// MedMatch API with SQLite persistence for Glitch hosting
// Data persists across container restarts via Glitch's persistent filesystem

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();

// Use environment variable for test database path, otherwise use .data folder
const DATA_DIR = process.env.TEST_DB_PATH 
  ? path.dirname(process.env.TEST_DB_PATH)
  : path.join(__dirname, '.data');
const DB_PATH = process.env.TEST_DB_PATH || path.join(DATA_DIR, 'medmatch.db');

// Ensure data directory exists
if (!require('fs').existsSync(DATA_DIR)) {
  require('fs').mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database at', DB_PATH);
    initDatabase();
  }
});

// Create tables if not exists
function initDatabase() {
  db.serialize(() => {
    // Signups table (existing)
    db.run(`
      CREATE TABLE IF NOT EXISTS signups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        yearOfGraduation TEXT,
        specialization TEXT,
        state TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating signups table:', err.message);
    });

    // Candidates table
    db.run(`
      CREATE TABLE IF NOT EXISTS candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        location TEXT,
        specialty TEXT,
        experienceYears INTEGER,
        cvUrl TEXT,
        preferences TEXT,
        isDeleted INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating candidates table:', err.message);
    });

    // Employers table
    db.run(`
      CREATE TABLE IF NOT EXISTS employers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        location TEXT,
        website TEXT,
        hospitalType TEXT,
        size TEXT,
        isDeleted INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating employers table:', err.message);
    });

    // Jobs table
    db.run(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employerId INTEGER NOT NULL,
        title TEXT NOT NULL,
        specialty TEXT,
        location TEXT,
        description TEXT,
        requirements TEXT,
        salaryMin INTEGER,
        salaryMax INTEGER,
        jobType TEXT,
        experienceRequired INTEGER,
        postedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        expiresAt DATETIME,
        status TEXT DEFAULT 'active',
        isDeleted INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employerId) REFERENCES employers(id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating jobs table:', err.message);
      } else {
        console.log('Database initialized with all tables');
      }
    });
  });
}

// CORS - Allow all origins for Glitch
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ============ HEALTH CHECK ============

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'medmatch-api'
  });
});

// ============ SIGNUP ENDPOINTS (existing) ============

// Signup endpoint (matches mock API interface)
app.post('/api/auth/register', (req, res) => {
  const { email, firstName, lastName, yearOfGraduation, specialization, state } = req.body;
  
  // Validation
  if (!email || !firstName || !lastName) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['email', 'firstName', 'lastName']
    });
  }
  
  const sql = `INSERT INTO signups (email, firstName, lastName, yearOfGraduation, specialization, state)
               VALUES (?, ?, ?, ?, ?, ?)`;
  
  db.run(sql, [email, firstName, lastName, yearOfGraduation || null, specialization || null, state || null], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ 
          error: 'Email already registered',
          message: 'This email is already on the waitlist'
        });
      }
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    
    console.log('New signup:', { id: this.lastID, email, firstName });
    
    res.status(201).json({
      success: true,
      message: 'Successfully joined the waitlist!',
      data: {
        id: this.lastID.toString(),
        email,
        firstName
      }
    });
  });
});

// Get all signups (admin)
app.get('/api/signups', (req, res) => {
  db.all('SELECT * FROM signups ORDER BY createdAt DESC', [], (err, rows) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({
      count: rows.length,
      signups: rows
    });
  });
});

// Count signups (lightweight stat)
app.get('/api/signups/count', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM signups', [], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ count: row.count });
  });
});

// ============ CANDIDATE PROFILE ENDPOINTS ============

/**
 * GET /api/candidates
 * List candidates with filters, pagination, and sorting
 */
app.get('/api/candidates', (req, res) => {
  const {
    location,
    specialty,
    minExperience,
    maxExperience,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100);
  
  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({ error: 'Invalid page number' });
  }
  if (isNaN(limitNum) || limitNum < 1) {
    return res.status(400).json({ error: 'Invalid limit' });
  }

  const allowedSortColumns = ['id', 'firstName', 'lastName', 'location', 'specialty', 'experienceYears', 'createdAt', 'updatedAt'];
  const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'createdAt';
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const conditions = ['isDeleted = 0'];
  const params = [];

  if (location) {
    conditions.push('location LIKE ?');
    params.push(`%${location}%`);
  }
  if (specialty) {
    conditions.push('specialty LIKE ?');
    params.push(`%${specialty}%`);
  }
  if (minExperience !== undefined && !isNaN(parseInt(minExperience, 10))) {
    conditions.push('experienceYears >= ?');
    params.push(parseInt(minExperience, 10));
  }
  if (maxExperience !== undefined && !isNaN(parseInt(maxExperience, 10))) {
    conditions.push('experienceYears <= ?');
    params.push(parseInt(maxExperience, 10));
  }

  const whereClause = conditions.join(' AND ');
  const offset = (pageNum - 1) * limitNum;

  const countSql = `SELECT COUNT(*) as total FROM candidates WHERE ${whereClause}`;
  
  db.get(countSql, params, (err, countRow) => {
    if (err) {
      console.error('Database error (count):', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    const total = countRow.total;
    const totalPages = Math.ceil(total / limitNum);

    const dataSql = `
      SELECT 
        id, email, firstName, lastName, location, specialty, 
        experienceYears, cvUrl, preferences, 
        createdAt, updatedAt
      FROM candidates 
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${order}
      LIMIT ? OFFSET ?
    `;

    db.all(dataSql, [...params, limitNum, offset], (err, rows) => {
      if (err) {
        console.error('Database error (data):', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      const candidates = rows.map(row => ({
        ...row,
        preferences: row.preferences ? JSON.parse(row.preferences) : null
      }));

      res.json({
        data: candidates,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      });
    });
  });
});

/**
 * GET /api/candidates/:id
 * Get single candidate profile
 */
app.get('/api/candidates/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid candidate ID' });
  }

  const sql = `
    SELECT 
      id, email, firstName, lastName, location, specialty, 
      experienceYears, cvUrl, preferences, 
      createdAt, updatedAt
    FROM candidates 
    WHERE id = ? AND isDeleted = 0
  `;

  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.json({
      data: {
        ...row,
        preferences: row.preferences ? JSON.parse(row.preferences) : null
      }
    });
  });
});

/**
 * POST /api/candidates
 * Create new candidate profile
 */
app.post('/api/candidates', (req, res) => {
  const {
    email,
    firstName,
    lastName,
    location,
    specialty,
    experienceYears,
    cvUrl,
    preferences
  } = req.body;

  const errors = [];
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    errors.push('email is required and must be a valid email');
  }
  if (!firstName || typeof firstName !== 'string' || firstName.trim().length === 0) {
    errors.push('firstName is required');
  }
  if (!lastName || typeof lastName !== 'string' || lastName.trim().length === 0) {
    errors.push('lastName is required');
  }
  if (experienceYears !== undefined && (isNaN(parseInt(experienceYears, 10)) || parseInt(experienceYears, 10) < 0)) {
    errors.push('experienceYears must be a non-negative number');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', errors });
  }

  const sql = `
    INSERT INTO candidates (email, firstName, lastName, location, specialty, experienceYears, cvUrl, preferences)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const preferencesJson = preferences ? JSON.stringify(preferences) : null;

  db.run(sql, [
    email.toLowerCase().trim(),
    firstName.trim(),
    lastName.trim(),
    location || null,
    specialty || null,
    experienceYears !== undefined ? parseInt(experienceYears, 10) : null,
    cvUrl || null,
    preferencesJson
  ], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ 
          error: 'Email already exists',
          message: 'A candidate with this email already exists'
        });
      }
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    const newId = this.lastID;

    db.get(
      'SELECT id, email, firstName, lastName, location, specialty, experienceYears, cvUrl, preferences, createdAt, updatedAt FROM candidates WHERE id = ?',
      [newId],
      (err, row) => {
        if (err || !row) {
          return res.status(201).json({
            message: 'Candidate created successfully',
            data: { id: newId.toString() }
          });
        }

        res.status(201).json({
          message: 'Candidate created successfully',
          data: {
            ...row,
            preferences: row.preferences ? JSON.parse(row.preferences) : null
          }
        });
      }
    );
  });
});

/**
 * PATCH /api/candidates/:id
 * Update candidate profile (partial update)
 */
app.patch('/api/candidates/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid candidate ID' });
  }

  const {
    email,
    firstName,
    lastName,
    location,
    specialty,
    experienceYears,
    cvUrl,
    preferences
  } = req.body;

  const updates = [];
  const params = [];

  if (email !== undefined) {
    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    updates.push('email = ?');
    params.push(email.toLowerCase().trim());
  }

  if (firstName !== undefined) {
    if (typeof firstName !== 'string' || firstName.trim().length === 0) {
      return res.status(400).json({ error: 'firstName cannot be empty' });
    }
    updates.push('firstName = ?');
    params.push(firstName.trim());
  }

  if (lastName !== undefined) {
    if (typeof lastName !== 'string' || lastName.trim().length === 0) {
      return res.status(400).json({ error: 'lastName cannot be empty' });
    }
    updates.push('lastName = ?');
    params.push(lastName.trim());
  }

  if (location !== undefined) {
    updates.push('location = ?');
    params.push(location || null);
  }

  if (specialty !== undefined) {
    updates.push('specialty = ?');
    params.push(specialty || null);
  }

  if (experienceYears !== undefined) {
    if (isNaN(parseInt(experienceYears, 10)) || parseInt(experienceYears, 10) < 0) {
      return res.status(400).json({ error: 'experienceYears must be a non-negative number' });
    }
    updates.push('experienceYears = ?');
    params.push(parseInt(experienceYears, 10));
  }

  if (cvUrl !== undefined) {
    updates.push('cvUrl = ?');
    params.push(cvUrl || null);
  }

  if (preferences !== undefined) {
    updates.push('preferences = ?');
    params.push(preferences ? JSON.stringify(preferences) : null);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.push('updatedAt = CURRENT_TIMESTAMP');
  params.push(id);

  const sql = `UPDATE candidates SET ${updates.join(', ')} WHERE id = ? AND isDeleted = 0`;

  db.run(sql, params, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Email already exists' });
      }
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    db.get(
      'SELECT id, email, firstName, lastName, location, specialty, experienceYears, cvUrl, preferences, createdAt, updatedAt FROM candidates WHERE id = ?',
      [id],
      (err, row) => {
        if (err || !row) {
          return res.json({
            message: 'Candidate updated successfully',
            data: { id: id.toString() }
          });
        }

        res.json({
          message: 'Candidate updated successfully',
          data: {
            ...row,
            preferences: row.preferences ? JSON.parse(row.preferences) : null
          }
        });
      }
    );
  });
});

/**
 * DELETE /api/candidates/:id
 * Soft delete candidate
 */
app.delete('/api/candidates/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid candidate ID' });
  }

  const sql = 'UPDATE candidates SET isDeleted = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND isDeleted = 0';

  db.run(sql, [id], function(err) {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.json({
      message: 'Candidate deleted successfully',
      data: { id: id.toString() }
    });
  });
});

// ============ EMPLOYER ENDPOINTS ============

/**
 * GET /api/employers
 * List employers with filters, pagination
 */
app.get('/api/employers', (req, res) => {
  const {
    location,
    hospitalType,
    page = 1,
    limit = 20
  } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100);
  
  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({ error: 'Invalid page number' });
  }
  if (isNaN(limitNum) || limitNum < 1) {
    return res.status(400).json({ error: 'Invalid limit' });
  }

  const conditions = ['isDeleted = 0'];
  const params = [];

  if (location) {
    conditions.push('location LIKE ?');
    params.push(`%${location}%`);
  }
  if (hospitalType) {
    conditions.push('hospitalType = ?');
    params.push(hospitalType);
  }

  const whereClause = conditions.join(' AND ');
  const offset = (pageNum - 1) * limitNum;

  const countSql = `SELECT COUNT(*) as total FROM employers WHERE ${whereClause}`;
  
  db.get(countSql, params, (err, countRow) => {
    if (err) {
      console.error('Database error (count):', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    const total = countRow.total;
    const totalPages = Math.ceil(total / limitNum);

    const dataSql = `
      SELECT id, name, description, location, website, hospitalType, size, createdAt, updatedAt
      FROM employers 
      WHERE ${whereClause}
      ORDER BY name ASC
      LIMIT ? OFFSET ?
    `;

    db.all(dataSql, [...params, limitNum, offset], (err, rows) => {
      if (err) {
        console.error('Database error (data):', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        data: rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      });
    });
  });
});

/**
 * GET /api/employers/:id
 * Get single employer profile with their jobs
 */
app.get('/api/employers/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid employer ID' });
  }

  const employerSql = `
    SELECT id, name, description, location, website, hospitalType, size, createdAt, updatedAt
    FROM employers 
    WHERE id = ? AND isDeleted = 0
  `;

  db.get(employerSql, [id], (err, employer) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!employer) {
      return res.status(404).json({ error: 'Employer not found' });
    }

    // Get active jobs for this employer
    const jobsSql = `
      SELECT id, title, specialty, location, salaryMin, salaryMax, jobType, experienceRequired, status, postedAt
      FROM jobs 
      WHERE employerId = ? AND isDeleted = 0 AND status = 'active'
      ORDER BY postedAt DESC
    `;

    db.all(jobsSql, [id], (err, jobs) => {
      if (err) {
        console.error('Database error (jobs):', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        data: {
          ...employer,
          jobs: jobs || []
        }
      });
    });
  });
});

/**
 * POST /api/employers
 * Create new employer profile
 */
app.post('/api/employers', (req, res) => {
  const { name, description, location, website, hospitalType, size } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'name is required' });
  }

  const sql = `
    INSERT INTO employers (name, description, location, website, hospitalType, size)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [
    name.trim(),
    description || null,
    location || null,
    website || null,
    hospitalType || null,
    size || null
  ], function(err) {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    const newId = this.lastID;

    db.get(
      'SELECT id, name, description, location, website, hospitalType, size, createdAt, updatedAt FROM employers WHERE id = ?',
      [newId],
      (err, row) => {
        if (err || !row) {
          return res.status(201).json({
            message: 'Employer created successfully',
            data: { id: newId.toString() }
          });
        }

        res.status(201).json({
          message: 'Employer created successfully',
          data: row
        });
      }
    );
  });
});

/**
 * PATCH /api/employers/:id
 * Update employer profile (partial update)
 */
app.patch('/api/employers/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid employer ID' });
  }

  const { name, description, location, website, hospitalType, size } = req.body;

  const updates = [];
  const params = [];

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'name cannot be empty' });
    }
    updates.push('name = ?');
    params.push(name.trim());
  }

  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description || null);
  }

  if (location !== undefined) {
    updates.push('location = ?');
    params.push(location || null);
  }

  if (website !== undefined) {
    updates.push('website = ?');
    params.push(website || null);
  }

  if (hospitalType !== undefined) {
    updates.push('hospitalType = ?');
    params.push(hospitalType || null);
  }

  if (size !== undefined) {
    updates.push('size = ?');
    params.push(size || null);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.push('updatedAt = CURRENT_TIMESTAMP');
  params.push(id);

  const sql = `UPDATE employers SET ${updates.join(', ')} WHERE id = ? AND isDeleted = 0`;

  db.run(sql, params, function(err) {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Employer not found' });
    }

    db.get(
      'SELECT id, name, description, location, website, hospitalType, size, createdAt, updatedAt FROM employers WHERE id = ?',
      [id],
      (err, row) => {
        if (err || !row) {
          return res.json({
            message: 'Employer updated successfully',
            data: { id: id.toString() }
          });
        }

        res.json({
          message: 'Employer updated successfully',
          data: row
        });
      }
    );
  });
});

// ============ JOBS ENDPOINTS ============

/**
 * GET /api/jobs
 * List jobs with filters, pagination, sorting
 */
app.get('/api/jobs', (req, res) => {
  const {
    employerId,
    specialty,
    location,
    jobType,
    minSalary,
    maxSalary,
    minExperience,
    maxExperience,
    status = 'active',
    sortBy = 'postedAt',
    sortOrder = 'desc',
    page = 1,
    limit = 20
  } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100);
  
  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({ error: 'Invalid page number' });
  }
  if (isNaN(limitNum) || limitNum < 1) {
    return res.status(400).json({ error: 'Invalid limit' });
  }

  const allowedSortColumns = ['id', 'title', 'specialty', 'location', 'salaryMin', 'salaryMax', 'postedAt', 'createdAt'];
  const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'postedAt';
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const conditions = ['j.isDeleted = 0'];
  const params = [];

  if (employerId) {
    conditions.push('j.employerId = ?');
    params.push(parseInt(employerId, 10));
  }
  if (specialty) {
    conditions.push('j.specialty LIKE ?');
    params.push(`%${specialty}%`);
  }
  if (location) {
    conditions.push('j.location LIKE ?');
    params.push(`%${location}%`);
  }
  if (jobType) {
    conditions.push('j.jobType = ?');
    params.push(jobType);
  }
  if (status) {
    conditions.push('j.status = ?');
    params.push(status);
  }
  if (minSalary !== undefined && !isNaN(parseInt(minSalary, 10))) {
    conditions.push('j.salaryMax >= ?');
    params.push(parseInt(minSalary, 10));
  }
  if (maxSalary !== undefined && !isNaN(parseInt(maxSalary, 10))) {
    conditions.push('j.salaryMin <= ?');
    params.push(parseInt(maxSalary, 10));
  }
  if (minExperience !== undefined && !isNaN(parseInt(minExperience, 10))) {
    conditions.push('j.experienceRequired >= ?');
    params.push(parseInt(minExperience, 10));
  }
  if (maxExperience !== undefined && !isNaN(parseInt(maxExperience, 10))) {
    conditions.push('j.experienceRequired <= ?');
    params.push(parseInt(maxExperience, 10));
  }

  const whereClause = conditions.join(' AND ');
  const offset = (pageNum - 1) * limitNum;

  const countSql = `SELECT COUNT(*) as total FROM jobs j WHERE ${whereClause}`;
  
  db.get(countSql, params, (err, countRow) => {
    if (err) {
      console.error('Database error (count):', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    const total = countRow.total;
    const totalPages = Math.ceil(total / limitNum);

    const dataSql = `
      SELECT 
        j.id, j.employerId, j.title, j.specialty, j.location, 
        j.description, j.requirements, j.salaryMin, j.salaryMax, 
        j.jobType, j.experienceRequired, j.status, j.postedAt, j.expiresAt,
        e.name as employerName, e.hospitalType
      FROM jobs j
      LEFT JOIN employers e ON j.employerId = e.id
      WHERE ${whereClause}
      ORDER BY j.${sortColumn} ${order}
      LIMIT ? OFFSET ?
    `;

    db.all(dataSql, [...params, limitNum, offset], (err, rows) => {
      if (err) {
        console.error('Database error (data):', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        data: rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      });
    });
  });
});

/**
 * GET /api/jobs/:id
 * Get single job with employer info
 */
app.get('/api/jobs/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid job ID' });
  }

  const sql = `
    SELECT 
      j.*,
      e.name as employerName, e.description as employerDescription, 
      e.location as employerLocation, e.website as employerWebsite,
      e.hospitalType, e.size
    FROM jobs j
    LEFT JOIN employers e ON j.employerId = e.id
    WHERE j.id = ? AND j.isDeleted = 0
  `;

  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ data: row });
  });
});

/**
 * POST /api/jobs
 * Create new job posting
 */
app.post('/api/jobs', (req, res) => {
  const {
    employerId,
    title,
    specialty,
    location,
    description,
    requirements,
    salaryMin,
    salaryMax,
    jobType,
    experienceRequired,
    expiresAt
  } = req.body;

  const errors = [];
  if (!employerId || isNaN(parseInt(employerId, 10))) {
    errors.push('employerId is required and must be a number');
  }
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push('title is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', errors });
  }

  // Verify employer exists
  db.get('SELECT id FROM employers WHERE id = ? AND isDeleted = 0', [employerId], (err, employer) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!employer) {
      return res.status(404).json({ error: 'Employer not found' });
    }

    const sql = `
      INSERT INTO jobs (employerId, title, specialty, location, description, requirements, salaryMin, salaryMax, jobType, experienceRequired, expiresAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [
      parseInt(employerId, 10),
      title.trim(),
      specialty || null,
      location || null,
      description || null,
      requirements || null,
      salaryMin !== undefined ? parseInt(salaryMin, 10) : null,
      salaryMax !== undefined ? parseInt(salaryMax, 10) : null,
      jobType || null,
      experienceRequired !== undefined ? parseInt(experienceRequired, 10) : null,
      expiresAt || null
    ], function(err) {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      const newId = this.lastID;

      db.get(
        `SELECT j.*, e.name as employerName 
         FROM jobs j 
         LEFT JOIN employers e ON j.employerId = e.id 
         WHERE j.id = ?`,
        [newId],
        (err, row) => {
          if (err || !row) {
            return res.status(201).json({
              message: 'Job created successfully',
              data: { id: newId.toString() }
            });
          }

          res.status(201).json({
            message: 'Job created successfully',
            data: row
          });
        }
      );
    });
  });
});

/**
 * PATCH /api/jobs/:id
 * Update job posting (partial update)
 */
app.patch('/api/jobs/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid job ID' });
  }

  const {
    title,
    specialty,
    location,
    description,
    requirements,
    salaryMin,
    salaryMax,
    jobType,
    experienceRequired,
    status,
    expiresAt
  } = req.body;

  const updates = [];
  const params = [];

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'title cannot be empty' });
    }
    updates.push('title = ?');
    params.push(title.trim());
  }

  if (specialty !== undefined) {
    updates.push('specialty = ?');
    params.push(specialty || null);
  }

  if (location !== undefined) {
    updates.push('location = ?');
    params.push(location || null);
  }

  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description || null);
  }

  if (requirements !== undefined) {
    updates.push('requirements = ?');
    params.push(requirements || null);
  }

  if (salaryMin !== undefined) {
    updates.push('salaryMin = ?');
    params.push(salaryMin !== null ? parseInt(salaryMin, 10) : null);
  }

  if (salaryMax !== undefined) {
    updates.push('salaryMax = ?');
    params.push(salaryMax !== null ? parseInt(salaryMax, 10) : null);
  }

  if (jobType !== undefined) {
    updates.push('jobType = ?');
    params.push(jobType || null);
  }

  if (experienceRequired !== undefined) {
    updates.push('experienceRequired = ?');
    params.push(experienceRequired !== null ? parseInt(experienceRequired, 10) : null);
  }

  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }

  if (expiresAt !== undefined) {
    updates.push('expiresAt = ?');
    params.push(expiresAt || null);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.push('updatedAt = CURRENT_TIMESTAMP');
  params.push(id);

  const sql = `UPDATE jobs SET ${updates.join(', ')} WHERE id = ? AND isDeleted = 0`;

  db.run(sql, params, function(err) {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    db.get(
      `SELECT j.*, e.name as employerName 
       FROM jobs j 
       LEFT JOIN employers e ON j.employerId = e.id 
       WHERE j.id = ?`,
      [id],
      (err, row) => {
        if (err || !row) {
          return res.json({
            message: 'Job updated successfully',
            data: { id: id.toString() }
          });
        }

        res.json({
          message: 'Job updated successfully',
          data: row
        });
      }
    );
  });
});

/**
 * DELETE /api/jobs/:id
 * Soft delete job
 */
app.delete('/api/jobs/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid job ID' });
  }

  const sql = 'UPDATE jobs SET isDeleted = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND isDeleted = 0';

  db.run(sql, [id], function(err) {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      message: 'Job deleted successfully',
      data: { id: id.toString() }
    });
  });
});

// ============ JOB MATCHING ALGORITHM ============

/**
 * Calculate match score between a candidate and a job
 * @param {Object} candidate - Candidate profile
 * @param {Object} job - Job posting
 * @returns {Object} - Match score (0-100) and reasons
 */
function calculateMatchScore(candidate, job) {
  let score = 0;
  const reasons = [];
  const weights = {
    specialty: 40,
    location: 25,
    experience: 20,
    salary: 15
  };

  // Specialty match (highest weight)
  if (candidate.specialty && job.specialty) {
    const candidateSpec = candidate.specialty.toLowerCase().trim();
    const jobSpec = job.specialty.toLowerCase().trim();
    
    if (candidateSpec === jobSpec) {
      score += weights.specialty;
      reasons.push('Specialty is an exact match');
    } else if (candidateSpec.includes(jobSpec) || jobSpec.includes(candidateSpec)) {
      score += weights.specialty * 0.7;
      reasons.push('Specialty is a partial match');
    }
  }

  // Location match
  if (candidate.location && job.location) {
    const candidateLoc = candidate.location.toLowerCase().trim();
    const jobLoc = job.location.toLowerCase().trim();
    
    if (candidateLoc === jobLoc) {
      score += weights.location;
      reasons.push('Location is an exact match');
    } else if (candidateLoc.includes(jobLoc) || jobLoc.includes(candidateLoc)) {
      score += weights.location * 0.6;
      reasons.push('Location is a nearby match');
    }
  }

  // Experience match
  if (candidate.experienceYears !== null && job.experienceRequired !== null) {
    const candidateExp = candidate.experienceYears;
    const requiredExp = job.experienceRequired;
    
    if (candidateExp >= requiredExp) {
      const bonus = Math.min(candidateExp - requiredExp, 5) * 2; // Up to 10 bonus points
      score += weights.experience + bonus;
      reasons.push(`Experience exceeds requirements (${candidateExp} vs ${requiredExp} years)`);
    } else if (candidateExp >= requiredExp - 1) {
      score += weights.experience * 0.8;
      reasons.push('Experience is close to requirements');
    } else if (candidateExp >= requiredExp - 2) {
      score += weights.experience * 0.5;
      reasons.push('Experience is slightly below requirements');
    }
  }

  // Salary match (if candidate has preferences)
  if (candidate.preferences && candidate.preferences.minSalary && job.salaryMax) {
    if (job.salaryMax >= candidate.preferences.minSalary) {
      score += weights.salary;
      reasons.push('Salary meets your minimum requirements');
    } else if (job.salaryMax >= candidate.preferences.minSalary * 0.9) {
      score += weights.salary * 0.5;
      reasons.push('Salary is slightly below your minimum');
    }
  } else if (job.salaryMax) {
    // Some points just for having salary info
    score += weights.salary * 0.3;
  }

  // Cap at 100
  score = Math.min(Math.round(score), 100);

  return {
    score,
    reasons: reasons.length > 0 ? reasons : ['No strong matches found'],
    matchedCriteria: reasons.length
  };
}

/**
 * GET /api/matches
 * Get ranked job matches for a candidate
 * Query params:
 * - candidateId: ID of the candidate to match
 * - minScore: Minimum match score (0-100, default: 0)
 * - limit: Maximum number of matches (default: 20)
 */
app.get('/api/matches', (req, res) => {
  const { candidateId, minScore = 0, limit = 20 } = req.query;

  if (!candidateId || isNaN(parseInt(candidateId, 10))) {
    return res.status(400).json({ error: 'candidateId is required and must be a number' });
  }

  const candidateIdNum = parseInt(candidateId, 10);
  const minScoreNum = Math.max(0, Math.min(parseInt(minScore, 10) || 0, 100));
  const limitNum = Math.min(parseInt(limit, 10) || 20, 100);

  // First, get the candidate
  db.get(
    `SELECT id, email, firstName, lastName, location, specialty, experienceYears, cvUrl, preferences 
     FROM candidates WHERE id = ? AND isDeleted = 0`,
    [candidateIdNum],
    (err, candidate) => {
      if (err) {
        console.error('Database error (candidate):', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      // Parse preferences
      if (candidate.preferences) {
        try {
          candidate.preferences = JSON.parse(candidate.preferences);
        } catch (e) {
          candidate.preferences = null;
        }
      }

      // Get all active jobs
      db.all(
        `SELECT j.*, e.name as employerName, e.hospitalType
         FROM jobs j
         LEFT JOIN employers e ON j.employerId = e.id
         WHERE j.isDeleted = 0 AND j.status = 'active'`,
        [],
        (err, jobs) => {
          if (err) {
            console.error('Database error (jobs):', err.message);
            return res.status(500).json({ error: 'Database error' });
          }

          // Calculate match scores for all jobs
          const matches = jobs.map(job => {
            const matchResult = calculateMatchScore(candidate, job);
            return {
              job: {
                id: job.id,
                employerId: job.employerId,
                employerName: job.employerName,
                hospitalType: job.hospitalType,
                title: job.title,
                specialty: job.specialty,
                location: job.location,
                salaryMin: job.salaryMin,
                salaryMax: job.salaryMax,
                jobType: job.jobType,
                experienceRequired: job.experienceRequired,
                postedAt: job.postedAt
              },
              matchScore: matchResult.score,
              matchReasons: matchResult.reasons,
              matchedCriteria: matchResult.matchedCriteria
            };
          });

          // Filter by minimum score and sort by score (descending)
          const filteredMatches = matches
            .filter(m => m.matchScore >= minScoreNum)
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, limitNum);

          res.json({
            candidate: {
              id: candidate.id,
              firstName: candidate.firstName,
              lastName: candidate.lastName,
              specialty: candidate.specialty,
              location: candidate.location,
              experienceYears: candidate.experienceYears
            },
            matches: filteredMatches,
            totalMatches: filteredMatches.length,
            totalJobsConsidered: jobs.length,
            minScore: minScoreNum
          });
        }
      );
    }
  );
});

// ============ SEED DATA ENDPOINT ============

/**
 * POST /api/seed
 * Seed the database with sample employers and jobs
 * For development/testing only
 */
app.post('/api/seed', (req, res) => {
  const sampleEmployers = [
    { name: 'Charité - Universitätsmedizin Berlin', description: 'Europas größte Universitätsklinik', location: 'Berlin', website: 'https://www.charite.de', hospitalType: 'University Hospital', size: 'Large' },
    { name: 'Universitätsklinikum Heidelberg', description: 'Führendes Universitätsklinikum', location: 'Heidelberg', website: 'https://www.ukhd.de', hospitalType: 'University Hospital', size: 'Large' },
    { name: 'Klinikum München', description: 'Modernes Stadtklinikum', location: 'München', website: 'https://www.klinikum-muenchen.de', hospitalType: 'City Hospital', size: 'Large' },
    { name: 'Universitätsklinikum Hamburg-Eppendorf', description: 'Forschungsstarkes Klinikum', location: 'Hamburg', website: 'https://www.uke.de', hospitalType: 'University Hospital', size: 'Large' },
    { name: 'Klinikum Stuttgart', description: 'Maximalversorger in Baden-Württemberg', location: 'Stuttgart', website: 'https://www.klinikum-stuttgart.de', hospitalType: 'City Hospital', size: 'Large' },
    { name: 'Universitätsklinikum Köln', description: 'Hochspezialisierte Medizin', location: 'Köln', website: 'https://www.uk-koeln.de', hospitalType: 'University Hospital', size: 'Large' },
    { name: 'Klinikum Frankfurt', description: 'Internationales Medizinzentrum', location: 'Frankfurt', website: 'https://www.klinikum-frankfurt.de', hospitalType: 'City Hospital', size: 'Medium' },
    { name: 'Universitätsklinikum Düsseldorf', description: 'Innovative Patientenversorgung', location: 'Düsseldorf', website: 'https://www.uniklinik-duesseldorf.de', hospitalType: 'University Hospital', size: 'Large' },
    { name: 'Klinikum Leipzig', description: 'Traditionsreiches Krankenhaus', location: 'Leipzig', website: 'https://www.klinikum-leipzig.de', hospitalType: 'City Hospital', size: 'Medium' },
    { name: 'Universitätsklinikum Freiburg', description: 'Exzellente Forschung und Lehre', location: 'Freiburg', website: 'https://www.uniklinik-freiburg.de', hospitalType: 'University Hospital', size: 'Large' }
  ];

  const sampleJobs = [
    { title: 'Assistenzarzt Innere Medizin', specialty: 'Innere Medizin', location: 'Berlin', salaryMin: 55000, salaryMax: 65000, jobType: 'full-time', experienceRequired: 0 },
    { title: 'Facharzt Kardiologie', specialty: 'Kardiologie', location: 'Berlin', salaryMin: 75000, salaryMax: 95000, jobType: 'full-time', experienceRequired: 5 },
    { title: 'Assistenzarzt Chirurgie', specialty: 'Chirurgie', location: 'Heidelberg', salaryMin: 52000, salaryMax: 62000, jobType: 'full-time', experienceRequired: 0 },
    { title: 'Facharzt Orthopädie', specialty: 'Orthopädie', location: 'München', salaryMin: 80000, salaryMax: 100000, jobType: 'full-time', experienceRequired: 5 },
    { title: 'Assistenzarzt Pädiatrie', specialty: 'Pädiatrie', location: 'Hamburg', salaryMin: 53000, salaryMax: 63000, jobType: 'full-time', experienceRequired: 0 },
    { title: 'Facharzt Neurologie', specialty: 'Neurologie', location: 'Stuttgart', salaryMin: 78000, salaryMax: 98000, jobType: 'full-time', experienceRequired: 5 },
    { title: 'Assistenzarzt Anästhesiologie', specialty: 'Anästhesiologie', location: 'Köln', salaryMin: 56000, salaryMax: 66000, jobType: 'full-time', experienceRequired: 0 },
    { title: 'Facharzt Dermatologie', specialty: 'Dermatologie', location: 'Frankfurt', salaryMin: 72000, salaryMax: 92000, jobType: 'full-time', experienceRequired: 4 },
    { title: 'Assistenzarzt Gynäkologie', specialty: 'Gynäkologie', location: 'Düsseldorf', salaryMin: 54000, salaryMax: 64000, jobType: 'full-time', experienceRequired: 0 },
    { title: 'Facharzt Radiologie', specialty: 'Radiologie', location: 'Leipzig', salaryMin: 76000, salaryMax: 96000, jobType: 'full-time', experienceRequired: 5 },
    { title: 'Assistenzarzt Psychiatrie', specialty: 'Psychiatrie', location: 'Freiburg', salaryMin: 51000, salaryMax: 61000, jobType: 'full-time', experienceRequired: 0 },
    { title: 'Oberarzt Urologie', specialty: 'Urologie', location: 'Berlin', salaryMin: 85000, salaryMax: 110000, jobType: 'full-time', experienceRequired: 8 },
    { title: 'Assistenzarzt HNO', specialty: 'HNO', location: 'Heidelberg', salaryMin: 55000, salaryMax: 65000, jobType: 'full-time', experienceRequired: 0 },
    { title: 'Facharzt Augenheilkunde', specialty: 'Augenheilkunde', location: 'München', salaryMin: 74000, salaryMax: 94000, jobType: 'full-time', experienceRequired: 5 },
    { title: 'Assistenzarzt Unfallchirurgie', specialty: 'Unfallchirurgie', location: 'Hamburg', salaryMin: 57000, salaryMax: 67000, jobType: 'full-time', experienceRequired: 0 },
    { title: 'Facharzt Gastroenterologie', specialty: 'Gastroenterologie', location: 'Stuttgart', salaryMin: 77000, salaryMax: 97000, jobType: 'full-time', experienceRequired: 5 },
    { title: 'Assistenzarzt Nephrologie', specialty: 'Nephrologie', location: 'Köln', salaryMin: 58000, salaryMax: 68000, jobType: 'full-time', experienceRequired: 0 },
    { title: 'Facharzt Onkologie', specialty: 'Onkologie', location: 'Frankfurt', salaryMin: 82000, salaryMax: 102000, jobType: 'full-time', experienceRequired: 6 },
    { title: 'Assistenzarzt Endokrinologie', specialty: 'Endokrinologie', location: 'Düsseldorf', salaryMin: 56000, salaryMax: 66000, jobType: 'part-time', experienceRequired: 0 },
    { title: 'Leitender Oberarzt Allgemeinchirurgie', specialty: 'Chirurgie', location: 'Leipzig', salaryMin: 95000, salaryMax: 120000, jobType: 'full-time', experienceRequired: 10 }
  ];

  // Insert employers first
  const insertEmployer = db.prepare(`
    INSERT OR IGNORE INTO employers (name, description, location, website, hospitalType, size)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let employerCount = 0;
  sampleEmployers.forEach(emp => {
    insertEmployer.run(emp.name, emp.description, emp.location, emp.website, emp.hospitalType, emp.size, function(err) {
      if (!err && this.changes > 0) employerCount++;
    });
  });
  insertEmployer.finalize();

  // Then insert jobs (need employer IDs)
  setTimeout(() => {
    db.all('SELECT id, name FROM employers WHERE isDeleted = 0', [], (err, employers) => {
      if (err) {
        console.error('Error fetching employers:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      const employerMap = {};
      employers.forEach(e => {
        employerMap[e.name] = e.id;
      });

      const insertJob = db.prepare(`
        INSERT OR IGNORE INTO jobs (employerId, title, specialty, location, description, requirements, salaryMin, salaryMax, jobType, experienceRequired)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let jobCount = 0;
      sampleJobs.forEach((job, index) => {
        // Match job to employer by location (simplified)
        const employerName = sampleEmployers[index % sampleEmployers.length].name;
        const employerId = employerMap[employerName];
        
        if (employerId) {
          insertJob.run(
            employerId,
            job.title,
            job.specialty,
            job.location,
            `Spannende Position in ${job.specialty} am Standort ${job.location}.`,
            `Facharztanerkennung oder Approbation. Erfahrung in ${job.specialty} erforderlich.`,
            job.salaryMin,
            job.salaryMax,
            job.jobType,
            job.experienceRequired,
            function(err) {
              if (!err && this.changes > 0) jobCount++;
            }
          );
        }
      });
      insertJob.finalize();

      res.json({
        message: 'Seed data inserted',
        employersInserted: employerCount,
        jobsInserted: jobCount
      });
    });
  }, 100);
});

// Export for serverless (if needed)
module.exports = { app, calculateMatchScore };

// Start server if run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`MedMatch API running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log('');
    console.log('API Endpoints:');
    console.log('');
    console.log('Signups:');
    console.log('  POST /api/auth/register - Register new candidate');
    console.log('  GET  /api/signups        - List all signups');
    console.log('  GET  /api/signups/count  - Count signups');
    console.log('');
    console.log('Candidates:');
    console.log('  GET    /api/candidates       - List candidates (with filters, pagination)');
    console.log('  GET    /api/candidates/:id   - Get single candidate');
    console.log('  POST   /api/candidates       - Create candidate');
    console.log('  PATCH  /api/candidates/:id   - Update candidate');
    console.log('  DELETE /api/candidates/:id   - Soft delete candidate');
    console.log('');
    console.log('Employers:');
    console.log('  GET    /api/employers        - List employers');
    console.log('  GET    /api/employers/:id    - Get employer with jobs');
    console.log('  POST   /api/employers        - Create employer');
    console.log('  PATCH  /api/employers/:id    - Update employer');
    console.log('');
    console.log('Jobs:');
    console.log('  GET    /api/jobs             - List jobs (with filters, pagination)');
    console.log('  GET    /api/jobs/:id         - Get single job');
    console.log('  POST   /api/jobs             - Create job');
    console.log('  PATCH  /api/jobs/:id         - Update job');
    console.log('  DELETE /api/jobs/:id         - Soft delete job');
    console.log('');
    console.log('Matching:');
    console.log('  GET /api/matches?candidateId=xxx - Get ranked job matches');
    console.log('');
    console.log('Seed Data:');
    console.log('  POST /api/seed - Seed sample employers and jobs');
  });
}
