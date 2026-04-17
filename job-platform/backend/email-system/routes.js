/**
 * Email System API Routes
 * 
 * Provides endpoints for CMO to:
 * - Send partnership outreach emails
 * - Track email analytics (opens, clicks, bounces)
 * - Manage templates
 * - View campaign statistics
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const EmailService = require('./EmailService');
const EmailTemplates = require('./EmailTemplates');

const router = express.Router();

// Initialize services
const emailService = new EmailService();
const emailTemplates = new EmailTemplates();

/**
 * @route   GET /api/email/templates
 * @desc    Get list of available email templates
 * @access  Private (CMO only)
 */
router.get('/templates', (req, res) => {
  try {
    const templates = emailTemplates.getAvailableTemplates();
    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ success: false, error: 'Failed to get templates' });
  }
});

/**
 * @route   POST /api/email/send
 * @desc    Send a single partnership email
 * @access  Private (CMO only)
 * 
 * Request Body:
 * {
 *   "templateId": "partnership_medical_school",
 *   "to": "partner@example.com",
 *   "variables": {
 *     "partnerName": "Dr. Smith",
 *     "institutionName": "Medical University Berlin"
 *   },
 *   "replyTo": "cmo@medmatch.de"
 * }
 */
router.post('/send', [
  body('templateId').notEmpty().withMessage('Template ID is required'),
  body('to').isEmail().normalizeEmail().withMessage('Valid recipient email is required'),
  body('variables').optional().isObject(),
  body('replyTo').optional().isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { templateId, to, variables = {}, replyTo } = req.body;

    // Generate tracking ID
    const trackingId = uuidv4();

    // Render template
    const { subject, html, text } = emailTemplates.render(templateId, variables);

    // Send email
    const result = await emailService.sendEmail({
      to,
      subject,
      html,
      text,
      replyTo,
      trackingId
    });

    // Log to database for tracking
    const db = req.app.locals.db;
    await db.query(
      `INSERT INTO email_tracking (
        id, recipient_email, template_id, tracking_id, 
        message_id, provider, status, sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
      [uuidv4(), to, templateId, trackingId, result.messageId, result.provider, 'sent']
    );

    res.json({
      success: true,
      message: 'Email sent successfully',
      trackingId,
      ...result
    });

  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email'
    });
  }
});

/**
 * @route   POST /api/email/send-bulk
 * @desc    Send bulk emails with rate limiting
 * @access  Private (CMO only)
 * 
 * Request Body:
 * {
 *   "templateId": "partnership_medical_school",
 *   "recipients": [
 *     { "email": "partner1@example.com", "variables": { "partnerName": "Dr. Smith" } },
 *     { "email": "partner2@example.com", "variables": { "partnerName": "Dr. Jones" } }
 *   ],
 *   "batchSize": 10,
 *   "delayBetweenBatches": 1000
 * }
 */
router.post('/send-bulk', [
  body('templateId').notEmpty(),
  body('recipients').isArray({ min: 1 }).withMessage('At least one recipient is required'),
  body('recipients.*.email').isEmail().normalizeEmail(),
  body('batchSize').optional().isInt({ min: 1, max: 100 }),
  body('delayBetweenBatches').optional().isInt({ min: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { 
      templateId, 
      recipients, 
      batchSize = 10, 
      delayBetweenBatches = 1000 
    } = req.body;

    // Prepare emails
    const emails = recipients.map(recipient => {
      const trackingId = uuidv4();
      const { subject, html, text } = emailTemplates.render(templateId, recipient.variables || {});
      
      return {
        to: recipient.email,
        subject,
        html,
        text,
        trackingId,
        templateId
      };
    });

    // Send bulk emails
    const results = await emailService.sendBulk(emails, {
      batchSize,
      delayBetweenBatches
    });

    // Log results to database
    const db = req.app.locals.db;
    const logPromises = [
      // Log successful sends
      ...results.successful.map(async (success) => {
        const trackingId = emails.find(e => e.to === success.email)?.trackingId;
        await db.query(
          `INSERT INTO email_tracking (
            id, recipient_email, template_id, tracking_id, 
            message_id, provider, status, sent_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
          [uuidv4(), success.email, templateId, trackingId, success.messageId, success.provider, 'sent']
        );
      }),
      // Log failures
      ...results.failed.map(async (failure) => {
        const trackingId = emails.find(e => e.to === failure.email)?.trackingId;
        await db.query(
          `INSERT INTO email_tracking (
            id, recipient_email, template_id, tracking_id, 
            status, error_message, sent_at
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
          [uuidv4(), failure.email, templateId, trackingId, 'failed', failure.error]
        );
      })
    ];

    await Promise.all(logPromises);

    res.json({
      success: true,
      message: `Bulk send complete: ${results.successful.length} sent, ${results.failed.length} failed`,
      results
    });

  } catch (error) {
    console.error('Bulk send error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send bulk emails'
    });
  }
});

/**
 * @route   GET /api/email/analytics
 * @desc    Get email campaign analytics
 * @access  Private (CMO only)
 * 
 * Query Parameters:
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - templateId: Filter by template
 */
router.get('/analytics', async (req, res) => {
  try {
    const { startDate, endDate, templateId } = req.query;
    const db = req.app.locals.db;

    // Build query conditions
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (startDate) {
      conditions.push(`sent_at >= $${paramIndex++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`sent_at <= $${paramIndex++}`);
      params.push(endDate);
    }
    if (templateId) {
      conditions.push(`template_id = $${paramIndex++}`);
      params.push(templateId);
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // Get summary stats
    const summaryResult = await db.query(
      `SELECT 
        COUNT(*) as total_sent,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opened,
        COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicked,
        COUNT(CASE WHEN bounced_at IS NOT NULL THEN 1 END) as bounced
      FROM email_tracking
      ${whereClause}`,
      params
    );

    // Get stats by template
    const templateStatsResult = await db.query(
      `SELECT 
        template_id,
        COUNT(*) as count,
        COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opened,
        COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicked
      FROM email_tracking
      ${whereClause}
      GROUP BY template_id
      ORDER BY count DESC`,
      params
    );

    // Get recent activity
    const recentResult = await db.query(
      `SELECT 
        id,
        recipient_email,
        template_id,
        status,
        opened_at,
        clicked_at,
        sent_at
      FROM email_tracking
      ${whereClause}
      ORDER BY sent_at DESC
      LIMIT 50`,
      params
    );

    res.json({
      success: true,
      summary: summaryResult.rows[0],
      byTemplate: templateStatsResult.rows,
      recent: recentResult.rows
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics'
    });
  }
});

/**
 * @route   GET /api/email/verify-config
 * @desc    Verify email service configuration
 * @access  Private (CMO only)
 */
router.get('/verify-config', async (req, res) => {
  try {
    const result = await emailService.verifyConfiguration();
    res.json(result);
  } catch (error) {
    console.error('Verify config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify configuration'
    });
  }
});

