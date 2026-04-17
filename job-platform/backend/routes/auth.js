const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      userType: user.user_type 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new candidate from the landing page
 * @access  Public
 * 
 * Request Body:
 * {
 *   "email": "string (required)",
 *   "password": "string (required, min 8 chars)",
 *   "graduationYear": "number",
 *   "specialty": "string",
 *   "location": "string"
 * }
 */
router.post('/signup', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('graduationYear')
    .optional()
    .isInt({ min: 1900, max: 2100 })
    .withMessage('Graduation year must be a valid year between 1900 and 2100'),
  body('specialty')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Specialty must be between 1 and 100 characters'),
  body('location')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Location must be between 1 and 200 characters'),
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        error: 'Validation failed',
        details: errors.array().map(e => ({ field: e.path, message: e.msg }))
      });
    }

    const { email, password, graduationYear, specialty, location } = req.body;
    const db = req.app.locals.db;

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        success: false,
        error: 'An account with this email already exists. Please log in instead.'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user with 'graduate' type (for candidates from landing page)
    const userId = uuidv4();
    const userResult = await db.query(
      `INSERT INTO users (id, email, password_hash, user_type, email_verified, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, user_type, email_verified, created_at`,
      [userId, email, passwordHash, 'graduate', false, true]
    );

    const user = userResult.rows[0];

    // Create graduate profile with provided information
    const profileId = uuidv4();
    const locationParts = location ? location.split(',').map(s => s.trim()) : ['', ''];
    const city = locationParts[0] || null;
    const state = locationParts[1] || null;

    await db.query(
      `INSERT INTO graduate_profiles (
        id, user_id, location_city, location_state, graduation_year, 
        is_open_to_work, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [profileId, userId, city, state, graduationYear || null, true]
    );

    // Store specialty if provided (store in profile_summary for now)
    if (specialty) {
      await db.query(
        `UPDATE graduate_profiles 
         SET profile_summary = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [`Interested in: ${specialty}`, profileId]
      );
    }

    // Generate email verification token
    const verificationToken = uuidv4();
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24); // 24 hours expiry

    await db.query(
      `INSERT INTO email_verification_tokens (id, user_id, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), userId, verificationToken, tokenExpiresAt]
    );

    // Send verification email (async - don't wait)
    sendVerificationEmail(email, verificationToken).catch(err => {
      console.error('Failed to send verification email:', err);
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        userType: user.user_type,
        emailVerified: user.email_verified,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      success: false,
      error: 'An error occurred during registration. Please try again later.'
    });
  }
});

/**
 * @route   GET /api/auth/verify-email
 * @desc    Verify email with token
 * @access  Public
 */
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ 
        success: false,
        error: 'Verification token is required' 
      });
    }

    const db = req.app.locals.db;

    // Find valid token
    const tokenResult = await db.query(
      `SELECT evt.*, u.email 
       FROM email_verification_tokens evt
       JOIN users u ON evt.user_id = u.id
       WHERE evt.token = $1 
       AND evt.expires_at > CURRENT_TIMESTAMP
       AND evt.used_at IS NULL`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid or expired verification token' 
      });
    }

    const tokenData = tokenResult.rows[0];

    // Mark token as used
    await db.query(
      'UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [tokenData.id]
    );

    // Mark user as verified
    await db.query(
      'UPDATE users SET email_verified = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [tokenData.user_id]
    );

    res.json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
      email: tokenData.email
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ 
      success: false,
      error: 'An error occurred during email verification' 
    });
  }
});

/**
 * Helper function to send verification email
 * In production, configure with your email service (SendGrid, AWS SES, etc.)
 */
async function sendVerificationEmail(email, token) {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
  
  // Log for development (replace with actual email service in production)
  console.log(`
========================================
📧 VERIFICATION EMAIL (Development Mode)
========================================
To: ${email}
Subject: Verify your MedMatch account

Hello,

Thank you for signing up with MedMatch! Please click the link below to verify your email address:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create this account, you can safely ignore this email.

Best regards,
The MedMatch Team
========================================
  `);

  // TODO: Integrate with email service (SendGrid, AWS SES, Mailgun, etc.)
  // Example with SendGrid:
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // await sgMail.send({
  //   to: email,
  //   from: 'noreply@medmatch.de',
  //   subject: 'Verify your MedMatch account',
  //   html: `<p>Click <a href="${verificationUrl}">here</a> to verify your email.</p>`
  // });
}

// Register new user (existing endpoint for general registration)
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('userType').isIn(['graduate', 'employer']),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, userType, firstName, lastName } = req.body;
    const db = req.app.locals.db;

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const userResult = await db.query(
      `INSERT INTO users (id, email, password_hash, user_type) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, user_type, created_at`,
      [uuidv4(), email, passwordHash, userType]
    );

    const user = userResult.rows[0];

    // Create profile based on user type
    if (userType === 'graduate') {
      await db.query(
        `INSERT INTO graduate_profiles (id, user_id, first_name, last_name) 
         VALUES ($1, $2, $3, $4)`,
        [uuidv4(), user.id, firstName, lastName]
      );
    } else if (userType === 'employer') {
      await db.query(
        `INSERT INTO employer_profiles (id, user_id, company_name, contact_person_name) 
         VALUES ($1, $2, $3, $4)`,
        [uuidv4(), user.id, req.body.companyName || `${firstName} ${lastName}`, `${firstName} ${lastName}`]
      );
    }

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        userType: user.user_type,
        createdAt: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const db = req.app.locals.db;

    // Find user
    const userResult = await db.query(
      'SELECT id, email, password_hash, user_type, is_active FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        userType: user.user_type
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { userId } = req.user;

    const userResult = await db.query(
      'SELECT id, email, user_type, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get profile based on user type
    let profile = null;
    if (user.user_type === 'graduate') {
      const profileResult = await db.query(
        `SELECT gp.*, 
          COALESCE(
            json_agg(
              json_build_object(
                'id', s.id,
                'name', s.name,
                'proficiencyLevel', gs.proficiency_level,
                'yearsExperience', gs.years_experience
              )
            ) FILTER (WHERE s.id IS NOT NULL),
            '[]'
          ) as specializations
         FROM graduate_profiles gp
         LEFT JOIN graduate_specializations gs ON gp.id = gs.graduate_id
         LEFT JOIN specializations s ON gs.specialization_id = s.id
         WHERE gp.user_id = $1
         GROUP BY gp.id`,
        [userId]
      );
      profile = profileResult.rows[0];
    } else if (user.user_type === 'employer') {
      const profileResult = await db.query(
        'SELECT * FROM employer_profiles WHERE user_id = $1',
        [userId]
      );
      profile = profileResult.rows[0];
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        userType: user.user_type,
        createdAt: user.created_at
      },
      profile
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

module.exports = router;
module.exports.authenticateToken = authenticateToken;
