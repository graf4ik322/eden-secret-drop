/**
 * SettingsPage — настройки аккаунта.
 * Привязка Telegram к email, аватар, информация.
 */

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, User, Check, Link2, Upload, Mail, Smartphone, Loader2, Bell, BellOff } from 'lucide-react';
import { getTelegramAuth } from '@/lib/telegram-auth';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui/Input';
import { canUsePushNotifications, requestAndSubscribe, unsubscribe, getPushStatus } from '@/lib/pushNotifications';

export default function SettingsPage() {
  const { user: storeUser } = useAuthStore();
  const tgData = getTelegramAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isTelegramUser = !!tgData.initData;
  const isEmailUser = !!storeUser?.email && !isTelegramUser;

  const [email, setEmail] = useState(storeUser?.email || '');
  const [password, setPassword] = useState('');
  const [linkStatus, setLinkStatus] = useState<'idle' | 'linking' | 'success' | 'error'>('idle');
  const [linkError, setLinkError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushToggling, setPushToggling] = useState(false);
  const canPush = canUsePushNotifications();

  // Проверяем статус push-подписки при монтировании
  useEffect(() => {
    if (canPush) {
      getPushStatus().then(status => setPushSubscribed(status.subscribed));
    }
  }, [canPush]);

  /** Включить / выключить push-уведомления */
  const handlePushToggle = async () => {
    setPushToggling(true);
    try {
      if (pushSubscribed) {
        await unsubscribe();
        setPushSubscribed(false);
      } else {
        const ok = await requestAndSubscribe();
        setPushSubscribed(ok);
      }
    } finally {
      setPushToggling(false);
    }
  };

  /** Привязать Telegram к email */
  const handleLinkTelegram = async () => {
    if (!tgData.initData || !email || !password) {
      setLinkError('Email, password, and Telegram are required');
      return;
    }

    setLinkStatus('linking');
    setLinkError('');

    try {
      const res = await fetch('/api/auth/link-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: tgData.initData, email, password }),
      });
      if (res.ok) {
        setLinkStatus('success');
        // Обновляем user в store
        useAuthStore.getState().setUser({
          ...storeUser!,
          firstName: tgData.firstName || storeUser?.firstName || '',
          username: tgData.username || storeUser?.username || '',
        });
      } else {
        const data = await res.json();
        setLinkError(data.error || 'Failed to link Telegram');
        setLinkStatus('error');
      }
    } catch {
      setLinkError('Network error');
      setLinkStatus('error');
    }
  };

  /** Загрузка аватара (пока только preview) */
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-dvh safe-top scroll-safe">
      <header className="app-header flex items-center justify-between px-4">
        <button onClick={() => window.history.length > 1 ? window.history.back() : window.location.hash = '#/'} className="back-btn w-11 h-11 rounded-full glass-card flex items-center justify-center">
          <ArrowLeft size={20} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Settings</h1>
        <div className="w-[44px]" />
      </header>

      {/* Avatar section */}
      <section className="mx-4 mt-4 glass-card p-6">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0"
            style={{ background: 'var(--surface)', border: '2px solid rgba(212,175,116,0.3)' }}>
            {avatarPreview ? (
              <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
            ) : tgData.photoUrl ? (
              <img src={tgData.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : storeUser?.firstName ? (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-700 to-emerald-900">
                <span className="text-lg font-bold text-white">
                  {storeUser.firstName.charAt(0).toUpperCase()}
                </span>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User size={28} style={{ color: 'var(--gold)' }} />
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Profile Picture</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              {isTelegramUser ? 'From Telegram' : 'Upload your own'}
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleAvatarSelect}
          />
          <Button variant="ghost" onClick={() => fileInputRef.current?.click()}>
            <Upload size={18} />
          </Button>
        </div>
      </section>

      {/* Account info */}
      <section className="mx-4 mt-3 glass-card p-4 space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Account</h2>

        {storeUser?.email && (
          <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <Mail size={16} />
            <span>{storeUser.email}</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: 'rgb(16,185,129)' }}>
              Verified
            </span>
          </div>
        )}

        {isTelegramUser && (
          <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <Smartphone size={16} />
            <span>@{tgData.username || tgData.firstName || 'Telegram User'}</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.1)', color: 'rgb(59,130,246)' }}>
              Telegram
            </span>
          </div>
        )}
      </section>

      {/* Link Telegram section (для email-пользователей) */}
      {isEmailUser && (
        <section className="mx-4 mt-3 glass-card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Link2 size={18} style={{ color: 'var(--gold)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Link Telegram</h2>
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Connect your Telegram account for seamless login and notifications.
          </p>

          {linkStatus === 'success' ? (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(16,185,129,0.1)', color: 'rgb(16,185,129)' }}>
              <Check size={18} />
              Telegram linked successfully!
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />

              {linkError && (
                <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: 'rgb(239,68,68)' }}>
                  {linkError}
                </div>
              )}

              <Button
                fullWidth
                onClick={handleLinkTelegram}
                disabled={linkStatus === 'linking'}
              >
                {linkStatus === 'linking' ? (
                  <><Loader2 size={18} className="mr-2 animate-spin" /> Linking…</>
                ) : (
                  <><Link2 size={18} className="mr-2" /> Link Telegram</>
                )}
              </Button>

              <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
                Open this page from Telegram Mini App to link automatically
              </p>
            </div>
          )}
        </section>
      )}

      {/* Already linked info */}
      {isTelegramUser && storeUser?.email && (
        <section className="mx-4 mt-3 glass-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Check size={18} style={{ color: 'rgb(16,185,129)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Accounts Linked</h2>
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Your Telegram and email accounts are connected.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs"
              style={{ background: 'rgba(59,130,246,0.1)', color: 'rgb(59,130,246)' }}>
              <Smartphone size={12} /> Telegram
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs"
              style={{ background: 'rgba(16,185,129,0.1)', color: 'rgb(16,185,129)' }}>
              <Mail size={12} /> Email
            </span>
          </div>
        </section>
      )}

      {/* Push Notifications section (только для PWA/email users) */}
      {canPush && (
        <section className="mx-4 mt-3 glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {pushSubscribed ? (
                <Bell size={18} style={{ color: 'var(--gold)' }} />
              ) : (
                <BellOff size={18} style={{ color: 'var(--muted)' }} />
              )}
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Push Notifications</h2>
            </div>
            <button
              onClick={handlePushToggle}
              disabled={pushToggling}
              className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
                pushSubscribed
                  ? 'bg-emerald-500/40'
                  : 'bg-white/10'
              }`}
            >
              {pushToggling ? (
                <Loader2 size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--gold)' }} />
              ) : (
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                    pushSubscribed ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`}
                />
              )}
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {pushSubscribed
              ? 'You will receive notifications about new drops.'
              : 'Enable to get notified when new drops are released.'}
          </p>
        </section>
      )}

      <div className="h-8" />
    </div>
  );
}
