/**
 * Telegram initData validation for EDEN Secret Drop.
 * HMAC-SHA256 валидация данных от Telegram WebApp.
 * 
 * Использует @tma.js/init-data-node для consistency с context.ts.
 */

import { validate, parse } from '@tma.js/init-data-node';

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
 * Validate Telegram WebApp initData using @tma.js/init-data-node.
 * Возвращает user если HMAC совпал, null если нет.
 * 
 * @param raw - initData строка (может быть URL-encoded)
 * @param botToken - Telegram bot token
 * @param maxAgeSec - максимальный возраст initData в секундах (0 = отключить проверку)
 */
export function validateInitData(
  raw: string,
  botToken: string,
  maxAgeSec: number = 86400, // 24h по умолчанию (как @tma.js)
): { valid: boolean; user?: TelegramUser } {
  try {
    // validate() кинет ошибку если HMAC не совпал или initData просрочен
    validate(raw, botToken, { expiresIn: maxAgeSec });
    const parsed = parse(raw);
    return { valid: true, user: parsed.user as TelegramUser | undefined };
  } catch (err) {
    console.warn('[Telegram] validateInitData failed:', (err as Error).message);
    return { valid: false };
  }
}

/**
 * Парсинг initData без валидации (только для отладки).
 */
export function parseInitData(raw: string): Record<string, string> {
  const params = new URLSearchParams(raw);
  const data: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    data[key] = value;
  }
  return data;
}
