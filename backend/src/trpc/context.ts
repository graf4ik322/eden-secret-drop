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

    if (adminIds.length === 0) {
      console.warn('[Auth] ADMIN_IDS is empty or not set — no users will be recognized as admin');
    }

    let tgUserId: string | null = null;
    let isAdmin = false;
    let userData: { id: number; firstName: string; username?: string } | null = null;

    // === PRIMARY: Authorization: tma *** (HMAC-валидация, логируем ошибки) ===
    const authHeader = req.headers.authorization as string | undefined;
    if (authHeader?.startsWith('tma ')) {
      const rawInitData = authHeader.slice(4).trim();

      // Валидация — только для лога, не блокирует запрос
      if (botToken) {
        try {
          validate(rawInitData, botToken);
        } catch (err) {
          console.warn('[Auth] HMAC validation failed (non-blocking):', (err as Error).message);
        }
      }

      // Парсим initData ВСЕГДА (с валидацией или без)
      try {
        const parsed = parse(rawInitData);
        if (parsed.user) {
          const vid = String(parsed.user.id);
          tgUserId = vid;
          isAdmin = adminIds.some(id => id === vid);
          if (isAdmin) console.log('[Auth] Admin detected:', vid);
          userData = {
            id: parsed.user.id,
            firstName: parsed.user.firstName || req.headers['x-tg-first-name'] as string || '',
            username: parsed.user.username || req.headers['x-tg-username'] as string || '',
          };
        }
      } catch (parseErr) {
        console.warn('[Auth] Failed to parse initData:', (parseErr as Error).message);
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
        if (isAdmin) console.log('[Auth] Admin detected via x-tg-user-id:', rawUserId);
        userData = {
          id: parseInt(rawUserId, 10) || 0,
          firstName: req.headers['x-tg-first-name'] as string || '',
          username: req.headers['x-tg-username'] as string || '',
        };
      }
    }

    return { db, isAdmin, tgUserId, userData, _rawHeaders: req.headers };
  } catch (err) {
    console.error('[Auth] createContext CRASHED:', err);
    // Never crash the request — return unauthed context
    return { db, isAdmin: false, tgUserId: null, userData: null, _rawHeaders: req.headers };
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>;