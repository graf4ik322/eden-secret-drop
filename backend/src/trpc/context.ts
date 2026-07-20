import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { db } from '../db';

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  // Admin IDs from env (comma-separated)
  const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim()).filter(Boolean);

  // Try to extract TG user from initData header
  let tgUserId: string | null = null;
  let isAdmin = false;

  const authHeader = req.headers['x-telegram-init-data'] as string | undefined;
  if (authHeader) {
    try {
      const parsed = JSON.parse(decodeURIComponent(authHeader));
      tgUserId = String(parsed.user?.id || parsed.id || '');
      isAdmin = adminIds.includes(tgUserId);
    } catch {
      // not authenticated
    }
  }

  return {
    db,
    isAdmin,
    tgUserId,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
