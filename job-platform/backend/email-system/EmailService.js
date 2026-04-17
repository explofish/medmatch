/**
 * Email Service Integration Module
 * 
 * Supports multiple email providers:
 * - SendGrid (recommended for high volume)
 * - AWS SES (cost-effective for AWS infrastructure)
 * - Resend (modern, developer-friendly)
 * - Mailgun (flexible, powerful)
 * - SMTP (fallback)
 * 
 * Environment Variables:
 * - EMAIL_PROVIDER: 'sendgrid' | 'ses' | 'resend' | 'mailgun' | 'smtp'
 * - SENDGRID_API_KEY: SendGrid API key
 * - AWS_REGION: AWS region for SES
 * - RESEND_API_KEY: Resend API key
 * - MAILGUN_API_KEY: Mailgun API key
 * - MAILGUN_DOMAIN: Mailgun domain
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS: SMTP settings
 * - EMAIL_FROM: Default sender email
 * - EMAIL_FROM_NAME: Default sender name
 * - EMAIL_RATE_LIMIT: Max emails per minute (default: 60)
 */

const { Pool } = require('pg');

class EmailService {
  constructor(config = {}) {
    this.provider = config.provider || process.env.EMAIL_PROVIDER || 'resend';
    this.fromEmail = config.fromEmail || process.env.EMAIL_FROM || 'noreply@medmatch.de';
    this.fromName = config.fromName || process.env.EMAIL_FROM_NAME || 'MedMatch';
    this.rateLimit = parseInt(config.rateLimit || process.env.EMAIL_RATE_LIMIT || '60');
    this.sentCount = 0;
    this.lastReset = Date.now();
    
    // Initialize provider
    this.initProvider();
  }

  initProvider() {
    switch (this.provider) {
      case 'sendgrid':
        this.initSendGrid();
        break;
      case 'ses':
        this.initSES();
        break;
      case 'resend':
        this.initResend();
        break;
      case 'mailgun':
        this.initMailgun();
        break;
      case 'smtp':
        this.initSMTP();
        break;
      default:
        // Development mode - log to console
        console.log('Email service running in DEVELOPMENT mode');
        this.provider = 'console';
    }
  }

  initSendGrid() {
    try {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.client = sgMail;
      console.log('✉️  SendGrid email service initialized');
    } catch (error) {
      console.error('Failed to initialize SendGrid:', error.message);
      this.provider = 'console';
    }
  }

  initSES() {
    try {
      const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
      this.client = new SESClient({ 
        region: process.env.AWS_REGION || 'eu-central-1' 
      });
      this.SendEmailCommand = SendEmailCommand;
      console.log('✉️  AWS SES email service initialized');
    } catch (error) {
      console.error('Failed to initialize AWS SES:', error.message);
      this.provider = 'console';
    }
  }

  initResend() {
    try {
      const { Resend } = require('resend');
      this.client = new Resend(process.env.RESEND_API_KEY);
      console.log('✉️  Resend email service initialized');
    } catch (error) {
      console.error('Failed to initialize Resend:', error.message);
      this.provider = 'console';
    }
  }

  initMailgun() {
    try {
      const formData = require('form-data');
      const Mailgun = require('mailgun.js');
      const mailgun = new Mailgun(formData);
      this.client = mailgun.client({
        username: 'api',
        key: process.env.MAILGUN_API_KEY
      });
      this.mailgunDomain = process.env.MAILGUN_DOMAIN;
      console.log('✉️  Mailgun email service initialized');
    } catch (error) {
      console.error('Failed to initialize Mailgun:', error.message);
      this.provider = 'console';
    }
  }

  initSMTP() {
    try {
      const nodemailer = require('nodemailer');
      this.client = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      console.log('✉️  SMTP email service initialized');
    } catch (error) {
      console.error('Failed to initialize SMTP:', error.message);
      this.provider = 'console';
    }
  }

  /**
   * Check rate limit
   */
  checkRateLimit() {
    const now = Date.now();
    const oneMinute = 60 * 1000;
    
    // Reset counter after 1 minute
    if (now - this.lastReset > oneMinute) {
      this.sentCount = 0;
      this.lastReset = now;
    }
    
    if (this.sentCount >= this.rateLimit) {
      const waitTime = Math.ceil((oneMinute - (now - this.lastReset)) / 1000);
      throw new Error(`Rate limit exceeded. Please wait ${waitTime} seconds.`);
    }
  }

