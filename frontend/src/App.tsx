import { Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, HashRouter, useNavigate, useLocation } from 'react-router-dom';
import { routes } from '@/navigation/routes';
import { useAuthStore } from '@/store/auth';
import { loginWithTelegram } from '@/lib/auth-api';
import { getTelegramAuth } from '@/lib/telegram-auth';

/** Wraps route content with fade-in transition (TZ §16) */
function AnimatedOutlet({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  return (
    <div key={location.pathname} className="animate-fade-in">
      {children}
    </div>
  );
}

/**
 * Parses start_param from Telegram initData and navigates to drop if present.
 */
function StartParamRouter({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    if (processed) return;

    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.initDataUnsafe?.start_param) {
        const sp = tg.initDataUnsafe.start_param as string;
        if (sp.startsWith('drop_')) {
          navigate(`/drop/${sp.slice(5)}`, { replace: true });
          setProcessed(true);
          return;
        }
      }
    } catch { /* ignore */ }

    try {
      const qp = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const sp = qp.get('tgWebAppStartParam');
      if (sp?.startsWith('drop_')) {
        navigate(`/drop/${sp.slice(5)}`, { replace: true });
        setProcessed(true);
        return;
      }
    } catch { /* ignore */ }

    setProcessed(true);
  }, [navigate, processed]);

  if (!processed) return null;
  return <>{children}</>;
}

/**
 * Telegram auto-login: если JWT нет, пытаемся войти через initData.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore();
  const [authReady, setAuthReady] = useState(false);
  const tgData = getTelegramAuth();

  useEffect(() => {
    // Если уже есть JWT или не в Telegram — не делаем авто-логин
    if (accessToken || !tgData.initData) {
      setAuthReady(true);
      return;
    }

    loginWithTelegram().then(() => {
      setAuthReady(true);
    });
  }, []);

  if (!authReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-dark-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <HashRouter>
      <StartParamRouter>
        <AuthGate>
          <Routes>
            {routes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={
                  <Suspense
                    fallback={
                      <div className="flex min-h-dvh items-center justify-center bg-dark-950">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                      </div>
                    }
                  >
                    <AnimatedOutlet>
                      <route.Component />
                    </AnimatedOutlet>
                  </Suspense>
                }
              />
            ))}
            {/* Auth pages */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthGate>
      </StartParamRouter>
    </HashRouter>
  );
}

/* ===== Auth Pages ===== */

function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleTelegramLogin = async () => {
    const { loginWithTelegram } = await import('@/lib/auth-api');
    const tgData = getTelegramAuth();
    if (tgData.initData) {
      await loginWithTelegram();
      navigate('/', { replace: true });
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { loginEmail } = await import('@/lib/auth-api');
      const result = await loginEmail(email, password);
      if (result) navigate('/', { replace: true });
      else setError('Invalid email or password');
    } catch (err) {
      setError('Login failed');
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-dark-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-center font-serif text-3xl text-emerald-400">EDEN</h1>
        <p className="text-center text-sm text-gray-400">Sign in to your account</p>

        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full rounded-xl border border-dark-700 bg-dark-900 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-emerald-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full rounded-xl border border-dark-700 bg-dark-900 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-emerald-500"
            required
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-500 py-3 font-semibold text-white transition hover:bg-emerald-600"
          >
            Sign In
          </button>
        </form>

        {getTelegramAuth().initData && (
          <button
            onClick={handleTelegramLogin}
            className="w-full rounded-xl border border-dark-700 py-3 text-sm text-gray-300 transition hover:border-emerald-500 hover:text-emerald-400"
          >
            Sign in with Telegram
          </button>
        )}

        <p className="text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <button onClick={() => navigate('/register')} className="text-emerald-400 hover:underline">
            Register
          </button>
        </p>
      </div>
    </div>
  );
}

function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const { registerEmail } = await import('@/lib/auth-api');
      await registerEmail(email, password);
      navigate(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-dark-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-center font-serif text-3xl text-emerald-400">EDEN</h1>
        <p className="text-center text-sm text-gray-400">Create your account</p>

        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full rounded-xl border border-dark-700 bg-dark-900 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-emerald-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full rounded-xl border border-dark-700 bg-dark-900 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-emerald-500"
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl border border-dark-700 bg-dark-900 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-emerald-500"
            required
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-500 py-3 font-semibold text-white transition hover:bg-emerald-600"
          >
            Register
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="text-emerald-400 hover:underline">
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}

function VerifyPage() {
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const email = searchParams.get('email') || '';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const { verifyEmail } = await import('@/lib/auth-api');
      const result = await verifyEmail(email, code);
      if (result) navigate('/', { replace: true });
      else setError('Invalid or expired code');
    } catch (err) {
      setError('Verification failed');
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-dark-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-center font-serif text-3xl text-emerald-400">EDEN</h1>
        <p className="text-center text-sm text-gray-400">
          Enter the 6-digit code sent to {email || 'your email'}
        </p>

        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <form onSubmit={handleVerify} className="space-y-4">
          <input
            type="text"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full rounded-xl border border-dark-700 bg-dark-900 px-4 py-3 text-center text-2xl tracking-widest text-white placeholder-gray-500 outline-none focus:border-emerald-500"
            required
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-500 py-3 font-semibold text-white transition hover:bg-emerald-600"
          >
            Verify
          </button>
        </form>
      </div>
    </div>
  );
}
