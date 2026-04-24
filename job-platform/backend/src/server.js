const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('./middleware/compression');
const { requestLogger, responseTime } = require('./middleware/logging');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const cache = require('./utils/cache');

// Import routes
const employerRoutes = require('./routes/employers');
const jobRoutes = require('./routes/jobs');
const matchRoutes = require('./routes/matches');
const candidateRoutes = require('./routes/candidates');
const applicationRoutes = require('./routes/applications');
const dashboardRoutes = require('./routes/dashboard');
const notificationRoutes = require('./routes/notifications');

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Response compression
app.use(compression);

// Request/response logging
app.use(requestLogger);
app.use(responseTime);

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Database setup (SQLite)
const sqlite3 = require('sqlite3').verbose();
const DATA_DIR = path.join(__dirname, '..', '.data');
const DB_PATH = path.join(DATA_DIR, 'medmatch.db');

// Ensure data directory exists
if (!require('fs').existsSync(DATA_DIR)) {
  require('fs').mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database at', DB_PATH);
    initDatabase();
  }
});

// Create tables and indexes
function initDatabase() {
  db.serialize(() => {
    // Employers table
    db.run(`
      CREATE TABLE IF NOT EXISTS employers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        location TEXT NOT NULL,
        description TEXT,
        website TEXT,
        size TEXT,
        contactEmail TEXT,
        contactPhone TEXT,
        isVerified INTEGER DEFAULT 0,
        isDeleted INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Jobs table
    db.run(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employerId INTEGER NOT NULL,
        title TEXT NOT NULL,
        specialty TEXT NOT NULL,
        location TEXT NOT NULL,
        description TEXT,
        requirements TEXT,
        salaryMin INTEGER,
        salaryMax INTEGER,
        jobType TEXT NOT NULL,
        experienceRequired INTEGER DEFAULT 0,
        postedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        expiresAt DATETIME,
        status TEXT DEFAULT 'active',
        isDeleted INTEGER DEFAULT 0,
        FOREIGN KEY (employerId) REFERENCES employers(id)
      )
    `);

    // Candidates table
    db.run(`
      CREATE TABLE IF NOT EXISTS candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        location TEXT,
        specialty TEXT,
        experienceYears INTEGER DEFAULT 0,
        desiredSalaryMin INTEGER,
        desiredSalaryMax INTEGER,
        preferredJobType TEXT,
        preferredLocations TEXT,
        skills TEXT,
        cvUrl TEXT,
        portfolioUrl TEXT,
        isDeleted INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Applications table (expanded schema)
    db.run(`
      CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidateId INTEGER NOT NULL,
        jobId INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        coverLetter TEXT,
        cvUrl TEXT,
        matchScore INTEGER,
        notes TEXT,
        isDeleted INTEGER DEFAULT 0,
        appliedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (candidateId) REFERENCES candidates(id),
        FOREIGN KEY (jobId) REFERENCES jobs(id)
      )
    `);

    // Notifications table
    db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userType TEXT NOT NULL,
        userId INTEGER NOT NULL,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        read INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create performance indexes
    console.log('Creating database indexes for performance...');

    // Jobs indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_jobs_employer_id ON jobs(employerId)', (err) => {
      if (!err) {console.log('  ✓ Index: idx_jobs_employer_id');}
    });
    db.run('CREATE INDEX IF NOT EXISTS idx_jobs_specialty ON jobs(specialty)', (err) => {
      if (!err) {console.log('  ✓ Index: idx_jobs_specialty');}
    });
    db.run('CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location)', (err) => {
      if (!err) {console.log('  ✓ Index: idx_jobs_location');}
    });
    db.run('CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)', (err) => {
      if (!err) {console.log('  ✓ Index: idx_jobs_status');}
    });
    db.run('CREATE INDEX IF NOT EXISTS idx_jobs_is_deleted ON jobs(isDeleted)', (err) => {
      if (!err) {console.log('  ✓ Index: idx_jobs_is_deleted');}
    });
    db.run('CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs(postedAt DESC)', (err) => {
      if (!err) {console.log('  ✓ Index: idx_jobs_posted_at');}
    });
    db.run('CREATE INDEX IF NOT EXISTS idx_jobs_composite_active ON jobs(isDeleted, status, postedAt DESC)', (err) => {
      if (!err) {console.log('  ✓ Index: idx_jobs_composite_active');}
    });

    // Candidates indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_candidates_specialty ON candidates(specialty)', (err) => {
      if (!err) {console.log('  ✓ Index: idx_candidates_specialty');}
    });
    db.run('CREATE INDEX IF NOT EXISTS idx_candidates_location ON candidates(location)', (err) => {
      if (!err) {console.log('  ✓ Index: idx_candidates_location');}
    });
    db.run('CREATE INDEX IF NOT EXISTS idx_candidates_is_deleted ON candidates(isDeleted)', (err) => {
      if (!err) {console.log('  ✓ Index: idx_candidates_is_deleted');}
    });
    db.run('CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email)', (err) => {
      if (!err) {console.log('  ✓ Index: idx_candidates_email');}
    });

    // Applications indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidateId)', (err) => {
      if (!err) {console.log('  ✓ Index: idx_applications_candidate_id');}
    });
    db.run('CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(jobId)', (err) => {
      if (!err) {console.log('  ✓ Index: idx_applications_job_id');}
    });
    db.run('CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status)', (err) => {
      if (!err) {console.log('  ✓ Index: idx_applications_status');}
    });
    db.run('CREATE INDEX IF NOT EXISTS idx_applications_is_deleted ON applications(isDeleted)', (err) => {
      if (!err) {console.log('  ✓ Index: idx_applications_is_deleted');}
    });
    db.run('CREATE INDEX IF NOT EXISTS idx_applications_composite ON applications(candidateId, jobId, isDeleted)', (err) => {
      if (!err) {console.log('  ✓ Index: idx_applications_composite');}
    });

    // Employers indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_employers_location ON employers(location)', (err) => {
      if (!err) {console.log('  ✓ Index: idx_employers_location');}
    });
    db.run('CREATE INDEX IF NOT EXISTS idx_employers_is_deleted ON employers(isDeleted)', (err) => {
      if (!err) {console.log('  ✓ Index: idx_employers_is_deleted');}
    });

    // Notifications indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userType, userId, read)', (err) => {
      if (!err) {console.log('  ✓ Index: idx_notifications_user');}
    });
    db.run('CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(createdAt DESC)', (err) => {
      if (!err) {console.log('  ✓ Index: idx_notifications_created');}
    });

    // Run migrations if needed
    runMigrations();
  });
}

// Database migrations
function runMigrations() {
  // Migrate: Add portfolioUrl column if not exists (for existing databases)
  db.all('PRAGMA table_info(candidates)', [], (err, columns) => {
    if (!err && columns) {
      const hasPortfolioUrl = columns.some(col => col.name === 'portfolioUrl');
      if (!hasPortfolioUrl) {
        db.run('ALTER TABLE candidates ADD COLUMN portfolioUrl TEXT', [], (err) => {
          if (err) {
            console.log('Note: portfolioUrl column may already exist or error:', err.message);
          } else {
            console.log('Migrated: Added portfolioUrl column to candidates');
          }
        });
      }
    }
  });

  // Migrate: Add new columns to applications if not exists
  db.all('PRAGMA table_info(applications)', [], (err, columns) => {
    if (!err && columns) {
      const columnNames = columns.map(col => col.name);
      const migrations = [
        { col: 'coverLetter', sql: 'ALTER TABLE applications ADD COLUMN coverLetter TEXT' },
        { col: 'cvUrl', sql: 'ALTER TABLE applications ADD COLUMN cvUrl TEXT' },
        { col: 'notes', sql: 'ALTER TABLE applications ADD COLUMN notes TEXT' },
        { col: 'isDeleted', sql: 'ALTER TABLE applications ADD COLUMN isDeleted INTEGER DEFAULT 0' },
        { col: 'updatedAt', sql: 'ALTER TABLE applications ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP' }
      ];
      migrations.forEach(({ col, sql }) => {
        if (!columnNames.includes(col)) {
          db.run(sql, [], (err) => {
            if (err) {
              console.log(`Note: ${col} column may already exist or error:`, err.message);
            } else {
              console.log(`Migrated: Added ${col} column to applications`);
            }
          });
        }
      });
    }
  });

  console.log('Database initialized successfully');
}

// Make db and cache available to routes
app.locals.db = db;
app.locals.cache = cache;

// Health check with cache stats
app.get('/api/health', (req, res) => {
  const cacheStats = cache.getStats();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'medmatch-job-platform',
    cache: cacheStats,
    version: '1.1.0'
  });
});

// Clear cache endpoint (for testing/admin)
app.post('/api/admin/clear-cache', (req, res) => {
  cache.clear();
  res.json({ message: 'Cache cleared successfully' });
});

// API Routes
app.use('/api/employers', employerRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log('\n========================================');
    console.log('MedMatch Job Platform API v1.1.0');
    console.log(`Running on port ${PORT}`);
    console.log('========================================\n');
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log('\nAPI Endpoints:');
    console.log('');
    console.log('Employers:');
    console.log('  GET    /api/employers                 - List employers');
    console.log('  GET    /api/employers/:id             - Get employer profile');
    console.log('  POST   /api/employers                 - Create employer');
    console.log('  PATCH  /api/employers/:id             - Update employer');
    console.log('');
    console.log('Jobs:');
    console.log('  GET    /api/jobs                      - List jobs (with filters)');
    console.log('  POST   /api/jobs                      - Create job posting');
    console.log('  PATCH  /api/jobs/:id                  - Update job');
    console.log('  DELETE /api/jobs/:id                  - Soft delete job');
    console.log('  GET    /api/jobs/:id/applications     - Get applications for job');
    console.log('');
    console.log('Matching:');
    console.log('  GET    /api/matches?candidateId=xxx   - Get job matches for candidate');
    console.log('');
    console.log('Candidates:');
    console.log('  GET    /api/candidates                - List candidates');
    console.log('  GET    /api/candidates/:id            - Get candidate profile');
    console.log('  POST   /api/candidates                - Create candidate');
    console.log('  PATCH  /api/candidates/:id            - Update candidate');
    console.log('  GET    /api/candidates/:id/applications - Get candidate applications');
    console.log('');
    console.log('Applications:');
    console.log('  GET    /api/applications              - List applications');
    console.log('  GET    /api/applications/:id          - Get application details');
    console.log('  POST   /api/applications              - Submit application');
    console.log('  PATCH  /api/applications/:id          - Update application status');
    console.log('  DELETE /api/applications/:id          - Withdraw application');
    console.log('');
    console.log('Dashboard:');
    console.log('  GET    /api/dashboard/employer/:id    - Employer dashboard stats');
    console.log('  GET    /api/dashboard/candidate/:id   - Candidate dashboard stats');
    console.log('  GET    /api/dashboard/admin           - System-wide admin stats');
    console.log('');
    console.log('Notifications:');
    console.log('  GET    /api/notifications             - List notifications');
    console.log('  PATCH  /api/notifications/:id/read    - Mark notification as read');
    console.log('');
    console.log('Admin:');
    console.log('  POST   /api/admin/clear-cache         - Clear query cache');
    console.log('');
    console.log('Run: npm run seed  to populate sample data');
    console.log('');
  });
}

module.exports = app;
