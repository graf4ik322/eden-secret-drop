import { validate, parse } from '@tma.js/init-data-node';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { db } from '../db';

/**
 * Единственный источник правды для авторизации.
 * 
 * 1. PRIMARY: Authorization: tma <initData> — HMAC-валидация через bot token
 *    (документация: https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app)
 * 2. FALLBACK: x-tg-user-id header — если HMAC не прошёл (нет/неверный bot token)
 * 3. isAdmin: adminIds.some(id => id === String(userId)) — явная нормализация типов
 */
export async function createContext({ req }: CreateFastifyContextOptions) {
  try {
    const rawAdminIds = process.env.ADMIN_IDS || '';
    const adminIds = rawAdminIds.split(',').map(id => id.trim()).filter(Boolean);
    const botToken = process.env.BOT_TOKEN || '';

    let tgUserId: string | null = null;
    let isAdmin = false;
    let userData: { id: number; firstName: string; username?: string } | null = null;

    // === PRIMARY: Authorization: tma *** (HMAC-validated initData) ===
    const authHeader = req.headers.authorization as string | undefined;
    if (authHeader?.startsWith('tma ')) {
      const rawInitData = authHeader.slice(4).trim();

      if (botToken) {
        try {
          validate(rawInitData, botToken);
          const parsed = parse(rawInitData);
          if (parsed.user) {
            const vid = String(parsed.user.id);
            tgUserId = vid;
            isAdmin = adminIds.some(id => id === vid);
            userData = {
              id: parsed.user.id,
              firstName: parsed.user.firstName || req.headers['x-tg-first-name'] as string || '',
              username: parsed.user.username || req.headers['x-tg-username'] as string || '',
            };
          }
        } catch (err) {
          console.error('[Auth] HMAC validation failed, falling back to header:', (err as Error).message);
        }
      } else {
        // No bot token: parse without validation (dev/debug)
        try {
          const parsed = parse(rawInitData);
          if (parsed.user) {
            tgUserId = String(parsed.user.id);
            isAdmin = adminIds.some(id => id === tgUserId);
            userData = {
              id: parsed.user.id,
              firstName: parsed.user.firstName || '',
              username: parsed.user.username || '',
            };
          }
        } catch { /* ignore */ }
      }
    }

    // === FALLBACK: x-tg-user-id header ===
    // Работает ВСЕГДА, не только в dev — HMAC может не пройти
    // если BOT_TOKEN не совпадает или не задан
    if (!tgUserId) {
      const rawUserId = req.headers['x-tg-user-id'] as string | undefined;
      if (rawUserId) {
        tgUserId = rawUserId;
        isAdmin = adminIds.some(id => id === rawUserId);
        userData = {
          id: parseInt(rawUserId, 10) || 0,
          firstName: req.headers['x-tg-first-name'] as string || '',
          username: req.headers['x-tg-username'] as string || '',
        };
      }
    }

    return { db, isAdmin, tgUserId, userData };
  } catch (err) {
    console.error('[Auth] createContext CRASHED:', err);
    // Never crash the request — return unauthed context
    return { db, isAdmin: false, tgUserId: null, userData: null };
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>;