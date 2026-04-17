import { Resend } from 'resend';

// Initialize Resend with API key from environment
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Email templates
export const emailTemplates = {
  welcome: (data: { firstName: string; email: string }) => ({
    subject: 'Willkommen bei MedMatch - Deine Karriere startet hier',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Willkommen bei MedMatch</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1e40af;">Willkommen bei MedMatch!</h1>
  </div>
  
  <p>Hallo ${data.firstName || 'Neuer Nutzer'},</p>
  
  <p>vielen Dank für deine Registrierung bei <strong>MedMatch</strong> – der ersten Jobplattform speziell für Absolventen des Medizinstudiums.</p>
  
  <p>Mit MedMatch findest du:</p>
  <ul>
    <li>Passende Assistenzarzt-Stellen nach deinem Studium</li>
    <li>Transparente Bewertungen von Arbeitgebern</li>
    <li>Direkten Kontakt zu Kliniken und Praxen</li>
  </ul>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="https://medmatch.de/login" 
       style="background-color: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Jetzt einloggen
    </a>
  </div>
  
  <p>Bei Fragen erreichst du uns unter <a href="mailto:hello@medmatch.de">hello@medmatch.de</a>.</p>
  
  <p>Viel Erfolg bei deiner Jobsuche!</p>
  
  <p>Dein MedMatch-Team</p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  
  <p style="font-size: 12px; color: #666;">
    MedMatch GmbH<br>
    Du erhältst diese E-Mail, weil du dich auf medmatch.de registriert hast.
  </p>
</body>
</html>
    `,
  }),
  
  verification: (data: { firstName: string; token: string }) => ({
    subject: 'Bitte bestätige deine E-Mail-Adresse',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-Mail-Verifizierung</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1e40af;">E-Mail-Adresse bestätigen</h1>
  
  <p>Hallo ${data.firstName || 'Neuer Nutzer'},</p>
  
  <p>bitte bestätige deine E-Mail-Adresse, um dein MedMatch-Konto zu aktivieren:</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="https://medmatch.de/verify?token=${data.token}" 
       style="background-color: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
      E-Mail bestätigen
    </a>
  </div>
  
  <p>Oder kopiere diesen Link in deinen Browser:</p>
  <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">
    https://medmatch.de/verify?token=${data.token}
  </p>
  
  <p>Falls du dich nicht bei MedMatch registriert hast, kannst du diese E-Mail ignorieren.</p>
  
  <p>Dein MedMatch-Team</p>
</body>
</html>
    `,
  }),
};

// Send email function
export async function sendEmail(
  to: string,
  template: keyof typeof emailTemplates,
  data: Parameters<typeof emailTemplates[keyof typeof emailTemplates]>[0]
) {
  if (!resend) {
    console.warn('Resend not configured - email would be sent:', { to, template });
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const emailContent = emailTemplates[template](data as any);
    
    const result = await resend.emails.send({
      from: 'MedMatch <hello@medmatch.de>',
      to,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('Email send failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Check if email service is configured
export const isEmailConfigured = () => {
  return !!resend;
};
