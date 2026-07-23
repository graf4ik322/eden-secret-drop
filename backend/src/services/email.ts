/**
 * Email service — отправка писем через SMTP (nodemailer).
 * Bedolaga-style: HTML + plain text multipart, configurable SMTP.
 * 
 * В dev-режиме (SMTP не настроен) пишет в console.log.
 * При ошибке SMTP пишет в console.error + дублирует в console.log.
 */

import nodemailer from 'nodemailer';

// SMTP config — читается из env при загрузке модуля
const CFG = {
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASSWORD || '',
  fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '',
  fromName: process.env.SMTP_FROM_NAME || 'EDEN Secret Drop',
  useTLS: process.env.SMTP_USE_TLS !== 'false',
  useSSL: process.env.SMTP_USE_SSL === 'true' || parseInt(process.env.SMTP_PORT || '587', 10) === 465,
};

// Log config on load (без пароля)
if (CFG.host && CFG.fromEmail) {
  console.log(`[Email] SMTP configured: ${CFG.host}:${CFG.port} from=${CFG.fromEmail}`);
} else {
  console.warn('[Email] SMTP NOT configured — codes will be printed to logs only');
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  if (!CFG.host || !CFG.fromEmail) {
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host: CFG.host,
      port: CFG.port,
      secure: CFG.useSSL,
      auth: CFG.user && CFG.pass
        ? { user: CFG.user, pass: CFG.pass }
        : undefined,
      tls: CFG.useTLS ? undefined : { rejectUnauthorized: false },
    });
    return transporter;
  } catch (err) {
    console.error('[Email] Failed to create transporter:', err);
    return null;
  }
}

export function isEmailConfigured(): boolean {
  return !!CFG.host && !!CFG.fromEmail;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email via SMTP.
 * Всегда логирует попытку. При неудаче дублирует содержимое в лог.
 * Возвращает true если отправка удалась или SMTP не настроен (лог-режим).
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const transport = getTransporter();

  console.log(`[Email] → ${params.to}: "${params.subject}"`);

  if (!transport) {
    // LOG MODE — codes visible in backend logs
    console.log(`[Email] ${'='.repeat(50)}`);
    console.log(`[Email] TO: ${params.to}`);
    console.log(`[Email] SUBJ: ${params.subject}`);
    console.log(`[Email] TEXT: ${params.text || '(html only)'}`);
    console.log(`[Email] ${'='.repeat(50)}`);
    return true;
  }

  try {
    const info = await transport.sendMail({
      from: `"${CFG.fromName}" <${CFG.fromEmail}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text || stripHtml(params.html),
    });
    console.log(`[Email] ✓ Sent (id=${info.messageId})`);
    return true;
  } catch (err) {
    console.error(`[Email] ✗ SMTP FAILED for ${params.to}:`, err);
    // Fallback: print to console so code isn't lost
    console.log(`[Email] FALLBACK — code visible in logs:`);
    console.log(`[Email] TO: ${params.to} | SUBJ: ${params.subject}`);
    if (params.text) {
      // Extract code from text for easy finding
      const codeMatch = params.text.match(/\b\d{6}\b/);
      if (codeMatch) console.log(`[Email] CODE: ${codeMatch[0]}`);
    }
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
 * Send email verification code (регистрация).
 */
export async function sendVerificationCode(email: string, code: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Your EDEN Secret Drop verification code',
    html: buildTemplate({ code, subtitle: 'Your verification code' }),
    text: `Your EDEN Secret Drop verification code: ${code}\n\nThis code expires in 15 minutes.`,
  });
}

/**
 * Send password reset code.
 */
export async function sendPasswordResetCode(email: string, code: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Reset your EDEN Secret Drop password',
    html: buildTemplate({ code, subtitle: 'Password reset code' }),
    text: `Reset your EDEN Secret Drop password\n\nYour reset code: ${code}\n\nThis code expires in 15 minutes.`,
  });
}

/** EDEN-styled email HTML template */
function buildTemplate({ code, subtitle }: { code: string; subtitle: string }): string {
  return `
    <div style="background:#071A17;color:#e2e8f0;font-family:-apple-system,sans-serif;padding:32px 16px;text-align:center">
      <div style="max-width:400px;margin:0 auto;background:rgba(255,255,255,0.04);border-radius:20px;padding:32px;backdrop-filter:blur(20px)">
        <div style="font-size:48px;margin-bottom:8px">⬡</div>
        <h1 style="font-family:Georgia,serif;color:#D2B980;font-size:24px;font-weight:400;letter-spacing:4px;margin:0 0 8px">E.S.D</h1>
        <p style="color:#94a3b8;font-size:14px;margin:0 0 24px">${subtitle}</p>
        <div style="font-size:40px;letter-spacing:12px;font-weight:700;color:#D2B980;margin:24px 0;padding:16px;background:rgba(210,185,128,0.08);border-radius:12px;font-family:monospace">
          ${code}
        </div>
        <p style="color:#64748b;font-size:13px;margin:0">
          This code expires in 15 minutes.<br/>
          If you didn't request this, ignore this email.
        </p>
      </div>
    </div>
  `.trim();
}
