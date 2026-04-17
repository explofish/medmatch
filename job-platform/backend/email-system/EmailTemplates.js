/**
 * Email Templates Module
 * 
 * Provides templating system for partnership outreach emails.
 * Supports variable substitution and multiple template types.
 */

class EmailTemplates {
  constructor() {
    this.templates = this.loadTemplates();
  }

  loadTemplates() {
    return {
      // Initial partnership outreach to medical schools
      'partnership_medical_school': {
        name: 'Medical School Partnership',
        description: 'Initial outreach to medical schools for partnership',
        subject: 'Partnership Opportunity: Connecting Your Graduates with Medical Careers',
        variables: [
          'partnerName',
          'institutionName',
          'institutionType',
          'contactRole',
          'customMessage'
        ],
        render: (vars) => this.renderMedicalSchoolTemplate(vars)
      },

      // Initial partnership outreach to professional associations
      'partnership_association': {
        name: 'Professional Association Partnership',
        description: 'Initial outreach to medical professional associations',
        subject: 'Collaboration Opportunity: Supporting Medical Professionals in Career Transition',
        variables: [
          'partnerName',
          'associationName',
          'memberCount',
          'focusArea',
          'customMessage'
        ],
        render: (vars) => this.renderAssociationTemplate(vars)
      },

      // Follow-up email after initial contact
      'partnership_followup': {
        name: 'Partnership Follow-up',
        description: 'Follow-up email for partnership discussions',
        subject: 'Following Up: MedMatch Partnership Discussion',
        variables: [
          'partnerName',
          'institutionName',
          'previousContactDate',
          'customMessage'
        ],
        render: (vars) => this.renderFollowUpTemplate(vars)
      },

      // Partnership confirmation/welcome
      'partnership_welcome': {
        name: 'Partnership Welcome',
        description: 'Welcome email for new partners',
        subject: 'Welcome to the MedMatch Partner Network',
        variables: [
          'partnerName',
          'institutionName',
          'partnerType',
          'loginUrl',
          'customMessage'
        ],
        render: (vars) => this.renderWelcomeTemplate(vars)
      },

      // Email to hospitals/clinics for job postings
      'employer_outreach': {
        name: 'Employer Outreach',
        description: 'Outreach to hospitals and clinics for job postings',
        subject: 'Find Qualified Medical Graduates for Your Open Positions',
        variables: [
          'partnerName',
          'companyName',
          'hiringManagerRole',
          'openPositions',
          'customMessage'
        ],
        render: (vars) => this.renderEmployerTemplate(vars)
      }
    };
  }

  /**
   * Get list of available templates
   */
  getAvailableTemplates() {
    return Object.entries(this.templates).map(([id, template]) => ({
      id,
      name: template.name,
      description: template.description,
      subject: template.subject,
      variables: template.variables
    }));
  }

  /**
   * Get a specific template
   */
  getTemplate(templateId) {
    return this.templates[templateId];
  }

  /**
   * Render a template with variables
   */
  render(templateId, variables = {}) {
    const template = this.templates[templateId];
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }

    const { html, text } = template.render(variables);
    
