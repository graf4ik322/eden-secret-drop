import { validate, parse } from '@tma.js/init-data-node';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { db } from '../db';
import { subscribers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '../auth/jwt';

/**
 * Единственный источник правды для авторизации.
 * 
 * 1. PRIMARY: Authorization: Bearer *** — JWT access token
 * 2. FALLBACK: Authorization: tma *** — HMAC-валидация initData
 * 3. FALLBACK 2: query params __tg_initData — когда nginx срезает заголовки
 */
export async function createContext({ req }: CreateFastifyContextOptions) {
  try {
    const rawAdminIds = process.env.ADMIN_IDS || '';
    const adminIds = rawAdminIds.split(',').map(id => id.trim()).filter(Boolean);
    const botToken = process.env.BOT_TOKEN || '';

    if (adminIds.length === 0) {
      console.warn('[Auth] ADMIN_IDS is empty — no users will be recognized as admin');
    }

    let tgUserId: string | null = null;
    let isAdmin = false;
    let userData: { id: number; firstName: string; username?: string } | null = null;

    const authHeader = req.headers.authorization as string | undefined;

    // === PRIMARY: Authorization: Bearer *** (JWT) ===
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const payload = verifyToken(token);
      if (payload) {
        // Если есть telegram_id — используем его для admin check
        if (payload.telegram_id) {
          tgUserId = payload.telegram_id;
          isAdmin = adminIds.some(id => id === tgUserId);
        } else {
          // Иначе ищем subscriber в БД по ID из JWT
          tgUserId = payload.sub;
          try {
            const sub = await db
              .select({ tgUserId: subscribers.tgUserId, firstName: subscribers.firstName })
              .from(subscribers)
              .where(eq(subscribers.id, Number(payload.sub)))
              .then(r => r[0]);
            if (sub?.tgUserId) {
              tgUserId = sub.tgUserId;
              isAdmin = adminIds.some(id => id === sub.tgUserId);
              userData = { id: Number(payload.sub), firstName: sub.firstName || '', username: sub.tgUserId };
            }
          } catch { /* DB error — fallback к payload.sub */ }
        }

        if (!userData) {
          userData = { id: Number(payload.sub), firstName: '', username: tgUserId || payload.sub };
        }

        if (isAdmin) {
          console.log('[Auth] Admin via JWT:', tgUserId);
        }
      }
    }

    // === SECONDARY: Authorization: tma *** (initData HMAC) ===
    if (!tgUserId && authHeader?.startsWith('tma ')) {
      const rawInitData = authHeader.slice(4).trim();
      await extractFromInitData(rawInitData, adminIds);
    }

    // === FALLBACK: query params __tg_initData ===
    if (!tgUserId) {
      const qInitData = (req.query as Record<string, string>)?.['__tg_initData']
        || (req.query as Record<string, string>)?.['tg_initData'];
      if (qInitData) {
        await extractFromInitData(qInitData, adminIds);
      }
    }

    return { db, isAdmin, tgUserId, userData };

    // --- Helper: парсинг initData с BLOCKING HMAC валидацией ---
    async function extractFromInitData(initData: string, admins: string[]) {
      if (!botToken) {
        console.warn('[Auth] BOT_TOKEN not configured — cannot validate initData');
        return;
      }

      try {
        // HMAC validation — блокирует невалидный initData
        // expiresIn: 0 отключает проверку auth_date (Telegram initData может быть старым)
        validate(initData, botToken, { expiresIn: 0 });
      } catch (err) {
        console.warn('[Auth] HMAC validation FAILED — rejecting initData');
        return;
      }

      try {
        const parsed = parse(initData);
        if (!parsed.user) {
          console.warn('[Auth] No user in parsed initData');
          return;
        }

        const vid = String(parsed.user.id);
        tgUserId = vid;
        isAdmin = admins.some(id => id === vid);
        if (isAdmin) console.log('[Auth] Admin via initData:', vid);
        userData = {
          id: parsed.user.id,
          firstName: parsed.user.firstName || '',
          username: parsed.user.username || '',
        };
      } catch (parseErr) {
        console.warn('[Auth] Failed to parse initData:', (parseErr as Error).message);
      }
    }
  } catch (err) {
    console.error('[Auth] createContext CRASHED:', err);
    return { db, isAdmin: false, tgUserId: null, userData: null };
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>;
