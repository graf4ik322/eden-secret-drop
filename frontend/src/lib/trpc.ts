import { QueryClient } from '@tanstack/react-query';

const BASE_URL = typeof window !== 'undefined' ? '' : 'http://localhost:3001';

interface FetchOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
}

async function trpcCall(path: string, options: FetchOptions = {}) {
  const url = `${BASE_URL}/trpc/${path}`;
  // Attach Telegram initData for admin auth
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initData) {
      headers['x-telegram-init-data'] = tg.initData;
    }
    // Dev mode: use admin ID from URL param or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const adminId = urlParams.get('admin_id') || localStorage.getItem('eden_admin_id');
    if (adminId) {
      headers['x-admin-id'] = adminId;
    }
  }
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`tRPC error ${res.status}: ${text}`);
  }
  const json = await res.json();
  // tRPC v11 batch responses wrap in [{ result: { data } }]
  if (Array.isArray(json)) return json[0]?.result?.data ?? json;
  return json?.result?.data ?? json;
}

// Query: GET based
export function trpcQuery(path: string, input?: Record<string, unknown>) {
  const params = input ? '?' + new URLSearchParams(
    Object.entries(input).map(([k, v]) => [k, String(v)])
  ).toString() : '';
  return trpcCall(`${path}${params}`, { method: 'GET' });
}

// Mutation: POST based
export function trpcMutate(path: string, input: unknown) {
  return trpcCall(path, { method: 'POST', body: input });
}

// TanStack Query hooks — simple wrappers
export function getTrpcQueryOptions(path: string, input?: Record<string, unknown>) {
  return {
    queryKey: ['trpc', path, input],
    queryFn: () => trpcQuery(path, input),
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});
