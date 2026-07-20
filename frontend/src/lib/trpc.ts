import { QueryClient } from '@tanstack/react-query';

const BASE_URL = typeof window !== 'undefined' ? '' : 'http://localhost:3001';

interface FetchOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
}

async function trpcCall(path: string, options: FetchOptions = {}) {
  const url = `${BASE_URL}/trpc/${path}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
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
