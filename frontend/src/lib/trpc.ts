import { QueryClient } from '@tanstack/react-query';

const BASE_URL = typeof window !== 'undefined' ? '' : 'http://localhost:3001';

/**
 * Get initData from Telegram WebApp (injected by Telegram client).
 * Per official docs: https://core.telegram.org/bots/webapps#initializing-mini-apps
 */
function getInitData(): string {
  if (typeof window === 'undefined') return '';
  try {
    return (window as any).Telegram?.WebApp?.initData || '';
  } catch {
    return '';
  }
}

async function trpcCall(path: string, options: { method?: 'GET' | 'POST'; body?: unknown } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  // Official spec: send initData via Authorization header as "tma {initData}"
  // See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
  // See: https://docs.telegram-mini-apps.com/platform/init-data#sending-to-server
  const initData = getInitData();
  if (initData) {
    headers['authorization'] = 'tma ' + initData;
  }

  let url = `${BASE_URL}/trpc/${path}`;
  
  // tRPC GET: input must be JSON-encoded in a single "input" query param
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
