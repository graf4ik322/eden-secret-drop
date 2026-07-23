import { Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, HashRouter, useNavigate, useLocation } from 'react-router-dom';
import { routes } from '@/navigation/routes';
import { useAuthStore } from '@/store/auth';
import { loginWithTelegram } from '@/lib/auth-api';
import { getTelegramAuth } from '@/lib/telegram-auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GlassCard } from '@/components/ui/GlassCard';
import { Hexagon, ArrowLeft, ShieldCheck } from 'lucide-react';
import SettingsPage from '@/pages/Settings/SettingsPage';

/** Wraps route content with fade-in transition */
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
 * AuthGate — защищает роуты, требующие аутентификации.
 * 
 * - Если есть JWT → показываем контент
 * - Если нет JWT, но есть initData (Telegram) → автологин
 * - Если нет ни JWT, ни initData (PWA/web) → редирект на /login
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { accessToken, isAuthenticated } = useAuthStore();
  const [state, setState] = useState<'loading' | 'ready' | 'redirect-login'>('loading');
  const tgData = getTelegramAuth();

  useEffect(() => {
    if (accessToken || isAuthenticated) {
      setState('ready');
      return;
    }

    if (tgData.initData) {
      // Telegram Mini App — пробуем автологин
      loginWithTelegram().then((res) => {
        setState(res ? 'ready' : 'redirect-login');
      });
    } else {
      // PWA/web без JWT — редирект на логин
      setState('redirect-login');
    }
  }, []);

  if (state === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-dark-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
      </div>
    );
  }

  if (state === 'redirect-login') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <HashRouter>
      <StartParamRouter>
        <Routes>
          {/* Auth pages (outside AuthGate — доступны без авторизации) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected routes (нужен JWT или initData) */}
          <Route
            path="/*"
            element={
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
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AuthGate>
            }
          />
        </Routes>
      </StartParamRouter>
    </HashRouter>
  );
}

/* ===== Auth Pages ===== */

/** EDEN brand mark */
function EdenLogo({ size = 60 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Hexagon size={size} className="text-emerald-400" strokeWidth={1.5} />
      <h1 className="font-serif text-3xl tracking-widest" style={{ color: 'var(--gold)' }}>
        E.S.D
      </h1>
    </div>
  );
}

/** Telegram login button — показывается только внутри Mini App */
function TelegramLoginBtn() {
  const navigate = useNavigate();
  const tgData = getTelegramAuth();
  if (!tgData.initData) return null;

  return (
    <Button
      variant="secondary"
      fullWidth
      onClick={async () => {
        const { loginWithTelegram } = await import('@/lib/auth-api');
        const res = await loginWithTelegram();
        if (res) navigate('/', { replace: true });
      }}
    >
      <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
      Sign in with Telegram
    </Button>
  );
}

/** Divider with "or" text */
function OrDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1" style={{ backgroundColor: 'var(--border)' }} />
      <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>or</span>
      <div className="h-px flex-1" style={{ backgroundColor: 'var(--border)' }} />
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { loginEmail } = await import('@/lib/auth-api');
      const result = await loginEmail(email, password);
      if (result) navigate('/', { replace: true });
      else setError('Invalid email or password');
    } catch {
      setError('Login failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-dark-950 px-4 safe-top">
      <div className="mb-8">
        <EdenLogo />
      </div>

      <GlassCard className="w-full max-w-sm p-6 space-y-5">
        <div className="text-center">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Welcome back</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Sign in to your account</p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <OrDivider />

        <TelegramLoginBtn />

        <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>
          <button onClick={() => navigate('/forgot-password')} className="underline underline-offset-2 transition-colors hover:text-emerald-400" style={{ color: 'var(--muted)' }}>
            Forgot password?
          </button>
          &nbsp;·&nbsp;
          Don't have an account?{' '}
          <button onClick={() => navigate('/register')} className="font-medium underline underline-offset-2 transition-colors hover:text-emerald-400" style={{ color: 'var(--gold)' }}>
            Register
          </button>
        </p>
      </GlassCard>
    </div>
  );
}

function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { registerEmail } = await import('@/lib/auth-api');
      await registerEmail(email, password);
      navigate(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-dark-950 px-4 safe-top">
      <button onClick={() => navigate('/login')} className="mb-6 self-start flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="mb-8">
        <EdenLogo />
      </div>

      <GlassCard className="w-full max-w-sm p-6 space-y-5">
        <div className="text-center">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Create account</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Join EDEN Secret Drop</p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <Input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </Button>
        </form>

        <OrDivider />

        <TelegramLoginBtn />

        <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="font-medium underline underline-offset-2 transition-colors hover:text-emerald-400" style={{ color: 'var(--gold)' }}>
            Sign In
          </button>
        </p>
      </GlassCard>
    </div>
  );
}

