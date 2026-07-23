import { validate, parse } from '@tma.js/init-data-node';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { db } from '../db';
import { verifyToken } from '../auth/jwt';

/**
 * Единственный источник правды для авторизации.
 * 
 * 1. PRIMARY: Authorization: Bearer <JWT> — JWT access token (для всех API-вызовов после входа)
 * 2. FALLBACK: Authorization: tma <initData> — HMAC-валидация через bot token (первый вход из Mini App)
 * 3. FALLBACK 2: query params __tg_initData — когда nginx срезает заголовки
 * 4. isAdmin: adminIds.some(id => id === String(userId)) — явная нормализация типов
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

    const authHeader = req.headers.authorization as string | undefined;

    // === PRIMARY: Authorization: Bearer <JWT> ===
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const payload = verifyToken(token);
      if (payload) {
        tgUserId = payload.telegram_id || payload.sub;
        isAdmin = adminIds.some(id => id === tgUserId);
        userData = {
          id: Number(payload.sub),
          firstName: '',
          username: tgUserId,
        };
        if (payload.telegram_id && isAdmin) {
          console.log('[Auth] Admin via JWT:', payload.telegram_id);
        }
      }
    }

    // === SECONDARY: Authorization: tma <initData> (HMAC) ===
    if (!tgUserId && authHeader?.startsWith('tma ')) {
      const rawInitData = authHeader.slice(4).trim();
      tgUserId = await extractUser(rawInitData, adminIds);
    }

    // === FALLBACK: query params __tg_initData (когда прокси срезает заголовки) ===
    if (!tgUserId) {
      const qInitData = (req.query as Record<string, string>)?.['__tg_initData'] || (req.query as Record<string, string>)?.['tg_initData'];
      if (qInitData) {
        tgUserId = await extractUser(qInitData, adminIds);
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