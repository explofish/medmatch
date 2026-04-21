// MedMatch API - GitHub Gist Backend
// Uses GitHub Gist as a database for persistent storage
// Can be deployed to Vercel, Netlify, or any serverless platform

const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();

// GitHub Gist configuration
const GIST_ID = process.env.GIST_ID || '';
const GH_TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
const GIST_FILENAME = 'medmatch-signups.json';

// In-memory cache (resets on restart, but data persists in Gist)
let signupsCache = new Map();
let nextId = 1;
let cacheLoaded = false;

// CORS - Allow all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Load data from Gist on startup
async function loadFromGist() {
  if (!GIST_ID || !GH_TOKEN) {
    console.log('Gist not configured, using in-memory only');
    return;
  }
  
  try {
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      headers: {
        'Authorization': `token ${GH_TOKEN}`,
        'User-Agent': 'MedMatch-API'
      }
    });
    
    if (response.ok) {
      const gist = await response.json();
      const content = gist.files[GIST_FILENAME]?.content || '{}';
      const data = JSON.parse(content);
      
      if (data.signups) {
        signupsCache = new Map(Object.entries(data.signups));
        nextId = data.nextId || 1;
        cacheLoaded = true;
        console.log(`Loaded ${signupsCache.size} signups from Gist`);
      }
    }
  } catch (err) {
    console.error('Failed to load from Gist:', err.message);
  }
}

// Save data to Gist
async function saveToGist() {
  if (!GIST_ID || !GH_TOKEN) return;
  
  try {
    const data = {
      signups: Object.fromEntries(signupsCache),
      nextId: nextId,
      updatedAt: new Date().toISOString()
    };
    
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${GH_TOKEN}`,
        'User-Agent': 'MedMatch-API',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify(data, null, 2)
          }
        }
      })
    });
    
    if (response.ok) {
      console.log('Saved to Gist successfully');
    }
  } catch (err) {
    console.error('Failed to save to Gist:', err.message);
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'medmatch-api',
    storage: GIST_ID ? 'gist' : 'in-memory',
    cacheLoaded: cacheLoaded,
    signupsCount: signupsCache.size
  });
});

// Signup endpoint
app.post('/api/auth/register', async (req, res) => {
  const { email, firstName, lastName, yearOfGraduation, specialization, state } = req.body;
  
  // Validation
  if (!email || !firstName || !lastName) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['email', 'firstName', 'lastName']
    });
  }
  
  // Check for duplicate email
  if (signupsCache.has(email.toLowerCase())) {
    return res.status(409).json({ 
      error: 'Email already registered',
      message: 'This email is already on the waitlist'
    });
  }
  
  // Create signup record
  const id = nextId++;
  const signup = {
    id,
    email: email.toLowerCase(),
    firstName,
    lastName,
    yearOfGraduation: yearOfGraduation || null,
    specialization: specialization || null,
    state: state || null,
    createdAt: new Date().toISOString()
  };
  
  signupsCache.set(email.toLowerCase(), signup);
  
  // Persist to Gist if configured
  if (GIST_ID && GH_TOKEN) {
    await saveToGist();
  }
  
  console.log('New signup:', { id, email, firstName });
  
  res.status(201).json({
    success: true,
    message: 'Successfully joined the waitlist!',
    data: {
      id: id.toString(),
      email,
      firstName
    }
  });
});

// Get all signups (admin)
app.get('/api/signups', (req, res) => {
  const allSignups = Array.from(signupsCache.values()).sort((a, b) => b.id - a.id);
  
  res.json({
    count: allSignups.length,
    signups: allSignups
  });
});

// Count signups (lightweight stat)
app.get('/api/signups/count', (req, res) => {
  res.json({ count: signupsCache.size });
});

// Export for serverless
module.exports = app;

// Start server if run directly
if (require.main === module) {
  // Load from Gist first
  loadFromGist().then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`MedMatch API (GitHub Gist) running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log(`Storage: ${GIST_ID ? 'GitHub Gist' : 'in-memory'}`);
    });
  });
}
