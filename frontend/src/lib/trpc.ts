import { QueryClient } from '@tanstack/react-query';

const BASE_URL = typeof window !== 'undefined' ? '' : 'http://localhost:3001';

/**
 * Get Telegram user data from ALL available sources.
 * 
 * On Android Telegram v9.6+, window.Telegram.WebApp is NOT injected.
 * Data is passed ONLY via URL hash as tgWebAppData parameter.
 * 
 * See debug output:
 *   window.Telegram → ❌ NOT FOUND
 *   URL hash → ✅ tgWebAppData with full user data
 */
function getTelegramData(): { initData: string; userId: string; firstName: string; username: string } {
  const empty = { initData: '', userId: '', firstName: '', username: '' };
  if (typeof window === 'undefined') return empty;

  let rawInitData = '';
  let userId: string | null = null;
  let firstName = '';
  let tgUsername = '';

  // === SOURCE A: URL hash (tgWebAppData) ===
  // Most reliable across ALL Telegram clients (Android, iOS, Desktop)
  // Parsed FIRST because window.Telegram.WebApp is NOT injected on Android v9.6+
  if (!userId) {
    try {
      const hash = window.location.hash;
      if (hash) {
        const hp = new URLSearchParams(hash.substring(1));
        const tgData = hp.get('tgWebAppData') || hp.get('TgWebAppData');
        if (tgData) {
          // tgWebAppData is URL-encoded — decode once
          const decoded = decodeURIComponent(tgData);
          rawInitData = decoded;
          // Parse user from the decoded query string
          const qp = new URLSearchParams(decoded);
          const userStr = qp.get('user');
          if (userStr) {
            // user value is JSON — parse it
            const parsed = JSON.parse(userStr);
            userId = String(parsed.id);
            firstName = parsed.first_name || '';
            tgUsername = parsed.username || '';
          }
        }
      }
    } catch (e) {
      console.warn('[Telegram] URL hash parse failed:', e);
    }
  }

  // === SOURCE B: window.Telegram.WebApp ===
  // Works on iOS and some Desktop versions
  if (!userId) {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        // Prefer initDataUnsafe.user (parsed object, most reliable)
        if (tg.initDataUnsafe?.user?.id) {
            userId = String(tg.initDataUnsafe.user.id);
            firstName = tg.initDataUnsafe.user.first_name || '';
            tgUsername = tg.initDataUnsafe.user.username || '';
        }
        // Also capture raw initData if available
        if (tg.initData && !rawInitData) {
          rawInitData = tg.initData;
        }
      }
    } catch {}
  }

  return {
    initData: rawInitData,
    userId: userId || '',
    firstName: firstName,
    username: tgUsername,
  };
}

async function trpcCall(path: string, options: { method?: 'GET' | 'POST'; body?: unknown } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  const tgData = getTelegramData();
  
  if (tgData.userId) {
    headers['x-tg-user-id'] = tgData.userId;
  }
  
  if (tgData.initData) {
    headers['authorization'] = 'tma ' + tgData.initData;
  }

  if (tgData.firstName) headers['x-tg-first-name'] = tgData.firstName;
  if (tgData.username) headers['x-tg-username'] = tgData.username;

  let url = `${BASE_URL}/trpc/${path}`;
  
  if (options.method === 'GET' && options.body) {
    const input = encodeURIComponent(JSON.stringify(options.body));
    url += '?input=' + input;
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: (options.method === 'POST' && options.body) ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`tRPC ${res.status}: ${text.substring(0, 200)}`);
  }

  const json = await res.json();
  if (Array.isArray(json)) return json[0]?.result?.data ?? json[0] ?? json;
  return json?.result?.data ?? json;
}

export function trpcQuery(path: string, input?: Record<string, unknown>) {
  return trpcCall(path, { method: 'GET', body: input });
}

export function trpcMutate(path: string, input: unknown) {
  return trpcCall(path, { method: 'POST', body: input });
}

export function getTrpcQueryOptions(path: string, input?: Record<string, unknown>) {
  return {
    queryKey: ['trpc', path, input],
    queryFn: () => trpcQuery(path, input),
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
});
