import { QueryClient } from '@tanstack/react-query';

const BASE_URL = typeof window !== 'undefined' ? '' : 'http://localhost:3001';

interface FetchOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
}

async function trpcCall(path: string, options: FetchOptions = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initData) {
      headers['x-telegram-init-data'] = tg.initData;
    }
    const urlParams = new URLSearchParams(window.location.search);
    const adminId = urlParams.get('admin_id') || localStorage.getItem('eden_admin_id');
    if (adminId) {
      headers['x-admin-id'] = adminId;
    }
  }

  let url = `${BASE_URL}/trpc/${path}`;
  
  if (options.method === 'GET' && options.body) {
    // tRPC GET: encode input as JSON query param
    const input = encodeURIComponent(JSON.stringify(options.body));
    url += `?input=${input}`;
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.method === 'POST' && options.body
      ? JSON.stringify(options.body)
      : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`tRPC error ${res.status}: ${text}`);
  }

  const json = await res.json();
  // Handle both batch and single response formats
  if (Array.isArray(json)) return json[0]?.result?.data ?? json;
  return json?.result?.data ?? json;
}

// Query: GET with tRPC-compatible input encoding
export function trpcQuery(path: string, input?: Record<string, unknown>) {
  return trpcCall(path, { method: 'GET', body: input });
}

// Mutation: POST with JSON body
export function trpcMutate(path: string, input: unknown) {
  return trpcCall(path, { method: 'POST', body: input });
}

// TanStack Query options
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
