import { QueryClient } from '@tanstack/react-query';

const BASE_URL = typeof window !== 'undefined' ? '' : 'http://localhost:3001';

/**
 * Get Telegram user data from ALL available sources.
 * Primary: window.Telegram.WebApp (native Telegram injection)
 * Fallback: @tma.js/sdk-react internal state
 */
function getTelegramData(): { initData: string; userId: string; firstName: string; username: string } {
  const empty = { initData: '', userId: '', firstName: '', username: '' };

  if (typeof window === 'undefined') return empty;

  // Method 1: Native Telegram WebApp API (fastest, most reliable in WebView)
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      const raw = tg.initData || '';
      const user = tg.initDataUnsafe?.user;
      if (user?.id) {
        return {
          initData: raw,
          userId: String(user.id),
          firstName: user.first_name || '',
          username: user.username || '',
        };
      }
      // Some Telegram Desktop versions have initDataUnsafe but not initData
      if (raw) {
        const params = new URLSearchParams(raw);
        const userStr = params.get('user');
        if (userStr) {
          try {
            const parsed = JSON.parse(userStr);
            return {
              initData: raw,
              userId: String(parsed.id),
              firstName: parsed.first_name || '',
              username: parsed.username || '',
            };
          } catch {}
        }
      }
    }
  } catch {}

  // Method 2: @tma.js/sdk-react SDK (if window.Telegram wasn't available)
  try {
    // @ts-ignore — dynamic SDK access
    const tgSDK = (window as any).Telegram?.WebApp;
    if (tgSDK?.initDataUnsafe?.user?.id) {
      return {
        initData: tgSDK.initData || '',
        userId: String(tgSDK.initDataUnsafe.user.id),
        firstName: tgSDK.initDataUnsafe.user.first_name || '',
        username: tgSDK.initDataUnsafe.user.username || '',
      };
    }
  } catch {}

  return empty;
}

async function trpcCall(path: string, options: { method?: 'GET' | 'POST'; body?: unknown } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  const tgData = getTelegramData();
  
  // ALWAYS send x-tg-user-id if available (most reliable auth method)
  if (tgData.userId) {
    headers['x-tg-user-id'] = tgData.userId;
  }
  
  // ALSO send official Authorization header with initData for validation
  if (tgData.initData) {
    headers['authorization'] = 'tma ' + tgData.initData;
  }

  // Send user info headers for Profile page
  if (tgData.firstName) {
    headers['x-tg-first-name'] = tgData.firstName;
  }
  if (tgData.username) {
    headers['x-tg-username'] = tgData.username;
  }

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
