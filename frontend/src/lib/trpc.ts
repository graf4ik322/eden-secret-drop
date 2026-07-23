import { getTelegramAuth } from './telegram-auth';
import { useAuthStore } from '../store/auth';
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const BASE_URL = typeof window !== 'undefined' ? '' : 'http://localhost:3001';

/**
 * Получить initData для fallback-аутентификации (первый вход из Mini App).
 */
function getInitDataQuery(): Record<string, string> {
  const tgData = getTelegramAuth();
  if (!tgData.initData) return {};
  return { __tg_initData: tgData.initData, __tg_userId: tgData.userId };
}

/**
 * Получить заголовки авторизации.
 * 1. Bearer <JWT> — если есть access token (приоритет)
 * 2. tma <initData> — fallback для первого входа из Mini App
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const store = useAuthStore.getState();
  const headers: Record<string, string> = {};

  if (store.accessToken) {
    headers['Authorization'] = `Bearer ${store.accessToken}`;
  } else {
    const tgData = getTelegramAuth();
    if (tgData.initData) {
      headers['Authorization'] = `tma ${tgData.initData}`;
    }
  }

  return headers;
}

async function trpcCall(path: string, options: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<unknown> {
  const headers: Record<string, string> = {};

  // Content-Type для POST
  if (options.method === 'POST' && options.body) {
    headers['Content-Type'] = 'application/json';
  }

  // Auth: приоритет JWT Bearer → tma initData
  const authHeaders = await getAuthHeaders();
  Object.assign(headers, authHeaders);

  let url = `${BASE_URL}/trpc/${path}`;
  const qp: Record<string, string> = {};

  // input для GET через query params (tRPC convention)
  if (options.method === 'GET' && options.body) {
    qp.input = JSON.stringify(options.body);
  }

  // __tg_initData fallback — всегда, страховочная сетка для аутентификации
  const initDataQp = getInitDataQuery();
  Object.assign(qp, initDataQp);

  const qs = new URLSearchParams(qp).toString();
  if (qs) url += '?' + qs;

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: (options.method === 'POST' && options.body) ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    // Если 401 — попробуем обновить токен через refresh
    if (res.status === 401 && useAuthStore.getState().refreshToken) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        // Retry with new token
        return trpcCall(path, options);
      }
    }
    throw new Error(`tRPC ${res.status}: ${text.substring(0, 200)}`);
  }

  const json = await res.json();
  if (Array.isArray(json)) return json[0]?.result?.data ?? json[0] ?? json;
  return json?.result?.data ?? json;
}

/**
 * Попытка обновить access token через refresh token.
 */
async function attemptTokenRefresh(): Promise<boolean> {
  const store = useAuthStore.getState();
  const refreshToken = store.refreshToken;
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      store.logout();
      return false;
    }

    const data = await res.json();
    store.setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    store.logout();
    return false;
  }
}

export function trpcQuery(path: string, input?: Record<string, unknown>): Promise<unknown> {
  return trpcCall(path, { method: 'GET', body: input });
}

export function trpcMutate(path: string, input: unknown): Promise<unknown> {
  const promise = trpcCall(path, { method: 'POST', body: input });
  promise.then(() => queryClient.invalidateQueries({ queryKey: [path.split('.')[0]] }));
  return promise;
}

export function getTrpcQueryOptions(path: string, input?: Record<string, unknown>) {
  const section = path.split('.')[0];
  return {
    queryKey: [section, path, input],
    queryFn: () => trpcCall(path, { method: 'GET', body: input }) as Promise<unknown>,
    retry: 2,
    staleTime: 30_000,
  };
}

export function getTrpcQueryClient(): { query: typeof trpcQuery; mutate: typeof trpcMutate } {
  return { query: trpcQuery, mutate: trpcMutate };
}

export type TRPCClient = ReturnType<typeof getTrpcQueryClient>;
