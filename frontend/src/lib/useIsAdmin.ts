import { useAuthStore } from '@/store/auth';
import { useEffect } from 'react';

/**
 * Hook that checks if current user is admin.
 * Reads initData from Telegram WebApp and validates via backend.
 */
export function useIsAdmin(): boolean {
  const { user, isInitialized, setUser, setInitialized } = useAuthStore();
  
  useEffect(() => {
    if (isInitialized) return;
    
    async function check() {
      try {
        const tg = (window as any).Telegram?.WebApp;
        const initData = tg?.initData || '';
        
        if (!initData) {
          setUser(null);
          return;
        }

        const res = await fetch('/trpc/auth.checkAdmin', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-telegram-init-data': initData,
          },
          body: JSON.stringify({ initData }),
        });
        
        if (res.ok) {
          const data = await res.json();
          const result = data?.result?.data || data;
          setUser({ 
            id: result.userId || 0, 
            firstName: result.firstName || '',
            username: result.username || '',
            isAdmin: result.isAdmin || false,
          });
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    }
    
    check();
  }, [isInitialized, setUser, setInitialized]);
  
  return user?.isAdmin ?? false;
}
