import { validate, parse } from '@tma.js/init-data-node';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { db } from '../db';

/**
 * Единственный источник правды для авторизации.
 * 
 * 1. PRIMARY: Authorization: tma <initData> — HMAC-валидация через bot token
 *    (документация: https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app)
 * 2. FALLBACK (dev): x-tg-user-id header — только если NODE_ENV=development
 * 3. isAdmin: adminIds.map(String).includes(String(userId)) — явная нормализация типов
 */
export async function createContext({ req }: CreateFastifyContextOptions) {
  const rawAdminIds = process.env.ADMIN_IDS || '';
  const adminIds = rawAdminIds.split(',').map(id => id.trim()).filter(Boolean);
  const botToken = process.env.BOT_TOKEN || '';
  const isDev = process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true';

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
          isAdmin = adminIds.map(id => id.trim()).some(id => id === vid);
          userData = {
            id: parsed.user.id,
            firstName: parsed.user.firstName || req.headers['x-tg-first-name'] as string || '',
            username: parsed.user.username || req.headers['x-tg-username'] as string || '',
          };
          console.log('[Auth] HMAC OK - user:', vid, 'isAdmin:', isAdmin, 'adminIds:', adminIds);
        }
      } catch (err) {
        console.error('[Auth] HMAC validation failed:', (err as Error).message);
      }
    } else {
      // Dev mode: parse without validation
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
          console.log('[Auth] DEV parse - user:', tgUserId, 'isAdmin:', isAdmin);
        }
      } catch { /* ignore parse errors in dev */ }
    }
  }

  // === FALLBACK (dev only): x-tg-user-id header ===
  if (!tgUserId && isDev) {
    const rawUserId = req.headers['x-tg-user-id'] as string | undefined;
    if (rawUserId) {
      tgUserId = rawUserId;
      isAdmin = adminIds.some(id => id === rawUserId);
      userData = {
        id: parseInt(rawUserId, 10) || 0,
        firstName: req.headers['x-tg-first-name'] as string || '',
        username: req.headers['x-tg-username'] as string || '',
      };
      console.log('[Auth] DEV header - user:', tgUserId, 'isAdmin:', isAdmin);
    }
  }

  // Log final state for debugging
  console.log('[Auth] Final - userId:', tgUserId, 'isAdmin:', isAdmin, 'adminIds:', adminIds, 'botToken:', !!botToken);

  return {
    db,
    isAdmin,
    tgUserId,
    userData,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
