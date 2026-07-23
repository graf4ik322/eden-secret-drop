/**
 * Telegram initData validation for EDEN Secret Drop.
 * HMAC-SHA256 валидация данных от Telegram WebApp.
 */

import { createHmac } from 'node:crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
}

/**
 * Validate Telegram WebApp initData.
 * Возвращает user если HMAC совпал, null если нет.
 */
export function validateInitData(raw: string, botToken: string): { valid: boolean; user?: TelegramUser } {
  try {
    const params = new URLSearchParams(raw);
    const data: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      data[key] = value;
    }

    const hash = data.hash;
    if (!hash) return { valid: false };

    // Build data check string (sorted alphabetically, excluding hash)
    const checkStrings: string[] = [];
    const sortedKeys = Object.keys(data)
      .filter(k => k !== 'hash')
      .sort();

    for (const key of sortedKeys) {
      checkStrings.push(`${key}=${data[key]}`);
    }
    const checkString = checkStrings.join('\n');

    // HMAC-SHA256 with WebAppData
    const secretKey = createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const expectedHash = createHmac('sha256', secretKey)
      .update(checkString)
      .digest('hex');

    if (expectedHash !== hash) {
      return { valid: false };
    }

    // Parse user
    const user: TelegramUser = data.user ? JSON.parse(data.user) : undefined;
    return { valid: true, user };
  } catch {
    return { valid: false };
  }
}

/**
 * Extract user from initData string (без валидации — только парсинг).
 * Используется после того как validateInitData уже прошёл.
 */
export function parseInitData(raw: string): Record<string, string> {
  const params = new URLSearchParams(raw);
  const data: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    data[key] = value;
  }
  return data;
}
