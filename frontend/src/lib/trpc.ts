import { QueryClient } from '@tanstack/react-query';
import { getTelegramAuth } from './telegram-auth';

const BASE_URL = typeof window !== 'undefined' ? '' : 'http://localhost:3001';

async function trpcCall(path: string, options: { method?: 'GET' | 'POST'; body?: unknown } = {}) {
  const headers: Record<string, string> = {};
  
  const tgData = getTelegramAuth();
  
  // Для POST нужно Content-Type, для GET — не шлём
  if (options.method === 'POST' && options.body) {
    headers['Content-Type'] = 'application/json';
  }

  // Auth через Authorization header (основной способ)
  if (tgData.userId) headers['x-tg-user-id'] = tgData.userId;
  if (tgData.initData) headers['authorization'] = 'tma ' + tgData.initData;
  if (tgData.firstName) headers['x-tg-first-name'] = tgData.firstName;
  if (tgData.username) headers['x-tg-username'] = tgData.username;

  let url = `${BASE_URL}/trpc/${path}`;

  // Query params via URLSearchParams
  const qp: Record<string, string> = {};
  if (options.method === 'GET' && options.body) {
    qp.input = JSON.stringify(options.body);
  }
  // Auth как query params — fallback если прокси срезает заголовки
  if (tgData.initData) qp.__tg_initData = tgData.initData;
  if (tgData.userId) qp.__tg_userId = tgData.userId;

  const qs = new URLSearchParams(qp).toString();
  if (qs) url += (url.includes('?') ? '&' : '?') + qs;

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
