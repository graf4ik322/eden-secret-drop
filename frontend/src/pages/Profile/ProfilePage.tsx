import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { User, Shield, Globe, ChevronRight, Settings, Mail, Home, Sparkles, Package } from 'lucide-react';
import { getTrpcQueryOptions } from '@/lib/trpc';
import { getTelegramAuth } from '@/lib/telegram-auth';
import { useAuthStore } from '@/store/auth';
import { useIsAdminBool } from '@/lib/useIsAdmin';
import { LanguagePicker } from '@/components/ui/LanguagePicker';
import { InstallPWABtn } from '@/components/InstallPWA';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map(w => w[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const { user: storeUser } = useAuthStore();
  const isAdmin = useIsAdminBool();

  const { data: authData, isLoading: authLoading } = useQuery(getTrpcQueryOptions('auth.checkAdmin'));
  const auth = authData as Record<string, unknown> | null | undefined;
  const backendUser = auth?.user as Record<string, unknown> | null | undefined;
  const userId = String(auth?.userId || backendUser?.id || storeUser?.id || '');
  const firstName = String(backendUser?.firstName || storeUser?.firstName || '');
  const tgUsername = String(backendUser?.username || storeUser?.username || '');
  const email = storeUser?.email || '';

  const localAuth = getTelegramAuth();
  const displayName = firstName || localAuth.firstName || storeUser?.firstName || storeUser?.email || 'Explorer';
  const displayUsername = tgUsername || localAuth.username || '';
  const avatarUrl = localAuth.photoUrl || '';
  const showAdminBadge = isAdmin && !!userId;
  const showMemberBadge = !authLoading && !isAdmin && !!userId;

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('i18nextLng', code);
    if (userId) {
      fetch('/trpc/subscriber.setLocale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tgUserId: userId, locale: code }),
      }).catch(() => {});
    }
  };

  return (
    <div className="min-h-dvh safe-top scroll-safe">
      <header className="app-header flex items-center justify-between px-4">
        <div className="w-[44px]" />
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>{t('profile.title')}</h1>
        <button onClick={() => window.location.hash = '#/settings'} className="w-11 h-11 rounded-full glass-card flex items-center justify-center">
          <Settings size={20} style={{ color: 'var(--gold)' }} />
        </button>
      </header>

      <section className="mx-4 mt-2 glass-card p-6 text-center">
        <div className="relative mx-auto w-20 h-20 rounded-full overflow-hidden" style={{ background: 'var(--surface)', border: '2px solid rgba(212,175,116,0.3)' }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : displayName ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-700 to-emerald-900">
              <span className="text-2xl font-bold text-white">{getInitials(displayName)}</span>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User size={36} style={{ color: 'var(--gold)' }} />
            </div>
          )}
        </div>

        <h2 className="mt-3 text-lg font-semibold" style={{ color: 'var(--text)' }}>
          {displayName}
        </h2>

        {displayUsername && (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            @{displayUsername}
          </p>
        )}

        {email && (
          <p className="mt-1 flex items-center justify-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
            <Mail size={12} /> {email}
          </p>
        )}

        <div className="flex items-center justify-center gap-2 mt-3">
          {showAdminBadge && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgba(212,175,116,0.12)', color: 'var(--gold)' }}>
              <Shield size={12} /> Admin
            </span>
          )}
          {showMemberBadge && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted)' }}>
              Member
            </span>
          )}
        </div>
      </section>

      {/* Language */}
      <section className="mx-4 mt-3">
        <button onClick={() => setLangPickerOpen(true)}
          className="glass-card w-full p-4 flex items-center justify-between transition-all hover:scale-[1.02]">
          <div className="flex items-center gap-3">
            <Globe size={20} style={{ color: 'var(--text-secondary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{t('profile.language')}</span>
          </div>
          <ChevronRight size={18} style={{ color: 'var(--muted)' }} />
        </button>
      </section>

      {/* PWA Install */}
      <section className="mx-4 mt-3">
        <InstallPWABtn />
      </section>

      <LanguagePicker open={langPickerOpen} current={i18n.language} onClose={() => setLangPickerOpen(false)} onSelect={handleLanguageChange} />

      {/* Bottom navigation */}
      <nav className="h-16 bottom-nav flex items-center justify-around px-2 z-50 fixed">
        <button onClick={() => navigate('/')} className="flex flex-col items-center gap-0.5" style={{ color: 'var(--muted)' }}><Home size={22} /><span className="text-[10px] font-medium">{t('nav.home')}</span></button>
        <button onClick={() => navigate('/catalog')} className="flex flex-col items-center gap-0.5" style={{ color: 'var(--muted)' }}><Package size={22} /><span className="text-[10px] font-medium">{t('nav.catalog')}</span></button>
        <button className="flex flex-col items-center gap-0.5" style={{ color: 'var(--gold)' }}><User size={22} /><span className="text-[10px] font-medium">{t('nav.profile')}</span></button>
        {isAdmin && (
          <button onClick={() => navigate('/studio')} className="flex flex-col items-center gap-0.5" style={{ color: 'var(--muted)' }}>
            <Sparkles size={22} />
            <span className="text-[10px] font-medium">{t('nav.studio')}</span>
          </button>
        )}
      </nav>
    </div>
  );
}
