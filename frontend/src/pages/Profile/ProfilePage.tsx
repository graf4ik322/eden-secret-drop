import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, User, MessageCircle, Calendar, Shield, Home, Sparkles, Package } from 'lucide-react';
import { getTrpcQueryOptions } from '@/lib/trpc';
import { getTelegramAuth } from '@/lib/telegram-auth';
import { GlassCard } from '@/components/ui';

export function ProfilePage() {
  const navigate = useNavigate();
  const { data: authData, isLoading: authLoading } = useQuery(getTrpcQueryOptions('auth.checkAdmin'));
  const auth = authData as Record<string, unknown> | null | undefined;
  
  // User data from backend (populated via Telegram headers)
  const backendUser = auth?.user as Record<string, unknown> | null | undefined;
  const userId = String(auth?.userId || backendUser?.id || '');
  const firstName = String(backendUser?.firstName || '');
  const tgUsername = String(backendUser?.username || '');
  const isAdmin = auth?.isAdmin ?? false;

  // Fallback: данные из telegram-auth.ts (спарсены при загрузке страницы)
  const localAuth = getTelegramAuth();
  const displayName = firstName || localAuth.firstName || 'Telegram Explorer';
  const displayUsername = tgUsername || localAuth.username || '';
  const displayUserId = userId || localAuth.userId;

  // Пока проверка админа не завершена — не показываем статус Member (TZ 2.7)
  const showAdminBadge = isAdmin;
  const showMemberBadge = !authLoading && !isAdmin && !!displayUserId;

  return (
    <div className="min-h-dvh safe-top scroll-safe">
      <header className="app-header flex items-center justify-between px-4">
        <button onClick={() => navigate(-1)} className="back-btn w-11 h-11 rounded-full glass-card flex items-center justify-center">
          <ArrowLeft size={20} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Profile</h1>
        <div className="w-[44px]" />
      </header>

      <section className="mx-4 mt-2 glass-card p-6 text-center">
        {/* Avatar — из telegram-auth если есть */}
        <div className="w-20 h-20 mx-auto rounded-full overflow-hidden" style={{ background: 'var(--emerald)', border: '2px solid rgba(212,175,116,0.3)' }}>
          <div className="w-full h-full flex items-center justify-center">
            <User size={36} style={{ color: 'var(--gold)' }} />
          </div>
        </div>
        <h2 className="text-xl font-bold mt-4" style={{ color: 'var(--text)' }}>
          {displayName}
        </h2>
        {displayUsername && (
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>@{displayUsername}</p>
        )}
        {showAdminBadge && (
          <span className="inline-flex items-center gap-1 mt-3 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider"
            style={{ background: 'rgba(212,175,116,0.15)', color: 'var(--gold)', border: '1px solid rgba(212,175,116,0.3)' }}>
            <Shield size={12} /> Admin
          </span>
        )}
        {showMemberBadge && (
          <span className="inline-flex items-center gap-1 mt-3 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider"
            style={{ background: 'rgba(76,208,127,0.15)', color: 'var(--success)', border: '1px solid rgba(76,208,127,0.3)' }}>
            Member
          </span>
        )}
      </section>

      <section className="mx-4 mt-5 space-y-3">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <MessageCircle size={18} style={{ color: 'var(--gold)' }} />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Telegram ID</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{displayUserId || '—'}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <Calendar size={18} style={{ color: 'var(--gold)' }} />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Member Since</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>July 2026</p>
            </div>
          </div>
        </GlassCard>
      </section>

      <nav className="h-16 bottom-nav flex items-center justify-around px-2 z-50 fixed">
        <button onClick={() => navigate('/')} className="flex flex-col items-center gap-0.5" style={{ color: 'var(--muted)' }}><Home size={22} /><span className="text-[10px] font-medium">Home</span></button>
        <button onClick={() => navigate('/catalog')} className="flex flex-col items-center gap-0.5" style={{ color: 'var(--muted)' }}><Package size={22} /><span className="text-[10px] font-medium">Catalog</span></button>
        <button className="flex flex-col items-center gap-0.5" style={{ color: 'var(--gold)' }}><User size={22} /><span className="text-[10px] font-medium">Profile</span></button>
        {showAdminBadge && (
          <button onClick={() => navigate('/studio')} className="flex flex-col items-center gap-0.5" style={{ color: 'var(--muted)' }}><Sparkles size={22} /><span className="text-[10px] font-medium">Studio</span></button>
        )}
      </nav>
    </div>
  );
}
