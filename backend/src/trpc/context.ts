import { validate, hashToken, parse } from '@tma.js/init-data-node';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { db } from '../db';

/**
 * Official Telegram Mini Apps initData validation.
 * Docs: https://docs.telegram-mini-apps.com/platform/init-data
 * Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 *
 * The frontend sends initData via:
 *   Authorization: tma {raw_init_data_string}
 *
 * Backend validates HMAC-SHA256 signature and extracts user ID.
 */
export async function createContext({ req }: CreateFastifyContextOptions) {
  const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
  const botToken = process.env.BOT_TOKEN || '';
  const isDev = process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true';

  let tgUserId: string | null = null;
  let isAdmin = false;
  let user: { id: number; firstName: string; username?: string; photoUrl?: string } | null = null;

  // === STEP 1: Extract initData from Authorization header ===
  // Official spec: "tma {init_data}"
  const authHeader = req.headers.authorization as string | undefined;

  if (authHeader && authHeader.startsWith('tma ')) {
    const rawInitData = authHeader.slice(4).trim();

    // === STEP 2: Validate HMAC-SHA256 signature ===
    if (botToken) {
      try {
        validate(rawInitData, botToken);
        // If validate() doesn't throw, initData is authentic

        // === STEP 3: Parse validated data ===
        const parsed = parse(rawInitData);
        if (parsed.user) {
          user = parsed.user;
          tgUserId = String(parsed.user.id);
          isAdmin = adminIds.includes(tgUserId);
        }
      } catch (err) {
        console.error('[Auth] initData validation failed:', err);
      }
    } else {
      // No BOT_TOKEN — skip validation (dev mode), parse directly
      try {
        const parsed = parse(rawInitData);
        if (parsed.user) {
          user = parsed.user;
          tgUserId = String(parsed.user.id);
          isAdmin = adminIds.includes(tgUserId);
        }
      } catch {
        // Silent fail
      }
    }
  }

  // === DEV BYPASS (only when DEV_MODE=true) ===
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
    user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
