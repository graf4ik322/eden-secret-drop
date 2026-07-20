import { QueryClient } from '@tanstack/react-query';
import { retrieveLaunchParams } from '@tma.js/sdk';

const BASE_URL = typeof window !== 'undefined' ? '' : 'http://localhost:3001';

/**
 * Get Telegram user data using ALL available methods.
 * 
 * Primary: retrieveLaunchParams() from @tma.js/sdk (official docs method)
 *   — reads tgWebAppData from URL hash
 * Fallback: window.Telegram.WebApp (native Telegram injection)
 * 
 * Per official docs: https://docs.telegram-mini-apps.com/platform/init-data#retrieving
 */
function getTelegramData(): { initData: string; userId: string; firstName: string; username: string } {
  const empty = { initData: '', userId: '', firstName: '', username: '' };

  if (typeof window === 'undefined') return empty;

  let rawInitData = '';
  let user: { id?: number; first_name?: string; username?: string } | null = null;

  // Method 1: retrieveLaunchParams() from @tma.js/sdk (official, most reliable)
  // Reads the tgWebAppData URL hash parameter directly
  try {
    const lp = retrieveLaunchParams();
    if (lp?.tgWebAppData) {
      rawInitData = String(lp.tgWebAppData);
      // Parse user from the initData query string
      const params = new URLSearchParams(rawInitData);
      const userStr = params.get('user');
      if (userStr) {
        user = JSON.parse(userStr);
      }
    }
  } catch {}

  // Method 2: window.Telegram.WebApp (native Telegram WebView injection)
  if (!user?.id) {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        rawInitData = tg.initData || rawInitData;
        if (tg.initDataUnsafe?.user?.id) {
          user = {
            id: tg.initDataUnsafe.user.id,
            first_name: tg.initDataUnsafe.user.first_name,
            username: tg.initDataUnsafe.user.username,
          };
        }
      }
    } catch {}
  }

  // Method 3: Parse URL hash directly (last resort)
  if (!user?.id && !rawInitData) {
    try {
      const hash = window.location.hash;
      if (hash && hash.includes('tgWebAppData=')) {
        const params = new URLSearchParams(hash.substring(1));
        const tgData = params.get('tgWebAppData');
        if (tgData) {
          rawInitData = decodeURIComponent(tgData);
          const qp = new URLSearchParams(rawInitData);
          const userStr = qp.get('user');
          if (userStr) user = JSON.parse(userStr);
        }
      }
    } catch {}
  }

  return {
    initData: rawInitData,
    userId: user?.id ? String(user.id) : '',
    firstName: user?.first_name || '',
    username: user?.username || '',
  };
}

async function trpcCall(path: string, options: { method?: 'GET' | 'POST'; body?: unknown } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  const tgData = getTelegramData();
  
  // ALWAYS send x-tg-user-id if available (most reliable auth method)
  if (tgData.userId) {
    headers['x-tg-user-id'] = tgData.userId;
  }
  
  // ALSO send official Authorization header with initData for HMAC validation
  if (tgData.initData) {
    headers['authorization'] = 'tma ' + tgData.initData;
  }

  // Send user info headers for Profile page
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
