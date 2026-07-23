/**
 * Email service — отправка писем через SMTP (nodemailer).
 * Bedolaga-style: HTML + plain text multipart, configurable SMTP.
 */

import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || SMTP_USER;
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || 'EDEN Secret Drop';
const SMTP_USE_TLS = process.env.SMTP_USE_TLS !== 'false';
const SMTP_USE_SSL = process.env.SMTP_USE_SSL === 'true' || SMTP_PORT === 465;

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  if (!SMTP_HOST || !SMTP_FROM_EMAIL) {
    console.warn('[Email] SMTP not configured — emails will be logged to console');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_USE_SSL,
    auth: SMTP_USER && SMTP_PASSWORD
      ? { user: SMTP_USER, pass: SMTP_PASSWORD }
      : undefined,
    tls: SMTP_USE_TLS ? undefined : { rejectUnauthorized: false },
  });

  return transporter;
}

export function isEmailConfigured(): boolean {
  return !!SMTP_HOST && !!SMTP_FROM_EMAIL;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email via SMTP. If SMTP not configured, logs to console.
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const transport = getTransporter();

  if (!transport) {
    console.log(`[Email] LOG MODE — would send to ${params.to}:`);
    console.log(`  Subject: ${params.subject}`);
    console.log(`  Body: ${params.text || params.html.substring(0, 200)}...`);
    return true; // Don't fail in dev mode
  }

  try {
    await transport.sendMail({
      from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text || stripHtml(params.html),
    });
    console.log(`[Email] Sent to ${params.to}: ${params.subject}`);
    return true;
  } catch (err) {
    console.error(`[Email] Failed to send to ${params.to}:`, err);
    return false;
  }
}

/** Simple HTML-to-text conversion */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Send email verification code.
 */
export async function sendVerificationCode(email: string, code: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Your EDEN Secret Drop verification code',
    html: `
      <div style="background:#071A17;color:#e2e8f0;font-family:-apple-system,sans-serif;padding:32px 16px;text-align:center">
        <div style="max-width:400px;margin:0 auto;background:rgba(255,255,255,0.04);border-radius:20px;padding:32px;backdrop-filter:blur(20px)">
          <div style="font-size:48px;margin-bottom:8px">⬡</div>
          <h1 style="font-family:Georgia,serif;color:#D2B980;font-size:24px;font-weight:400;letter-spacing:4px;margin:0 0 8px">E.S.D</h1>
          <p style="color:#94a3b8;font-size:14px;margin:0 0 24px">Your verification code</p>
          <div style="font-size:40px;letter-spacing:12px;font-weight:700;color:#D2B980;margin:24px 0;padding:16px;background:rgba(210,185,128,0.08);border-radius:12px">
            ${code}
          </div>
          <p style="color:#64748b;font-size:13px;margin:0">
            This code expires in 15 minutes.<br/>
            If you didn't request this, ignore this email.
          </p>
        </div>
      </div>
    `,
    text: `Your EDEN Secret Drop verification code: ${code}\n\nThis code expires in 15 minutes.`,
  });
}

/**
 * Send password reset email.
 */
export async function sendPasswordResetCode(email: string, code: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Reset your EDEN Secret Drop password',
    html: `
      <div style="background:#071A17;color:#e2e8f0;font-family:-apple-system,sans-serif;padding:32px 16px;text-align:center">
        <div style="max-width:400px;margin:0 auto;background:rgba(255,255,255,0.04);border-radius:20px;padding:32px;backdrop-filter:blur(20px)">
          <div style="font-size:48px;margin-bottom:8px">⬡</div>
          <h1 style="font-family:Georgia,serif;color:#D2B980;font-size:24px;font-weight:400;letter-spacing:4px;margin:0 0 8px">E.S.D</h1>
          <p style="color:#94a3b8;font-size:14px;margin:0 0 24px">Password reset code</p>
          <div style="font-size:40px;letter-spacing:12px;font-weight:700;color:#D2B980;margin:24px 0;padding:16px;background:rgba(210,185,128,0.08);border-radius:12px">
            ${code}
          </div>
          <p style="color:#64748b;font-size:13px;margin:0">
            This code expires in 15 minutes.<br/>
            If you didn't request a password reset, ignore this email.
          </p>
        </div>
      </div>
    `,
    text: `Reset your EDEN Secret Drop password\n\nYour reset code: ${code}\n\nThis code expires in 15 minutes.`,
  });
}
