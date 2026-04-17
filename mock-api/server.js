// Simple mock API for staging demonstration
// This simulates the backend API for CMO preview purposes

const express = require('express');
const cors = require('cors');
const app = express();

// In-memory storage for staging demo
const signups = [];

app.use(cors({
  origin: ['https://explofish.github.io', 'http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mock signup endpoint
app.post('/api/auth/register', (req, res) => {
  const { email, firstName, lastName, yearOfGraduation, specialization, state } = req.body;
  
  // Simple validation
  if (!email || !firstName || !lastName) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['email', 'firstName', 'lastName']
    });
  }
  
  // Check if already registered
  if (signups.find(s => s.email === email)) {
    return res.status(409).json({ 
      error: 'Email already registered',
      message: 'This email is already on the waitlist'
    });
  }
  
  // Store signup
  const signup = {
    id: Date.now().toString(),
    email,
    firstName,
    lastName,
    yearOfGraduation: yearOfGraduation || null,
    specialization: specialization || null,
    state: state || null,
    createdAt: new Date().toISOString()
  };
  
  signups.push(signup);
  
  console.log('New signup:', signup);
  
  // Return success
  res.status(201).json({
    success: true,
    message: 'Successfully joined the waitlist!',
    data: {
      id: signup.id,
      email: signup.email,
      firstName: signup.firstName
    }
  });
});

// Get all signups (for admin/demo purposes)
app.get('/api/signups', (req, res) => {
  res.json({
    count: signups.length,
    signups: signups
  });
});

// Export for serverless
module.exports = app;

// Start server if run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Mock API server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}