  /**
   * Send a single email
   */
  async sendEmail({ to, subject, html, text, from, replyTo, trackingId }) {
    this.checkRateLimit();

    const fromAddress = from || `"${this.fromName}" <${this.fromEmail}>`;
    
    try {
      let result;

      switch (this.provider) {
        case 'sendgrid':
          result = await this.sendWithSendGrid({ to, subject, html, text, from: fromAddress, replyTo });
          break;
        case 'ses':
          result = await this.sendWithSES({ to, subject, html, text, from: fromAddress, replyTo });
          break;
        case 'resend':
          result = await this.sendWithResend({ to, subject, html, text, from: fromAddress, replyTo, trackingId });
          break;
        case 'mailgun':
          result = await this.sendWithMailgun({ to, subject, html, text, from: fromAddress, replyTo });
          break;
        case 'smtp':
          result = await this.sendWithSMTP({ to, subject, html, text, from: fromAddress, replyTo });
          break;
        default:
          result = await this.sendToConsole({ to, subject, html, text, from: fromAddress });
      }

      this.sentCount++;
      
      return {
        success: true,
        messageId: result.messageId || result.id || 'dev-mode',
        provider: this.provider,
        trackingId
      };
    } catch (error) {
      console.error('Email send failed:', error);
      throw error;
    }
  }

  async sendWithSendGrid({ to, subject, html, text, from, replyTo }) {
    const msg = {
      to,
      from,
      subject,
      html,
      text,
      ...(replyTo && { replyTo })
    };
    
    const response = await this.client.send(msg);
    return { messageId: response[0]?.headers['x-message-id'] };
  }

  async sendWithSES({ to, subject, html, text, from, replyTo }) {
    const params = {
      Source: from,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: text, Charset: 'UTF-8' },
          Html: { Data: html, Charset: 'UTF-8' }
        }
      },
      ...(replyTo && { ReplyToAddresses: [replyTo] })
    };

    const command = new this.SendEmailCommand(params);
    const response = await this.client.send(command);
    return { messageId: response.MessageId };
  }

  async sendWithResend({ to, subject, html, text, from, replyTo, trackingId }) {
    const options = {
      from,
      to,
      subject,
      html,
      ...(text && { text }),
      ...(replyTo && { reply_to: replyTo }),
      ...(trackingId && { 
        tags: [{ name: 'tracking_id', value: trackingId }] 
      })
    };

    const result = await this.client.emails.send(options);
    return { id: result.id };
  }

  async sendWithMailgun({ to, subject, html, text, from, replyTo }) {
    const messageData = {
      from,
      to,
      subject,
      html,
      ...(text && { text }),
      ...(replyTo && { 'h:Reply-To': replyTo })
    };

    const result = await this.client.messages.create(this.mailgunDomain, messageData);
    return { messageId: result.id };
  }

  async sendWithSMTP({ to, subject, html, text, from, replyTo }) {
    const result = await this.client.sendMail({
      from,
      to,
      subject,
      html,
      text,
      ...(replyTo && { replyTo })
    });
    return { messageId: result.messageId };
  }

  async sendToConsole({ to, subject, html, text, from }) {
    console.log(`
========================================
📧 EMAIL (Development Mode)
========================================
From: ${from}
To: ${to}
Subject: ${subject}

${text || html}
========================================
    `);
    return { messageId: `dev-${Date.now()}` };
  }

  /**
   * Send bulk emails with rate limiting
   */
  async sendBulk(emails, options = {}) {
    const results = {
      successful: [],
      failed: [],
      total: emails.length
    };

    const batchSize = options.batchSize || 10;
    const delayBetweenBatches = options.delayBetweenBatches || 1000;

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (email) => {
        try {
          const result = await this.sendEmail(email);
          results.successful.push({ email: email.to, ...result });
        } catch (error) {
          results.failed.push({ email: email.to, error: error.message });
        }
      });

      await Promise.all(batchPromises);

      // Delay between batches if not the last batch
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    return results;
  }

  /**
   * Verify email configuration
   */
  async verifyConfiguration() {
    try {
      // Send a test email to verify configuration
      const testResult = await this.sendEmail({
        to: this.fromEmail,
        subject: 'Email Configuration Test',
        text: 'This is a test email to verify your email configuration is working.',
        html: '<p>This is a test email to verify your email configuration is working.</p>'
      });

      return {
        success: true,
        provider: this.provider,
        messageId: testResult.messageId,
        message: 'Email configuration verified successfully'
      };
    } catch (error) {
      return {
        success: false,
        provider: this.provider,
        error: error.message,
        message: 'Email configuration verification failed'
      };
    }
  }
}

module.exports = EmailService;
