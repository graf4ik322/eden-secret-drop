import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { db } from '../db';

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  // Admin IDs from env (comma-separated)
  const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
  const isDev = process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true';

  let tgUserId: string | null = null;
  let isAdmin = false;

  // Method 1: Try Telegram initData header (from Mini App)
  const authHeader = (req.headers['x-telegram-init-data'] || req.headers['authorization']) as string | undefined;
  if (authHeader) {
    try {
      // Try parsing as JSON first (Telegram initData)
      const decoded = decodeURIComponent(authHeader);
      const parsed = JSON.parse(decoded);
      tgUserId = String(parsed.user?.id || parsed.id || '');
      isAdmin = adminIds.includes(tgUserId);
    } catch {
      // Try parsing as raw initData string (hash-based)
      const params = new URLSearchParams(authHeader);
      const userStr = params.get('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          tgUserId = String(user.id);
          isAdmin = adminIds.includes(tgUserId);
        } catch {}
      }
    }
  }

  // Method 2: Dev bypass — x-admin-id header (only in dev/test)
  if (!isAdmin && isDev) {
    const devId = req.headers['x-admin-id'] as string | undefined;
    const isDevMode = req.headers['x-dev-mode'] as string | undefined;
    if (devId) {
      tgUserId = devId;
      isAdmin = adminIds.includes(devId);
    }
    // Auto-grant admin in dev mode if no specific ID needed
    if (!isAdmin && isDevMode) {
      tgUserId = 'dev-' + (devId || 'user');
      isAdmin = true; // Grant admin in dev mode
    }
  }
  // Method 3: If no auth at all but adminIds has '0' or 'dev', allow in dev mode
  if (!isAdmin && isDev && adminIds.includes('dev')) {
    isAdmin = true;
    tgUserId = 'dev-user';
  }
  
  // Log auth state for debugging
  if (!isAdmin && !tgUserId) {
    console.log('[Auth] No auth data — headers:', Object.keys(req.headers).filter(h => h.startsWith('x-')).join(','));
  }



  return {
    db,
    isAdmin,
    tgUserId,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
