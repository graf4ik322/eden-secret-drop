import { Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, HashRouter, useNavigate } from 'react-router-dom';
import { routes } from '@/navigation/routes';

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
      const sp = qp.get('startapp');
      if (sp?.startsWith('drop_')) {
        const displayId = sp.slice(5);
        navigate(`/drop/${displayId}`, { replace: true });
        setProcessed(true);
        return;
      }
    } catch { /* ignore */ }

    setProcessed(true);
  }, [navigate, processed]);

  if (!processed) return null;
  return <>{children}</>;
}

export function App() {
  return (
    <HashRouter>
      <StartParamRouter>
        <Suspense fallback={null}>
          <Routes>
            {routes.map((route) => (
              <Route key={route.path} path={route.path} Component={route.Component} />
            ))}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </StartParamRouter>
    </HashRouter>
  );
}
