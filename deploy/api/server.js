// MedMatch API with SQLite persistence
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const DATA_DIR = path.join(__dirname, '.data');
const DB_PATH = path.join(DATA_DIR, 'medmatch.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database at', DB_PATH);
    initDatabase();
  }
});

function initDatabase() {
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
    if (err) {
      console.error('Error creating table:', err.message);
    } else {
      console.log('Database initialized');
    }
  });
}

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'medmatch-api'
  });
});

app.post('/api/auth/register', (req, res) => {
  const { email, firstName, lastName, yearOfGraduation, specialization, state } = req.body;
  
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

app.get('/api/signups', (req, res) => {
  db.all('SELECT * FROM signups ORDER BY createdAt DESC', [], (err, rows) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ count: rows.length, signups: rows });
  });
});

app.get('/api/signups/count', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM signups', [], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ count: row.count });
  });
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`MedMatch API running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}
