# MedMatch Email System

Complete email infrastructure for partnership outreach, candidate notifications, and employer communications.

## Features

- **Multi-Provider Support**: SendGrid, AWS SES, Resend, Mailgun, SMTP
- **Template System**: Pre-built templates for partnership outreach
- **Bulk Sending**: Rate-limited bulk email campaigns
- **Analytics**: Open tracking, click tracking, bounce handling
- **Webhook Support**: Real-time status updates from providers

## Quick Start

### 1. Install Dependencies

```bash
cd email-system
npm install
```

### 2. Configure Environment

Add to your `.env` file:

```env
# Email Provider (sendgrid, ses, resend, mailgun, smtp)
EMAIL_PROVIDER=resend

# Resend (recommended)
RESEND_API_KEY=re_xxxxxxxx

# OR SendGrid
SENDGRID_API_KEY=SG.xxxxxxxx

# Sender Configuration
EMAIL_FROM=noreply@medmatch.de
EMAIL_FROM_NAME=MedMatch
EMAIL_RATE_LIMIT=60
```

### 3. Initialize Database

Run the schema file to create email tracking tables:

```bash
# Add email-system/schema.sql content to your database
```

### 4. Test Configuration

```bash
GET /api/email/verify-config
```

## API Endpoints

### Templates
- `GET /api/email/templates` - List available templates

### Sending
- `POST /api/email/send` - Send single email
- `POST /api/email/send-bulk` - Send bulk emails with rate limiting

### Analytics
- `GET /api/email/analytics` - View campaign statistics
- `GET /api/email/analytics?templateId=partnership_medical_school` - Filter by template

### Configuration
- `GET /api/email/verify-config` - Test email configuration

### Webhooks
- `POST /api/email/webhook` - Receive status updates from providers

## Available Templates

| Template ID | Purpose | Variables |
|-------------|---------|-----------|
| `partnership_medical_school` | Medical school outreach | partnerName, institutionName, institutionType, contactRole |
| `partnership_association` | Professional association outreach | partnerName, associationName, memberCount, focusArea |
| `partnership_followup` | Follow-up emails | partnerName, institutionName, previousContactDate |
| `partnership_welcome` | Welcome new partners | partnerName, institutionName, partnerType, loginUrl |
| `employer_outreach` | Hospital/clinic outreach | partnerName, companyName, hiringManagerRole, openPositions |

## Usage Examples

### Send Partnership Email

```bash
POST /api/email/send
{
  "templateId": "partnership_medical_school",
  "to": "careers@charite.de",
  "variables": {
    "partnerName": "Dr. Schmidt",
    "institutionName": "Charité - Universitätsmedizin Berlin",
    "institutionType": "University Hospital",
    "contactRole": "Head of Career Services"
  }
}
```

### Bulk Send

```bash
POST /api/email/send-bulk
{
  "templateId": "partnership_medical_school",
  "recipients": [
    { "email": "a@school.de", "variables": { "partnerName": "Dr. A" } },
    { "email": "b@school.de", "variables": { "partnerName": "Dr. B" } }
  ]
}
```

## Architecture

```
email-system/
├── EmailService.js      # Provider abstraction layer
├── EmailTemplates.js    # Template engine
├── routes.js            # API endpoints
├── schema.sql           # Database tables
├── CMO-GUIDE.md         # User documentation
└── README.md            # This file
```

## Provider Comparison

| Provider | Best For | Pricing | Deliverability |
|----------|----------|---------|----------------|
| **Resend** | Modern apps, dev experience | $0.10/1000 | Excellent |
| **SendGrid** | High volume, enterprise | $0.10/1000 | Excellent |
| **AWS SES** | AWS infrastructure | $0.10/1000 | Good |
| **Mailgun** | Flexibility, EU focus | $0.80/1000 | Good |

## CMO Documentation

See [CMO-GUIDE.md](./CMO-GUIDE.md) for detailed usage instructions.

## Development Mode

Without configuration, the system logs emails to console instead of sending:

```
📧 EMAIL (Development Mode)
========================================
From: MedMatch <noreply@medmatch.de>
To: partner@school.de
Subject: Partnership Opportunity...

[Email content]
========================================
```

## Rate Limiting

Default limits protect domain reputation:
- 60 emails/minute
- 10 emails per batch
- 1 second between batches

Adjust via environment variables or API parameters.

## Security

- API endpoints require authentication
- Webhooks should verify provider signatures
- Rate limiting prevents abuse
- Email content sanitized

## Monitoring

Track these metrics:
- Send rate
- Delivery rate
- Open rate (20-30% target)
- Click rate (3-8% target)
- Bounce rate (<5% target)

## License

MIT - MedMatch Internal Use
