// MedMatch API with SQLite persistence for Glitch hosting
// Data persists across container restarts via Glitch's persistent filesystem

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();

// Use .data folder for SQLite (persistent on Glitch)
const DATA_DIR = path.join(__dirname, '.data');
const DB_PATH = path.join(DATA_DIR, 'medmatch.db');

// Ensure .data directory exists (for local testing)
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

// Create table if not exists
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

// CORS - Configurable origins for security
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',')
  : (process.env.NODE_ENV === 'production' 
      ? []  // Empty array = no origins allowed by default in production
      : ['*']); // Allow all in development

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // In development or if wildcard is allowed
    if (allowedOrigins.includes('*')) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'medmatch-api'
  });
});

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

// Export for serverless (if needed)
module.exports = app;

// Start server if run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`MedMatch API running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`API Docs:`);
    console.log(`  POST /api/auth/register - Register new candidate`);
    console.log(`  GET  /api/signups - List all signups`);
    console.log(`  GET  /api/signups/count - Count signups`);
  });
}