function VerifyPage() {
  const navigate = useNavigate();
  // Get email from hash: #/verify?email=xxx
  const searchParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const email = searchParams.get('email') || '';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(true);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { verifyEmail } = await import('@/lib/auth-api');
      const result = await verifyEmail(email, code);
      if (result) navigate('/', { replace: true });
      else setError('Invalid or expired code');
    } catch {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setSent(false);
    try {
      const { registerEmail } = await import('@/lib/auth-api');
      await registerEmail(email, '');
    } catch {}
    setSent(true);
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-dark-950 px-4 safe-top">
      <div className="mb-8">
        <EdenLogo />
      </div>

      <GlassCard className="w-full max-w-sm p-6 space-y-5">
        <div className="text-center">
          <ShieldCheck size={28} className="mx-auto text-emerald-400" strokeWidth={1.5} />
          <h2 className="mt-2 text-lg font-semibold" style={{ color: 'var(--text)' }}>Verify your email</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            Enter the 6-digit code sent to{'\n'}{email || 'your email'}
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="flex justify-center">
            <input
              type="text"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="glass-card h-16 w-48 rounded-2xl border border-white/10 text-center text-3xl tracking-[0.5em] outline-none transition-all duration-200 focus:border-gold focus:shadow-glow-gold"
              style={{ color: 'var(--text)', background: 'var(--surface)' }}
              required
            />
          </div>
          <Button type="submit" fullWidth disabled={loading || code.length !== 6}>
            {loading ? 'Verifying…' : 'Verify'}
          </Button>
        </form>

        <div className="text-center">
          <button
            onClick={handleResend}
            disabled={!sent}
            className="text-sm underline-offset-2 transition-colors hover:text-emerald-400 disabled:opacity-50"
            style={{ color: 'var(--muted)' }}
          >
            Resend code
          </button>
        </div>

        <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>
          <button onClick={() => navigate('/login')} className="underline underline-offset-2 transition-colors hover:text-emerald-400" style={{ color: 'var(--gold)' }}>
            Back to Sign In
          </button>
        </p>
      </GlassCard>
    </div>
  );
}

/* ===== Forgot Password ===== */

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/email/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
        setTimeout(() => navigate(`/reset-password?email=${encodeURIComponent(email)}`), 2000);
      } else {
        const data = await res.json();
        setError(data.error || 'Something went wrong');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-dark-950 px-4 safe-top">
      <div className="mb-8">
        <EdenLogo />
      </div>

      <GlassCard className="w-full max-w-sm p-6 space-y-5">
        <div className="text-center">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Forgot password</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            {sent ? 'Check your email for the reset code' : 'Enter your email to receive a reset code'}
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'Sending…' : 'Send Reset Code'}
            </Button>
          </form>
        ) : (
          <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-400">
            Code sent! Redirecting…
          </div>
        )}

        <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>
          <button onClick={() => navigate('/login')} className="underline underline-offset-2 transition-colors hover:text-emerald-400" style={{ color: 'var(--gold)' }}>
            Back to Sign In
          </button>
        </p>
      </GlassCard>
    </div>
  );
}

/* ===== Reset Password ===== */

function ResetPasswordPage() {
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const emailFromUrl = searchParams.get('email') || '';
  const [email, setEmail] = useState(emailFromUrl);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/email/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 2000);
      } else {
        const data = await res.json();
        setError(data.error || 'Reset failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-dark-950 px-4 safe-top">
      <button onClick={() => navigate('/forgot-password')} className="mb-6 self-start flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="mb-8">
        <EdenLogo />
      </div>

      <GlassCard className="w-full max-w-sm p-6 space-y-5">
        <div className="text-center">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
            {success ? 'Password reset!' : 'Reset password'}
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            {success ? 'Redirecting to login…' : 'Enter the 6-digit code from your email'}
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!emailFromUrl && (
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            )}
            <input
              type="text"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="glass-card h-16 w-full rounded-2xl border border-white/10 text-center text-3xl tracking-[0.5em] outline-none transition-all duration-200 focus:border-gold focus:shadow-glow-gold"
              style={{ color: 'var(--text)', background: 'var(--surface)' }}
              required
            />
            <Input
              type="password"
              placeholder="New password (min 6 chars)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'Resetting…' : 'Reset Password'}
            </Button>
          </form>
        ) : (
          <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-400">
            Password changed successfully!
          </div>
        )}

        <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>
          <button onClick={() => navigate('/login')} className="underline underline-offset-2 transition-colors hover:text-emerald-400" style={{ color: 'var(--gold)' }}>
            Back to Sign In
          </button>
        </p>
      </GlassCard>
    </div>
  );
}
