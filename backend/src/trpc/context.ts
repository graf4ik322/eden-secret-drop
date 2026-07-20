import { validate, parse } from '@tma.js/init-data-node';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { db } from '../db';

/**
 * Official Telegram Mini Apps initData validation + fallback auth.
 * Docs: https://docs.telegram-mini-apps.com/platform/init-data
 * Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 *
 * Primary auth: Authorization: tma {initData} (HMAC-validated)
 * Fallback: x-tg-user-id (from initDataUnsafe.user.id)
 */
export async function createContext({ req }: CreateFastifyContextOptions) {
  const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
  const botToken = process.env.BOT_TOKEN || '';
  const isDev = process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true';

  let tgUserId: string | null = null;
  let isAdmin = false;
  let userData: { id: number; firstName: string; username?: string } | null = null;

  // === METHOD A: x-tg-user-id header (from initDataUnsafe.user.id) ===
  // Most reliable — Telegram always injects initDataUnsafe.user in WebView
  const rawUserId = req.headers['x-tg-user-id'] as string | undefined;
  const firstName = req.headers['x-tg-first-name'] as string | undefined;
  const username = req.headers['x-tg-username'] as string | undefined;

  if (rawUserId) {
    tgUserId = rawUserId;
    isAdmin = adminIds.includes(tgUserId);
    userData = {
      id: parseInt(rawUserId, 10) || 0,
      firstName: firstName || '',
      username: username || '',
    };
  }

  // === METHOD B: Authorization: tma {initData} (official HMAC validation) ===
  // Overrides if validated and matches
  const authHeader = req.headers.authorization as string | undefined;
  if (authHeader && authHeader.startsWith('tma ')) {
    const rawInitData = authHeader.slice(4).trim();
    
    if (botToken) {
      try {
        validate(rawInitData, botToken);
        const parsed = parse(rawInitData);
        if (parsed.user) {
          const vid = String(parsed.user.id);
          // Only override if IDs match or no fallback was set
          if (!tgUserId || tgUserId === vid) {
            tgUserId = vid;
            isAdmin = adminIds.includes(vid);
            userData = {
              id: parsed.user.id,
              firstName: parsed.user.firstName || firstName || '',
              username: parsed.user.username || username || '',
            };
          }
        }
      } catch (err) {
        console.error('[Auth] initData validation failed:', (err as Error).message);
        // Don't clear existing auth — keep the fallback
      }
    } else {
      // No bot token: parse without validation (dev mode)
      try {
        const parsed = parse(rawInitData);
        if (parsed.user) {
          const vid = String(parsed.user.id);
          if (!tgUserId || tgUserId === vid) {
            tgUserId = vid;
            isAdmin = adminIds.includes(vid);
            userData = {
              id: parsed.user.id,
              firstName: parsed.user.firstName || firstName || '',
              username: parsed.user.username || username || '',
            };
          }
        }
      } catch {}
    }
  }

  // === DEV BYPASS ===
  if (!isAdmin && isDev) {
    const devId = req.headers['x-admin-id'] as string | undefined;
    if (devId && adminIds.includes(devId)) {
      tgUserId = devId;
      isAdmin = true;
    }
  }

  return {
    db,
    isAdmin,
    tgUserId,
    userData,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