    return {
      subject: this.interpolate(template.subject, variables),
      html,
      text
    };
  }

  /**
   * Interpolate variables in a string
   */
  interpolate(text, variables) {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  }

  // Template renderers
  renderMedicalSchoolTemplate(vars) {
    const {
      partnerName = 'there',
      institutionName = 'your institution',
      institutionType = 'Medical School',
      contactRole = 'Career Services Director',
      customMessage = ''
    } = vars;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MedMatch Partnership</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 30px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
    .highlight { background: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MedMatch Partnership Opportunity</h1>
    </div>
    <div class="content">
      <p>Dear {{partnerName}},</p>
      
      <p>I hope this email finds you well. My name is [CMO Name], and I'm reaching out from <strong>MedMatch</strong>, a specialized job platform dedicated to connecting medical school graduates with their ideal career opportunities in Germany.</p>
      
      <div class="highlight">
        <strong>Why Partner with MedMatch?</strong>
        <ul>
          <li>✓ Direct access to 500+ verified medical employers</li>
          <li>✓ Specialized matching algorithm for medical careers</li>
          <li>✓ Free career support for your graduates</li>
          <li>✓ Dedicated partnership dashboard for career services</li>
        </ul>
      </div>
      
      <p>We'd love to explore a partnership with <strong>{{institutionName}}</strong> to support your graduates in their career transitions. Many {{institutionType}}s are already seeing improved placement rates through our platform.</p>
      
      ${customMessage ? `<p>${customMessage}</p>` : ''}
      
      <p>Would you be available for a brief 15-minute call next week to discuss how we can collaborate? I'm happy to work around your schedule.</p>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="mailto:[CMO_EMAIL]?subject=Partnership Discussion - {{institutionName}}" class="button">Schedule a Call</a>
      </p>
      
      <p>Looking forward to hearing from you.</p>
      
      <p>Best regards,<br>
      [CMO Name]<br>
      Chief Marketing Officer<br>
      MedMatch<br>
      📧 [CMO_EMAIL]<br>
      📞 [CMO_PHONE]</p>
    </div>
    <div class="footer">
      <p>MedMatch - Connecting Medical Graduates with Their Future</p>
      <p><a href="https://medmatch.de">medmatch.de</a></p>
    </div>
  </div>
</body>
</html>`;

    const text = `Dear ${partnerName},

I hope this email finds you well. I'm reaching out from MedMatch, a specialized job platform dedicated to connecting medical school graduates with their ideal career opportunities in Germany.

Why Partner with MedMatch?
- Direct access to 500+ verified medical employers
- Specialized matching algorithm for medical careers
- Free career support for your graduates
- Dedicated partnership dashboard for career services

We'd love to explore a partnership with ${institutionName} to support your graduates in their career transitions.

${customMessage ? customMessage + '\n\n' : ''}Would you be available for a brief 15-minute call next week to discuss how we can collaborate?

Best regards,
[CMO Name]
Chief Marketing Officer
MedMatch
[CMO_EMAIL]
[CMO_PHONE]

https://medmatch.de`;

    return { html, text };
  }

  renderAssociationTemplate(vars) {
    const {
      partnerName = 'there',
      associationName = 'your association',
      memberCount = 'your members',
      focusArea = 'medical professionals',
      customMessage = ''
    } = vars;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MedMatch Partnership</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #059669; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 30px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
    .stats { background: #d1fae5; padding: 15px; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Supporting {{associationName}} Members</h1>
    </div>
    <div class="content">
      <p>Dear {{partnerName}},</p>
      
      <p>As a representative of <strong>{{associationName}}</strong>, you understand the challenges {{focusArea}} face in finding the right career opportunities. I wanted to introduce you to <strong>MedMatch</strong> - a specialized platform designed specifically for medical career transitions.</p>
      
      <div class="stats">
        <strong>How We Support Professional Associations:</strong>
        <ul>
          <li>✓ Free job matching for all your members</li>
          <li>✓ Exclusive partnership rates for featured opportunities</li>
          <li>✓ Co-branded career resources</li>
          <li>✓ Quarterly employment market reports</li>
          <li>✓ Member referral tracking and rewards</li>
        </ul>
      </div>
      
      <p>We've helped thousands of medical professionals find their ideal positions, and we'd be honored to support {{memberCount}} through a strategic partnership.</p>
      
      ${customMessage ? `<p>${customMessage}</p>` : ''}
      
      <p>I'd love to discuss how we can create value for your members together. Would you be open to a conversation next week?</p>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="mailto:[CMO_EMAIL]?subject=Partnership Discussion - {{associationName}}" class="button">Let's Connect</a>
      </p>
      
      <p>Best regards,<br>
      [CMO Name]<br>
      Chief Marketing Officer<br>
      MedMatch</p>
    </div>
    <div class="footer">
      <p>MedMatch - Your Members' Career Partner</p>
    </div>
  </div>
</body>
</html>`;

    const text = `Dear ${partnerName},

As a representative of ${associationName}, you understand the challenges ${focusArea} face in finding the right career opportunities. I wanted to introduce you to MedMatch - a specialized platform designed specifically for medical career transitions.

How We Support Professional Associations:
- Free job matching for all your members
- Exclusive partnership rates for featured opportunities
- Co-branded career resources
- Quarterly employment market reports
- Member referral tracking and rewards

We've helped thousands of medical professionals find their ideal positions, and we'd be honored to support ${memberCount} through a strategic partnership.

${customMessage ? customMessage + '\n\n' : ''}I'd love to discuss how we can create value for your members together. Would you be open to a conversation next week?

Best regards,
[CMO Name]
Chief Marketing Officer
MedMatch`;

    return { html, text };
  }

  renderFollowUpTemplate(vars) {
    const {
      partnerName = 'there',
      institutionName = 'your institution',
      previousContactDate = 'recently',
      customMessage = ''
    } = vars;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Following Up</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { background: #f9fafb; padding: 30px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>Dear {{partnerName}},</p>
      
      <p>I hope you're doing well. I wanted to follow up on my email from {{previousContactDate}} regarding a potential partnership between MedMatch and {{institutionName}}.</p>
      
      <p>I understand you receive many partnership requests, so I wanted to briefly highlight why medical institutions are choosing to work with us:</p>
      
      <ul>
        <li>85% of partner schools report improved graduate employment rates</li>
        <li>Dedicated career services integration at no cost</li>
        <li>Data-driven insights on employment trends for your programs</li>
      </ul>
      
      ${customMessage ? `<p>${customMessage}</p>` : ''}
      
      <p>If now isn't the right time, I completely understand. I'd be happy to reconnect in a few months if that works better for your schedule.</p>
      
      <p>Best regards,<br>
      [CMO Name]<br>
      MedMatch</p>
    </div>
    <div class="footer">
      <p>MedMatch - Connecting Medical Graduates with Their Future</p>
    </div>
  </div>
</body>
</html>`;

    const text = `Dear ${partnerName},

I hope you're doing well. I wanted to follow up on my email from ${previousContactDate} regarding a potential partnership between MedMatch and ${institutionName}.

I understand you receive many partnership requests, so I wanted to briefly highlight why medical institutions are choosing to work with us:

- 85% of partner schools report improved graduate employment rates
- Dedicated career services integration at no cost
- Data-driven insights on employment trends for your programs

${customMessage ? customMessage + '\n\n' : ''}If now isn't the right time, I completely understand. I'd be happy to reconnect in a few months if that works better for your schedule.

Best regards,
[CMO Name]
MedMatch`;

    return { html, text };
  }

  renderWelcomeTemplate(vars) {
    const {
      partnerName = 'Partner',
      institutionName = 'your institution',
      partnerType = 'Medical School',
      loginUrl = 'https://partners.medmatch.de',
      customMessage = ''
    } = vars;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to MedMatch Partners</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #7c3aed; color: white; padding: 30px; text-align: center; }
    .content { background: #f9fafb; padding: 30px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
    .next-steps { background: #ede9fe; padding: 20px; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to the MedMatch Partner Network!</h1>
    </div>
    <div class="content">
      <p>Dear {{partnerName}},</p>
      
      <p>We're thrilled to officially welcome <strong>{{institutionName}}</strong> as a MedMatch partner! Thank you for joining our network of leading medical institutions.</p>
      
      <div class="next-steps">
        <strong>Your Next Steps:</strong>
        <ol>
          <li><strong>Access Your Dashboard:</strong> Log in to your partner portal to customize your profile</li>
          <li><strong>Share with Graduates:</strong> Use our co-branded materials to introduce MedMatch</li>
          <li><strong>Track Success:</strong> Monitor placement rates and graduate feedback</li>
        </ol>
      </div>
      
      ${customMessage ? `<p>${customMessage}</p>` : ''}
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="{{loginUrl}}" class="button">Access Partner Dashboard</a>
      </p>
      
      <p>Your dedicated partner success manager will reach out within 48 hours to schedule your onboarding call.</p>
      
      <p>Welcome aboard!</p>
      
      <p>Best regards,<br>
      The MedMatch Partner Team</p>
    </div>
    <div class="footer">
      <p>MedMatch Partner Network</p>
      <p>Need help? Contact partners@medmatch.de</p>
    </div>
  </div>
</body>
</html>`;

    const text = `Dear ${partnerName},

We're thrilled to officially welcome ${institutionName} as a MedMatch partner! Thank you for joining our network of leading medical institutions.

Your Next Steps:
1. Access Your Dashboard: Log in to your partner portal to customize your profile
2. Share with Graduates: Use our co-branded materials to introduce MedMatch
3. Track Success: Monitor placement rates and graduate feedback

${customMessage ? customMessage + '\n\n' : ''}Access your partner dashboard: ${loginUrl}

Your dedicated partner success manager will reach out within 48 hours to schedule your onboarding call.

Welcome aboard!

Best regards,
The MedMatch Partner Team

Need help? Contact partners@medmatch.de`;

    return { html, text };
  }

  renderEmployerTemplate(vars) {
    const {
      partnerName = 'Hiring Manager',
      companyName = 'your organization',
      hiringManagerRole = 'HR Director',
      openPositions = 'medical positions',
      customMessage = ''
    } = vars;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Find Medical Talent</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 30px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
    .features { background: #fee2e2; padding: 15px; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Quality Medical Talent for {{companyName}}</h1>
    </div>
    <div class="content">
      <p>Dear {{partnerName}},</p>
      
      <p>As {{hiringManagerRole}} at {{companyName}}, finding qualified medical professionals for {{openPositions}} can be challenging. I wanted to introduce you to <strong>MedMatch</strong> - Germany's leading platform for connecting healthcare employers with verified medical graduates.</p>
      
      <div class="features">
        <strong>Why Hospitals Choose MedMatch:</strong>
        <ul>
          <li>✓ Pre-verified medical graduates and professionals</li>
          <li>✓ AI-powered matching based on your requirements</li>
          <li>✓ 70% reduction in time-to-hire</li>
          <li>✓ No placement fees for featured employers</li>
          <li>✓ Direct communication with candidates</li>
        </ul>
      </div>
      
      <p>We partner with top medical schools and professional associations to ensure a steady pipeline of qualified candidates ready to make an impact.</p>
      
      ${customMessage ? `<p>${customMessage}</p>` : ''}
      
      <p>Would you be interested in a quick demo of how MedMatch can streamline your hiring process?</p>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="mailto:[CMO_EMAIL]?subject=Employer Demo Request - {{companyName}}" class="button">Schedule a Demo</a>
      </p>
      
      <p>Best regards,<br>
      [CMO Name]<br>
      Chief Marketing Officer<br>
      MedMatch</p>
    </div>
    <div class="footer">
      <p>MedMatch - Your Medical Hiring Partner</p>
    </div>
  </div>
</body>
</html>`;

    const text = `Dear ${partnerName},

As ${hiringManagerRole} at ${companyName}, finding qualified medical professionals for ${openPositions} can be challenging. I wanted to introduce you to MedMatch - Germany's leading platform for connecting healthcare employers with verified medical graduates.

Why Hospitals Choose MedMatch:
- Pre-verified medical graduates and professionals
- AI-powered matching based on your requirements
- 70% reduction in time-to-hire
- No placement fees for featured employers
- Direct communication with candidates

We partner with top medical schools and professional associations to ensure a steady pipeline of qualified candidates.

${customMessage ? customMessage + '\n\n' : ''}Would you be interested in a quick demo of how MedMatch can streamline your hiring process?

Best regards,
[CMO Name]
Chief Marketing Officer
MedMatch`;

    return { html, text };
  }
}

module.exports = EmailTemplates;