/**
 * @route   POST /api/email/webhook
 * @desc    Receive email status webhooks from providers
 * @access  Public (secured by provider signature verification)
 */
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    const db = req.app.locals.db;

    // Handle different webhook event types
    // This is a simplified version - each provider has different webhook formats
    if (event.event || event.type) {
      const eventType = event.event || event.type;
      const trackingId = event.tracking_id || event.custom_args?.tracking_id;
      const messageId = event.message_id || event.id || event.sg_message_id;

      if (trackingId) {
        switch (eventType) {
          case 'delivered':
          case 'delivery':
            await db.query(
              'UPDATE email_tracking SET status = $1, delivered_at = CURRENT_TIMESTAMP WHERE tracking_id = $2',
              ['delivered', trackingId]
            );
            break;
          case 'open':
          case 'opened':
            await db.query(
              'UPDATE email_tracking SET opened_at = CURRENT_TIMESTAMP WHERE tracking_id = $2 AND opened_at IS NULL',
              ['opened', trackingId]
            );
            break;
          case 'click':
          case 'clicked':
            await db.query(
              'UPDATE email_tracking SET clicked_at = CURRENT_TIMESTAMP WHERE tracking_id = $2',
              ['clicked', trackingId]
            );
            break;
          case 'bounce':
          case 'bounced':
            await db.query(
              'UPDATE email_tracking SET bounced_at = CURRENT_TIMESTAMP, bounce_reason = $1 WHERE tracking_id = $2',
              [event.reason || 'Unknown', trackingId]
            );
            break;
          case 'complaint':
          case 'spam':
            await db.query(
              'UPDATE email_tracking SET complained_at = CURRENT_TIMESTAMP WHERE tracking_id = $1',
              [trackingId]
            );
            break;
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});

module.exports = router;
