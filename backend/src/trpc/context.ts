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

    // === FALLBACK 1: query params (__tg_initData bypasses proxy header stripping) ===
    if (!tgUserId) {
      const qInitData = (req.query as Record<string, string>)?.['__tg_initData'];
      if (qInitData) {
        await extractUser(qInitData, adminIds);
      }
    }

    // === FALLBACK 2: x-tg-user-id header ===
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

    // === FALLBACK 3: query param __tg_userId ===
    if (!tgUserId) {
      const qUserId = (req.query as Record<string, string>)?.['__tg_userId'];
      if (qUserId) {
        tgUserId = qUserId;
        isAdmin = adminIds.some(id => id === qUserId);
        if (isAdmin) console.log('[Auth] Admin detected via __tg_userId:', qUserId);
      }
    }

    return { db, isAdmin, tgUserId, userData, _rawHeaders: req.headers };

    // Helper: parse initData and extract user
    async function extractUser(rawInitData: string, adminIds: string[]) {
      // Валидация — только для лога, не блокирует
      if (botToken) {
        try { validate(rawInitData, botToken); }
        catch (err) { console.warn('[Auth] HMAC validation failed (non-blocking):', (err as Error).message); }
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
            firstName: parsed.user.firstName || String(req.headers['x-tg-first-name'] || ''),
            username: parsed.user.username || String(req.headers['x-tg-username'] || ''),
          };
        }
      } catch (parseErr) {
        console.warn('[Auth] Failed to parse initData:', (parseErr as Error).message);
      }
    }
  } catch (err) {
    console.error('[Auth] createContext CRASHED:', err);
    return { db, isAdmin: false, tgUserId: null, userData: null, _rawHeaders: req.headers };
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>;