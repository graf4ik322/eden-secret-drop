import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import { getTrpcQueryOptions } from '@/lib/trpc';

/**
 * Hook that checks if current Telegram user is admin.
 * Uses the trpcQuery helper which properly sends initData headers.
 */
export function useIsAdmin(): boolean {
  const { user, setUser } = useAuthStore();

  const { data } = useQuery({
    ...getTrpcQueryOptions('auth.checkAdmin'),
    retry: false,
    staleTime: 60 * 1000, // re-check every minute
  });

  const result = data as { isAdmin?: boolean; userId?: string } | null | undefined;

  if (result && user?.isAdmin !== result.isAdmin) {
    setUser({
      id: Number(result.userId) || 0,
      firstName: '',
      username: '',
      isAdmin: result.isAdmin || false,
    });
  }

  return result?.isAdmin ?? false;
}
