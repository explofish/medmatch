# Email System Guide for CMO

This guide explains how to use the MedMatch email system for partnership outreach to medical schools, professional associations, and employers.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Available Templates](#available-templates)
3. [Sending Emails](#sending-emails)
4. [Personalization Variables](#personalization-variables)
5. [Tracking & Analytics](#tracking--analytics)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Quick Start

### 1. Verify Configuration

Before sending emails, verify the email service is configured:

```bash
GET /api/email/verify-config
```

### 2. View Available Templates

```bash
GET /api/email/templates
```

### 3. Send Your First Email

```bash
POST /api/email/send
{
  "templateId": "partnership_medical_school",
  "to": "partner@medicalschool.de",
  "variables": {
    "partnerName": "Dr. Schmidt",
    "institutionName": "Charité - Universitätsmedizin Berlin",
    "institutionType": "Medical School",
    "contactRole": "Career Services Director"
  }
}
```

## Available Templates

### 1. `partnership_medical_school`
**Purpose:** Initial outreach to medical schools

**Best for:** Career services directors, deans, partnership managers

**Variables:**
- `partnerName` - Name of the contact person
- `institutionName` - Full name of the medical school
- `institutionType` - "Medical School", "University", etc.
- `contactRole` - Their job title
- `customMessage` - Optional additional message

### 2. `partnership_association`
**Purpose:** Outreach to professional associations

**Best for:** Association directors, member services managers

**Variables:**
- `partnerName` - Contact person's name
- `associationName` - Name of the association
- `memberCount` - Number of members (e.g., "5,000 members")
- `focusArea` - Focus of the association (e.g., "young physicians")
- `customMessage` - Optional additional message

### 3. `partnership_followup`
**Purpose:** Follow-up after initial contact

**Best for:** Contacts who haven't responded to first email

**Variables:**
- `partnerName` - Contact person's name
- `institutionName` - Institution name
- `previousContactDate` - When you first contacted them
- `customMessage` - Optional additional message

### 4. `partnership_welcome`
**Purpose:** Welcome new partners who have agreed to collaborate

**Best for:** Newly signed partners

**Variables:**
- `partnerName` - Contact person's name
- `institutionName` - Institution name
- `partnerType` - Type of partner (e.g., "Medical School")
- `loginUrl` - Link to partner dashboard
- `customMessage` - Optional welcome message

### 5. `employer_outreach`
**Purpose:** Outreach to hospitals and clinics

**Best for:** HR directors, hiring managers, medical directors

**Variables:**
- `partnerName` - Contact person's name
- `companyName` - Hospital/clinic name
- `hiringManagerRole` - Their title (e.g., "HR Director")
- `openPositions` - Type of positions (e.g., "physician positions")
- `customMessage` - Optional additional message

## Sending Emails

### Single Email

Send to one recipient at a time:

```bash
POST /api/email/send
{
  "templateId": "partnership_medical_school",
  "to": "careers@medschool.de",
  "variables": {
    "partnerName": "Dr. Müller",
    "institutionName": "Heidelberg University Hospital",
    "institutionType": "University Hospital",
    "contactRole": "Head of Career Services"
  },
  "replyTo": "your-email@medmatch.de"
}
```

### Bulk Email Campaign

Send to multiple recipients (rate-limited to protect domain reputation):

```bash
POST /api/email/send-bulk
{
  "templateId": "partnership_medical_school",
  "recipients": [
    {
      "email": "partner1@school.de",
      "variables": {
        "partnerName": "Dr. Schmidt",
        "institutionName": "Humboldt Medical School"
      }
    },
    {
      "email": "partner2@school.de",
      "variables": {
        "partnerName": "Dr. Weber",
        "institutionName": "LMU Munich"
      }
    }
  ],
  "batchSize": 10,
  "delayBetweenBatches": 1000
}
```

**Rate Limiting:**
- Default: 60 emails per minute
- Batch size: 10 emails per batch
- Delay between batches: 1 second

Adjust these based on your email provider's recommendations.

## Personalization Variables

All templates support these common variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `partnerName` | Recipient's name | "Dr. Schmidt" |
| `institutionName` | Organization name | "Charité Berlin" |
| `customMessage` | Additional text | "We met at the conference..." |

Template-specific variables are listed in the [Available Templates](#available-templates) section.

### Tips for Personalization

1. **Research before sending** - Look up the correct contact name and title
2. **Reference specific details** - Mention their institution's specialties
3. **Use customMessage** - Add context like "We met at the Düsseldorf conference"
4. **Keep it professional** - Medical institutions value formal communication

## Tracking & Analytics

### View Campaign Statistics

```bash
GET /api/email/analytics
```

Optional query parameters:
- `startDate` - Start date (ISO format)
- `endDate` - End date (ISO format)
- `templateId` - Filter by specific template

Example:
```bash
GET /api/email/analytics?startDate=2024-01-01&endDate=2024-12-31&templateId=partnership_medical_school
```

### Response Format

```json
{
  "success": true,
  "summary": {
    "total_sent": "150",
    "successful": "145",
    "failed": "5",
    "opened": "45",
    "clicked": "12",
    "bounced": "3"
  },
  "byTemplate": [
    {
      "template_id": "partnership_medical_school",
      "count": "100",
      "opened": "30",
      "clicked": "8"
    }
  ],
  "recent": [
    {
      "id": "uuid",
      "recipient_email": "partner@school.de",
      "template_id": "partnership_medical_school",
      "status": "sent",
      "opened_at": "2024-01-15T10:30:00Z",
      "clicked_at": null,
      "sent_at": "2024-01-15T09:00:00Z"
    }
  ]
}
```

### Understanding Metrics

| Metric | Description | Good Rate |
|--------|-------------|-----------|
| Open Rate | % of emails opened | 20-30% |
| Click Rate | % who clicked links | 3-8% |
| Bounce Rate | % that failed to deliver | <5% |
| Response Rate | % who reply | 5-15% |

## Best Practices

### 1. Email Deliverability

- **Warm up gradually** - Start with 20-30 emails/day, increase over 2 weeks
- **Clean your list** - Verify email addresses before sending
- **Avoid spam triggers** - Don't use ALL CAPS, excessive exclamation marks!!!
- **Use professional subject lines** - Be clear and relevant

### 2. Timing

- **Best days:** Tuesday-Thursday
- **Best times:** 10:00-11:00 AM or 2:00-3:00 PM
- **Avoid:** Mondays, Fridays, weekends, holidays

### 3. Follow-up Strategy

1. **Day 0:** Initial outreach email
2. **Day 7:** Follow-up if no response (use `partnership_followup` template)
3. **Day 21:** Final follow-up
4. **Day 90:** Re-engage with new angle

### 4. List Management

- Segment by institution type (medical schools vs associations vs employers)
- Track responses and update status
- Remove bounced emails immediately
- Respect unsubscribe requests

### 5. Content Guidelines

**Do:**
- Personalize with specific institution details
- Mention mutual connections or events
- Keep emails concise (150-250 words)
- Include a clear call-to-action

**Don't:**
- Send generic mass emails
- Use pushy sales language
- Include too many links
- Forget to proofread

## Troubleshooting

### Emails Not Sending

1. Check configuration:
   ```bash
   GET /api/email/verify-config
   ```

2. Verify environment variables are set:
   - `EMAIL_PROVIDER`
   - API key for your provider (e.g., `RESEND_API_KEY`)
   - `EMAIL_FROM`

### High Bounce Rate

- Clean your email list
- Verify email addresses before adding
- Check for typos in domain names

### Low Open Rates

- Improve subject lines
- Check if emails are landing in spam
- Verify sender reputation
- Adjust send times

### Rate Limit Errors

The system automatically rate-limits to protect your domain reputation. If you hit limits:
- Wait a minute and retry
- Reduce batch size
- Increase delay between batches

## Email Provider Setup

### Recommended: Resend

1. Sign up at [resend.com](https://resend.com)
2. Add and verify your domain
3. Generate API key
4. Set environment variable: `RESEND_API_KEY=your_key`
5. Set `EMAIL_PROVIDER=resend`

### Alternative: SendGrid

1. Create account at [sendgrid.com](https://sendgrid.com)
2. Complete sender verification
3. Generate API key with "Mail Send" permissions
4. Set `SENDGRID_API_KEY=your_key`
5. Set `EMAIL_PROVIDER=sendgrid`

### Domain Authentication

For production use, configure these DNS records:

- **SPF Record:** Authorizes sending servers
- **DKIM:** Email signing for authentication
- **DMARC:** Policy for handling authentication failures

Your email provider will give you specific DNS records to add.

## Support

For technical issues or questions:
- Slack: #marketing-team
- Email: tech@medmatch.de
- Documentation: This file and inline code comments

---

**Remember:** Quality over quantity. A well-researched, personalized email to 10 targets beats 100 generic emails.
