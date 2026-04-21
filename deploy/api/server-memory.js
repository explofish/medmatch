// MedMatch API - In-Memory Version for Serverless Deployment
// This version works without SQLite for platforms without persistent filesystem

const express = require('express');
const cors = require('cors');

const app = express();

// In-memory storage (resets on restart, but works anywhere)
const signups = new Map();
let nextId = 1;

// CORS - Allow all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'medmatch-api',
    storage: 'in-memory'
  });
});

// Signup endpoint
app.post('/api/auth/register', (req, res) => {
  const { email, firstName, lastName, yearOfGraduation, specialization, state } = req.body;
  
  // Validation
  if (!email || !firstName || !lastName) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['email', 'firstName', 'lastName']
    });
  }
  
  // Check for duplicate email
  if (signups.has(email.toLowerCase())) {
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
  
  signups.set(email.toLowerCase(), signup);
  
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
  const allSignups = Array.from(signups.values()).sort((a, b) => b.id - a.id);
  
  res.json({
    count: allSignups.length,
    signups: allSignups
  });
});

// Count signups (lightweight stat)
app.get('/api/signups/count', (req, res) => {
  res.json({ count: signups.size });
});

// Export for serverless
module.exports = app;

// Start server if run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`MedMatch API (in-memory) running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}
