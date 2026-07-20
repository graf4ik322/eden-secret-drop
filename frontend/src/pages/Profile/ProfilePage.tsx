import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, User, MessageCircle, Globe, Calendar, Shield, Home, Grid3X3 } from 'lucide-react';
import { getTrpcQueryOptions } from '@/lib/trpc';
import { GlassCard } from '@/components/ui';

export function ProfilePage() {
  const navigate = useNavigate();
  const { data: authData } = useQuery(getTrpcQueryOptions('auth.checkAdmin'));
  const auth = authData as Record<string, unknown> | null | undefined;

  const tg = (typeof window !== 'undefined') ? (window as any).Telegram?.WebApp : null;
  const tgUser = tg?.initDataUnsafe?.user;

  const userId = auth?.userId || tgUser?.id || 'Unknown';
  const isAdmin = auth?.isAdmin ?? false;

  return (
    <div className="min-h-dvh safe-top safe-bottom pb-20">
      <header className="flex items-center justify-between px-4 h-[72px]">
        <button onClick={() => navigate(-1)} className="w-[44px] h-[44px] rounded-full glass-card flex items-center justify-center">
          <ArrowLeft size={20} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-semibold tracking-[0.25em] uppercase" style={{ color: 'var(--text)' }}>PROFILE</h1>
        <div className="w-[44px]" />
      </header>

      <section className="mx-4 mt-2 glass-card p-6 text-center">
        <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center" style={{ background: 'var(--emerald)' }}>
          <User size={36} style={{ color: 'var(--gold)' }} />
        </div>
        <h2 className="text-xl font-bold mt-4" style={{ color: 'var(--text)' }}>
          {tgUser?.first_name || 'Telegram User'}
        </h2>
        {tgUser?.username && (
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>@{tgUser.username}</p>
        )}
        {isAdmin && (
          <span className="inline-flex items-center gap-1 mt-3 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider"
            style={{ background: 'rgba(212,175,116,0.15)', color: 'var(--gold)', border: '1px solid rgba(212,175,116,0.3)' }}>
            <Shield size={12} /> Admin
          </span>
        )}
      </section>

      <section className="mx-4 mt-5 space-y-3">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <MessageCircle size={18} style={{ color: 'var(--gold)' }} />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Telegram ID</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{String(userId)}</p>
            </div>
          </div>
        </GlassCard>
        {tgUser?.language_code && (
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <Globe size={18} style={{ color: 'var(--gold)' }} />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Language</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{tgUser.language_code.toUpperCase()}</p>
              </div>
            </div>
          </GlassCard>
        )}
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

      <nav className="fixed bottom-[18px] left-4 right-4 h-[72px] glass-card flex items-center justify-around px-2 z-50" style={{ borderRadius: '28px' }}>
        <button onClick={() => navigate('/')} className="flex flex-col items-center gap-0.5" style={{ color: 'var(--muted)' }}><Home size={22} /><span className="text-[10px] font-medium">Home</span></button>
        <button onClick={() => navigate('/studio')} className="flex flex-col items-center gap-0.5" style={{ color: 'var(--muted)' }}><Grid3X3 size={22} /><span className="text-[10px] font-medium">Drops</span></button>
        <button className="flex flex-col items-center gap-0.5" style={{ color: 'var(--gold)' }}><User size={22} /><span className="text-[10px] font-medium">Profile</span></button>
      </nav>
    </div>
  );
}
