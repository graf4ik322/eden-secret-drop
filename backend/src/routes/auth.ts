/**
 * Auth routes — Fastify plugin.
 * Регистрация, логин, Telegram auth, JWT refresh/logout.
 * Следует архитектуре Bedolaga Cabinet.
 */

import { FastifyInstance } from 'fastify';
import { hash, compare } from 'bcryptjs';
import { db } from '../db';
import { subscribers, emailVerificationCodes, refreshTokens } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { createAccessToken, createRefreshToken, verifyToken } from '../auth/jwt';
import { validateInitData as telegramValidate } from '../auth/telegram';
import { generateVerificationCode, isValidCode, isValidEmail } from '../auth/email';
import { sendVerificationCode } from '../services/email';

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const SALT_ROUNDS = 12;

/**
 * Хэш для хранения refresh token в БД (не храним raw).
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function authRoutes(app: FastifyInstance) {
  // ===== Telegram Mini App Auth → JWT =====
  app.post('/api/auth/telegram', async (req, reply) => {
    const { init_data, campaign_slug, referral_code } = req.body as {
      init_data: string;
      campaign_slug?: string;
      referral_code?: string;
    };

    if (!init_data) {
      return reply.status(400).send({ error: 'init_data is required' });
    }

    // Validate HMAC
    const validation = telegramValidate(init_data, BOT_TOKEN);
    if (!validation.valid || !validation.user) {
      return reply.status(401).send({ error: 'Invalid Telegram initData' });
    }

    const tgUser = validation.user;
    const tgUserId = String(tgUser.id);

    // Find or create subscriber
    let subscriber = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.tgUserId, tgUserId))
      .then(r => r[0]);

    if (!subscriber) {
      const result = await db
        .insert(subscribers)
        .values({
          tgUserId,
          username: tgUser.username || null,
          firstName: tgUser.first_name || null,
          locale: tgUser.language_code || 'en',
        })
        .returning();
      subscriber = result[0];
    } else {
      // Update last login info
      await db
        .update(subscribers)
        .set({ username: tgUser.username || subscriber.username, firstName: tgUser.first_name || subscriber.firstName })
        .where(eq(subscribers.id, subscriber.id));
    }

    // Generate JWT tokens
    const accessToken = createAccessToken({ sub: String(subscriber.id), telegram_id: tgUserId });
    const refreshToken = createRefreshToken({ sub: String(subscriber.id), telegram_id: tgUserId });

    // Store refresh token hash
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(refreshTokens).values({
      subscriberId: subscriber.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    });

    return reply.send({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: subscriber.id,
        tg_user_id: tgUserId,
        username: tgUser.username,
        first_name: tgUser.first_name,
        email: subscriber.email || null,
        locale: subscriber.locale,
      },
    });
  });

  // ===== Email Registration (Standalone — без Telegram) =====
  app.post('/api/auth/email/register', async (req, reply) => {
    const { email, password } = req.body as { email: string; password: string };

    if (!isValidEmail(email)) {
      return reply.status(400).send({ error: 'Invalid email' });
    }
    if (!password || password.length < 6) {
      return reply.status(400).send({ error: 'Password must be at least 6 characters' });
    }

    // Check if email already exists
    const existing = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, email))
      .then(r => r[0]);

    if (existing) {
      return reply.status(409).send({ error: 'Email already registered' });
    }

    // Hash password and create user
    const passwordHash = await hash(password, SALT_ROUNDS);
    const subscriber = await db
      .insert(subscribers)
      .values({
        email,
        passwordHash,
        emailVerified: false,
      })
      .returning()
      .then(r => r[0]);

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await db.insert(emailVerificationCodes).values({
      subscriberId: subscriber.id,
      code,
      expiresAt,
    });

    // Send code via email
    const sent = await sendVerificationCode(email, code);
    if (!sent) {
      console.warn(`[Auth] Failed to send verification code to ${email} — check SMTP config`);
    }

    return reply.send({
      message: 'Verification code sent to email',
      user_id: subscriber.id,
    });
  });

  // ===== Email Verification =====
  app.post('/api/auth/email/verify', async (req, reply) => {
    const { email, code } = req.body as { email: string; code: string };

    if (!isValidCode(code)) {
      return reply.status(400).send({ error: 'Invalid code format (6 digits required)' });
    }

    const subscriber = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, email))
      .then(r => r[0]);

    if (!subscriber) {
      return reply.status(404).send({ error: 'Subscriber not found' });
    }

    // Find valid verification code
    const verification = await db
      .select()
      .from(emailVerificationCodes)
      .where(
        and(
          eq(emailVerificationCodes.subscriberId, subscriber.id),
          eq(emailVerificationCodes.code, code),
          sql`${emailVerificationCodes.expiresAt} > NOW()`,
        ),
      )
      .then(r => r[0]);

    if (!verification) {
      return reply.status(400).send({ error: 'Invalid or expired code' });
    }

    // Mark email as verified and clean up used codes
    await db.update(subscribers).set({ emailVerified: true }).where(eq(subscribers.id, subscriber.id));
    await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.subscriberId, subscriber.id));

    // Generate JWT
    const accessToken = createAccessToken({ sub: String(subscriber.id), email });
    const refreshToken = createRefreshToken({ sub: String(subscriber.id), email });

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(refreshTokens).values({
      subscriberId: subscriber.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    });

    return reply.send({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: subscriber.id,
        email,
        first_name: subscriber.firstName,
      },
    });
  });

  // ===== Email Login =====
  app.post('/api/auth/email/login', async (req, reply) => {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password are required' });
    }

    const subscriber = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, email))
      .then(r => r[0]);

    if (!subscriber || !subscriber.passwordHash) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    if (!subscriber.emailVerified) {
      return reply.status(403).send({ error: 'Email not verified' });
    }

    const valid = await compare(password, subscriber.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const accessToken = createAccessToken({
      sub: String(subscriber.id),
      email,
      telegram_id: subscriber.tgUserId || undefined,
    });
    const refreshToken = createRefreshToken({
      sub: String(subscriber.id),
      email,
      telegram_id: subscriber.tgUserId || undefined,
    });

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(refreshTokens).values({
      subscriberId: subscriber.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    });

    return reply.send({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: subscriber.id,
        email,
        tg_user_id: subscriber.tgUserId,
        first_name: subscriber.firstName,
      },
    });
  });

  // ===== Link Telegram to Email account =====
  app.post('/api/auth/link-telegram', async (req, reply) => {
    const { init_data, email, password } = req.body as {
      init_data: string;
      email: string;
      password: string;
    };

    // Validate Telegram initData
    const validation = telegramValidate(init_data, BOT_TOKEN);
    if (!validation.valid || !validation.user) {
      return reply.status(401).send({ error: 'Invalid Telegram initData' });
    }

    // Validate email credentials
    const subscriber = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, email))
      .then(r => r[0]);

    if (!subscriber || !subscriber.passwordHash) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    if (!subscriber.emailVerified) {
      return reply.status(403).send({ error: 'Email not verified' });
    }

    const valid = await compare(password, subscriber.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    // Link Telegram to this email account
    const tgUserId = String(validation.user.id);
    await db
      .update(subscribers)
      .set({
        tgUserId,
        linkedTgUserId: tgUserId,
        username: validation.user.username || subscriber.username,
        firstName: validation.user.first_name || subscriber.firstName,
      })
      .where(eq(subscribers.id, subscriber.id));

    return reply.send({ message: 'Telegram linked to account' });
  });

  // ===== Token Refresh =====
  app.post('/api/auth/refresh', async (req, reply) => {
    const { refresh_token } = req.body as { refresh_token: string };

    if (!refresh_token) {
      return reply.status(400).send({ error: 'refresh_token is required' });
    }

    const payload = verifyToken(refresh_token);
    if (!payload || payload.type !== 'refresh') {
      return reply.status(401).send({ error: 'Invalid or expired refresh token' });
    }

    // Verify token exists in DB
    const stored = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.subscriberId, Number(payload.sub)),
          eq(refreshTokens.tokenHash, hashToken(refresh_token)),
          sql`${refreshTokens.expiresAt} > NOW()`,
        ),
      )
      .then(r => r[0]);

    if (!stored) {
      return reply.status(401).send({ error: 'Refresh token revoked or expired' });
    }

    // Generate new tokens (rotate refresh)
    const newAccess = createAccessToken({ sub: payload.sub, telegram_id: payload.telegram_id, email: payload.email });
    const newRefresh = createRefreshToken({ sub: payload.sub, telegram_id: payload.telegram_id, email: payload.email });

    // Replace old refresh token
    await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(refreshTokens).values({
      subscriberId: stored.subscriberId,
      tokenHash: hashToken(newRefresh),
      expiresAt,
    });

    return reply.send({ access_token: newAccess, refresh_token: newRefresh });
  });

  // ===== Logout =====
  app.post('/api/auth/logout', async (req, reply) => {
    const { refresh_token } = req.body as { refresh_token: string };
    if (refresh_token) {
      const hash = hashToken(refresh_token);
      await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, hash));
    }
    return reply.send({ message: 'Logged out' });
  });

  // ===== Forgot Password — отправка кода сброса на email =====
  app.post('/api/auth/email/forgot-password', async (req, reply) => {
    const { email } = req.body as { email: string };

    if (!email || !isValidEmail(email)) {
      return reply.status(400).send({ error: 'Invalid email' });
    }

    // Всегда возвращаем success (предотвращаем email enumeration)
    const subscriber = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, email))
      .then(r => r[0]);

    if (!subscriber) {
      return reply.send({ message: 'If the email exists, a reset code has been sent' });
    }

    // Auto-verify email if not yet verified (пользователь не мог верифицироваться,
    // если коды не доходили — forgot-password разблокирует этот круг)
    if (!subscriber.emailVerified) {
      await db
        .update(subscribers)
        .set({ emailVerified: true })
        .where(eq(subscribers.id, subscriber.id));
    }

    // Clean up old codes
    await db.delete(emailVerificationCodes)
      .where(and(
        eq(emailVerificationCodes.subscriberId, subscriber.id),
        eq(emailVerificationCodes.type, 'password_reset'),
      ));

    // Generate 6-digit reset code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await db.insert(emailVerificationCodes).values({
      subscriberId: subscriber.id,
      type: 'password_reset',
      code,
      expiresAt,
    });

    // Send via email
    const { sendPasswordResetCode } = await import('../services/email');
    await sendPasswordResetCode(email, code);

    return reply.send({ message: 'If the email exists, a reset code has been sent' });
  });

  // ===== Reset Password — смена пароля по коду =====
  app.post('/api/auth/email/reset-password', async (req, reply) => {
    const { email, code, password } = req.body as { email: string; code: string; password: string };

    if (!email || !code || !password) {
      return reply.status(400).send({ error: 'Email, code, and password are required' });
    }
    if (!isValidCode(code)) {
      return reply.status(400).send({ error: 'Invalid code format (6 digits required)' });
    }
    if (password.length < 6) {
      return reply.status(400).send({ error: 'Password must be at least 6 characters' });
    }

    const subscriber = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, email))
      .then(r => r[0]);

    if (!subscriber) {
      return reply.status(404).send({ error: 'Subscriber not found' });
    }

    // Validate reset code
    const verification = await db
      .select()
      .from(emailVerificationCodes)
      .where(
        and(
          eq(emailVerificationCodes.subscriberId, subscriber.id),
          eq(emailVerificationCodes.type, 'password_reset'),
          eq(emailVerificationCodes.code, code),
          sql`${emailVerificationCodes.expiresAt} > NOW()`,
        ),
      )
      .then(r => r[0]);

    if (!verification) {
      return reply.status(400).send({ error: 'Invalid or expired reset code' });
    }

    // Update password
    const passwordHash = await hash(password, SALT_ROUNDS);
    await db
      .update(subscribers)
      .set({ passwordHash })
      .where(eq(subscribers.id, subscriber.id));

    // Clean up used codes
    await db.delete(emailVerificationCodes)
      .where(and(
        eq(emailVerificationCodes.subscriberId, subscriber.id),
        eq(emailVerificationCodes.type, 'password_reset'),
      ));

    return reply.send({ message: 'Password reset successfully' });
  });
}
