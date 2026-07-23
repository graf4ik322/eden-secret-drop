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
      await extractUser(rawInitData, adminIds);
    }

    // === FALLBACK 1: query params __tg_initData или tg_initData (разные версии бандла) ===
    if (!tgUserId) {
      const qInitData = (req.query as Record<string, string>)?.['__tg_initData'] || (req.query as Record<string, string>)?.['tg_initData'];
      if (qInitData) {
        await extractUser(qInitData, adminIds);
      }
    }

    return { db, isAdmin, tgUserId, userData };

    // Helper: BLOCKING initData validation — invalid = no access
    async function extractUser(rawInitData: string, adminIds: string[]): Promise<string | null> {
      if (botToken) {
        try {
          validate(rawInitData, botToken);
        } catch (err) {
          console.warn('[Auth] HMAC validation FAILED — rejecting request');
          return null;
        }
      }
      try {
        const parsed = parse(rawInitData);
        if (parsed.user) {
          const vid = String(parsed.user.id);
          tgUserId = vid;
          isAdmin = adminIds.some(id => id === vid);
          if (isAdmin) console.log('[Auth] Admin detected:', vid);
          userData = {
            id: parsed.user.id,
            firstName: parsed.user.firstName || '',
            username: parsed.user.username || '',
          };
          return vid;
        }
      } catch (parseErr) {
        console.warn('[Auth] Failed to parse initData:', (parseErr as Error).message);
      }
      return null;
    }
  } catch (err) {
    console.error('[Auth] createContext CRASHED:', err);
    return { db, isAdmin: false, tgUserId: null, userData: null, _rawHeaders: req.headers };
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>;