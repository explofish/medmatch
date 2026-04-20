const express = require('express');
const router = express.Router();

// Admin password from environment variable
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';

/**
 * Simple Basic Auth middleware for admin routes
 */
function adminAuth(req, res, next) {
  const auth = req.headers.authorization;
  
  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Dashboard"');
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');
    
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Admin Dashboard"');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    next();
  } catch (error) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Dashboard"');
    return res.status(401).json({ error: 'Invalid authentication' });
  }
}

/**
 * @route   GET /api/admin/signups
 * @desc    Get all signups with filtering and statistics
 * @access  Admin only
 */
router.get('/signups', adminAuth, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { 
      source, 
      startDate, 
      endDate, 
      verified,
      limit = 100,
      offset = 0 
    } = req.query;
    
    // Build query conditions
    const conditions = ['u.user_type = $1'];
    const params = ['graduate'];
    let paramIndex = 2;
    
    if (source) {
      conditions.push(`u.signup_source = $${paramIndex++}`);
      params.push(source);
    }
    
    if (startDate) {
      conditions.push(`u.created_at >= $${paramIndex++}`);
      params.push(startDate);
    }
    
    if (endDate) {
      conditions.push(`u.created_at <= $${paramIndex++}`);
      params.push(endDate);
    }
    
    if (verified !== undefined) {
      conditions.push(`u.email_verified = $${paramIndex++}`);
      params.push(verified === 'true');
    }
    
    const whereClause = conditions.join(' AND ');
    
    // Get signups with profile info
    const signupsQuery = `
      SELECT 
        u.id,
        u.email,
        u.user_type,
        u.email_verified,
        u.signup_source,
        u.created_at as signup_date,
        u.updated_at,
        gp.first_name,
        gp.last_name,
        gp.location_city,
        gp.location_state,
        gp.graduation_year,
        gp.profile_summary,
        gp.is_open_to_work
      FROM users u
      LEFT JOIN graduate_profiles gp ON u.id = gp.user_id
      WHERE ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const signupsResult = await db.query(signupsQuery, params);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      WHERE ${whereClause}
    `;
    const countParams = params.slice(0, -2); // Remove limit and offset
    const countResult = await db.query(countQuery, countParams);
    
    // Get statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_signups,
        COUNT(CASE WHEN email_verified = true THEN 1 END) as verified_count,
        COUNT(CASE WHEN email_verified = false THEN 1 END) as unverified_count,
        COUNT(CASE WHEN signup_source = 'landing_page' THEN 1 END) as landing_page_count,
        COUNT(CASE WHEN signup_source = 'organic' THEN 1 END) as organic_count,
        COUNT(CASE WHEN DATE(u.created_at) = CURRENT_DATE THEN 1 END) as today_count,
        COUNT(CASE WHEN u.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as last_7_days_count,
        COUNT(CASE WHEN u.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as last_30_days_count
      FROM users u
      WHERE u.user_type = 'graduate'
    `;
    
    const statsResult = await db.query(statsQuery);
    
    // Get daily breakdown for last 30 days
    const dailyQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        signup_source
      FROM users
      WHERE user_type = 'graduate'
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at), signup_source
      ORDER BY date DESC
    `;
    
    const dailyResult = await db.query(dailyQuery);
    
    res.json({
      success: true,
      data: {
        signups: signupsResult.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit: parseInt(limit),
          offset: parseInt(offset)
        },
        statistics: statsResult.rows[0],
        dailyBreakdown: dailyResult.rows
      }
    });
    
  } catch (error) {
    console.error('Admin signups error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch signups' 
    });
  }
});

/**
 * @route   GET /api/admin/signups/export
 * @desc    Export signups to CSV
 * @access  Admin only
 */
router.get('/signups/export', adminAuth, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { source, startDate, endDate } = req.query;
    
    // Build query conditions
    const conditions = ['u.user_type = $1'];
    const params = ['graduate'];
    let paramIndex = 2;
    
    if (source) {
      conditions.push(`u.signup_source = $${paramIndex++}`);
      params.push(source);
    }
    
    if (startDate) {
      conditions.push(`u.created_at >= $${paramIndex++}`);
      params.push(startDate);
    }
    
    if (endDate) {
      conditions.push(`u.created_at <= $${paramIndex++}`);
      params.push(endDate);
    }
    
    const whereClause = conditions.join(' AND ');
    
    const query = `
      SELECT 
        u.id,
        u.email,
        u.email_verified,
        u.signup_source,
        u.created_at as signup_date,
        gp.first_name,
        gp.last_name,
        gp.location_city,
        gp.location_state,
        gp.graduation_year,
        gp.profile_summary,
        gp.is_open_to_work
      FROM users u
      LEFT JOIN graduate_profiles gp ON u.id = gp.user_id
      WHERE ${whereClause}
      ORDER BY u.created_at DESC
    `;
    
    const result = await db.query(query, params);
    
    // Generate CSV
    const headers = [
      'ID',
      'Email',
      'First Name',
      'Last Name',
      'Email Verified',
      'Signup Source',
      'Signup Date',
      'Location City',
      'Location State',
      'Graduation Year',
      'Open to Work',
      'Profile Summary'
    ].join(',');
    
    const rows = result.rows.map(row => [
      row.id,
      `"${row.email || ''}"`,
      `"${row.first_name || ''}"`,
      `"${row.last_name || ''}"`,
      row.email_verified ? 'Yes' : 'No',
      row.signup_source || 'organic',
      row.signup_date ? new Date(row.signup_date).toISOString() : '',
      `"${row.location_city || ''}"`,
      `"${row.location_state || ''}"`,
      row.graduation_year || '',
      row.is_open_to_work ? 'Yes' : 'No',
      `"${(row.profile_summary || '').replace(/"/g, '""')}"`
    ].join(','));
    
    const csv = [headers, ...rows].join('\n');
    
    // Set headers for file download
    const filename = `signups_export_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(csv);
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to export signups' 
    });
  }
});

/**
 * @route   GET /api/admin/stats
 * @desc    Get quick statistics
 * @access  Admin only
 */
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const db = req.app.locals.db;
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total_signups,
        COUNT(CASE WHEN email_verified = true THEN 1 END) as verified_count,
        COUNT(CASE WHEN email_verified = false THEN 1 END) as unverified_count,
        COUNT(CASE WHEN signup_source = 'landing_page' THEN 1 END) as landing_page_count,
        COUNT(CASE WHEN signup_source = 'organic' THEN 1 END) as organic_count,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as today_count,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as last_7_days_count,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as last_30_days_count
      FROM users
      WHERE user_type = 'graduate'
    `;
    
    const sourceQuery = `
      SELECT 
        signup_source,
        COUNT(*) as count
      FROM users
      WHERE user_type = 'graduate'
      GROUP BY signup_source
      ORDER BY count DESC
    `;
    
    const [statsResult, sourceResult] = await Promise.all([
      db.query(statsQuery),
      db.query(sourceQuery)
    ]);
    
    res.json({
      success: true,
      data: {
        ...statsResult.rows[0],
        bySource: sourceResult.rows
      }
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch statistics' 
    });
  }
});

module.exports = router;
module.exports.adminAuth = adminAuth;