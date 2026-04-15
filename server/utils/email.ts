import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_DATA_RESIDENCY = process.env.SENDGRID_DATA_RESIDENCY;
const FROM_EMAIL = process.env.EMAIL_FROM ?? 'noreply@sewmetry.io';
const APP_NAME = 'Sewmetry';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  if (SENDGRID_DATA_RESIDENCY === 'eu') {
    sgMail.setDataResidency('eu');
  }
}

// ── In-memory email log (for testing) ────────
export interface SentEmail {
  to: string;
  subject: string;
  text: string;
}

const sentEmails: SentEmail[] = [];

export function getSentEmails(): SentEmail[] {
  return [...sentEmails];
}

export function clearSentEmails(): void {
  sentEmails.length = 0;
}

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string,
): Promise<void> {
  const subject = `${APP_NAME} - Password reset`;
  const text = [
    `You requested a password reset for your ${APP_NAME} account.`,
    '',
    'Your reset token:',
    resetToken,
    '',
    'Copy this token into the password reset form in the app.',
    '',
    'This token expires in 1 hour. If you did not request this, you can ignore this email.',
  ].join('\n');

  sentEmails.push({ to, subject, text });

  if (!SENDGRID_API_KEY) {
    console.warn(
      '[email] SENDGRID_API_KEY not set - skipping email. Token:',
      resetToken,
    );
    return;
  }

  const msg = {
    to,
    from: { email: FROM_EMAIL, name: APP_NAME },
    subject,
    text,
    html: [
      `<p>You requested a password reset for your <strong>${APP_NAME}</strong> account.</p>`,
      '<p><strong>Your reset token:</strong></p>',
      `<pre style="background:#f4f4f4;padding:12px 16px;border-radius:6px;font-size:14px;word-break:break-all;">${resetToken}</pre>`,
      '<p>Copy this token into the password reset form in the app.</p>',
      '<p>This token expires in 1 hour. If you did not request this, you can ignore this email.</p>',
    ].join('\n'),
  };

  await sgMail.send(msg);
}

export async function sendWelcomeEmail(to: string): Promise<void> {
  const APP_URL = 'https://sewmetry.io';
  const subject = `Welcome to ${APP_NAME}!`;
  const text = [
    `Welcome to ${APP_NAME}!`,
    '',
    `Your account has been created with the email address: ${to}`,
    '',
    `Visit ${APP_NAME} at: ${APP_URL}`,
    '',
    'Happy sewing!',
    `The ${APP_NAME} team`,
  ].join('\n');

  sentEmails.push({ to, subject, text });

  if (!SENDGRID_API_KEY) {
    console.warn(
      '[email] SENDGRID_API_KEY not set — skipping welcome email for:',
      to,
    );
    return;
  }

  const msg = {
    to,
    from: { email: FROM_EMAIL, name: APP_NAME },
    subject,
    text,
    html: [
      `<h2>Welcome to ${APP_NAME}!</h2>`,
      `<p>Your account has been created with the email address: <strong>${to}</strong></p>`,
      `<p><a href="${APP_URL}" style="display:inline-block;padding:12px 24px;background:#1976d2;color:#fff;text-decoration:none;border-radius:6px;">Visit ${APP_NAME}</a></p>`,
      '<p>Happy sewing!</p>',
      `<p>The ${APP_NAME} team</p>`,
    ].join('\n'),
  };

  await sgMail.send(msg);
}
