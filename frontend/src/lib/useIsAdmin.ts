import { useQuery } from '@tanstack/react-query';
import { getTrpcQueryOptions } from '@/lib/trpc';

export type AdminState = 
  | { status: 'loading' }
  | { status: 'checked'; isAdmin: boolean; userId: string }
  | { status: 'error'; message: string };

/**
 * Hook that checks if current Telegram user is admin.
 * Uses official Telegram initData in Authorization header (tma format).
 * Handles loading state properly — returns AdminState, not a plain boolean.
 */
export function useIsAdmin(): AdminState {
  const { data, isLoading, error } = useQuery({
    ...getTrpcQueryOptions('auth.checkAdmin'),
    retry: 3,
    staleTime: 60 * 1000,
    retryDelay: 1000,
  });

  if (isLoading) {
    return { status: 'loading' };
  }

  if (error) {
    return { status: 'error', message: String(error) };
  }

  const result = data as { isAdmin?: boolean; userId?: string } | null | undefined;

  return {
    status: 'checked',
    isAdmin: result?.isAdmin ?? false,
    userId: result?.userId ?? '',
  };
}

/** Convenience hook that returns just boolean (for callers that handle loading elsewhere). */
export function useIsAdminBool(): boolean {
  const state = useIsAdmin();
  return state.status === 'checked' && state.isAdmin;
}
