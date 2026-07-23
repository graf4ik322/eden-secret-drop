/**
 * JWT token handling for EDEN Secret Drop auth.
 * Создание и валидация access + refresh токенов.
 *
 * Telegram Mini App auth → JWT access token (короткий)
 * Refresh token (длинный) — для обновления сессии
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'eden-secret-drop-dev-secret';
const ACCESS_TOKEN_EXPIRES = 15; // минут
const REFRESH_TOKEN_EXPIRES = 30; // дней

export interface TokenPayload {
  /** User ID (tgUserId или email userId) */
  sub: string;
  /** Telegram ID — только если есть */
  telegram_id?: string;
  /** Email — только если есть */
  email?: string;
  /** Тип токена */
  type: 'access' | 'refresh';
}

export function createAccessToken(payload: { sub: string; telegram_id?: string; email?: string }): string {
  return jwt.sign(
    { ...payload, type: 'access' },
    JWT_SECRET,
    { expiresIn: `${ACCESS_TOKEN_EXPIRES}m` },
  );
}

export function createRefreshToken(payload: { sub: string; telegram_id?: string; email?: string }): string {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: `${REFRESH_TOKEN_EXPIRES}d` },
  );
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function getTokenExpiresIn(): number {
  return ACCESS_TOKEN_EXPIRES * 60; // в секундах
}
