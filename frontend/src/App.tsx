import { Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, HashRouter, useNavigate, useLocation } from 'react-router-dom';
import { routes } from '@/navigation/routes';

/** Wraps route content with fade-in transition (TZ §16) */
function AnimatedOutlet({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  // HashRouter НЕ сбрасывает scroll при навигации — делаем вручную
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  return (
    <div key={location.pathname} className="animate-fade-in">
      {children}
    </div>
  );
}

/**
 * Parses start_param from Telegram initData and navigates to drop if present.
 * Handles format: drop_SD-XXXX
 */
function StartParamRouter({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    if (processed) return;

    // 1. Try from @tma.js/sdk initData (restored in init.ts)
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.initDataUnsafe?.start_param) {
        const sp = tg.initDataUnsafe.start_param as string;
        if (sp.startsWith('drop_')) {
          const displayId = sp.slice(5);
          navigate(`/drop/${displayId}`, { replace: true });
          setProcessed(true);
          return;
        }
      }
    } catch { /* ignore */ }

    // 2. Try from URL hash (tgWebAppStartParam)
    try {
      const qp = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const sp = qp.get('tgWebAppStartParam');
      if (sp?.startsWith('drop_')) {
        const displayId = sp.slice(5);
        navigate(`/drop/${displayId}`, { replace: true });
        setProcessed(true);
        return;
      }
    } catch { /* ignore */ }

    // 3. Try from URL query (for debugging in browser)
    try {
      const qp = new URLSearchParams(window.location.search);
      const sp = qp.get('startapp') || qp.get('start_param');
      if (sp?.startsWith('drop_')) {
        const displayId = sp.slice(5);
        navigate(`/drop/${displayId}`, { replace: true });
        setProcessed(true);
        return;
      }
      // startapp=studio → navigate to Studio
      if (sp === 'studio' || sp === 'admin') {
        navigate('/studio', { replace: true });
        setProcessed(true);
        return;
      }
    } catch { /* ignore */ }

    setProcessed(true);
  }, [navigate, processed]);

  return <>{children}</>;
}

export function App() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--emerald)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <HashRouter>
      <StartParamRouter>
        <Suspense fallback={
          <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--bg)' }}>
            <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--emerald)', borderTopColor: 'transparent' }} />
          </div>
        }>
          <Routes>
            {routes.map(({ path, Component }) => (
              <Route
                key={path}
                path={path}
                element={
                  <AnimatedOutlet>
                    <Component />
                  </AnimatedOutlet>
                }
              />
            ))}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </StartParamRouter>
    </HashRouter>
  );
}
