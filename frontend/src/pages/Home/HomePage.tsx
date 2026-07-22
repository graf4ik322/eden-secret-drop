import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useIsAdminBool, useIsAdmin } from '@/lib/useIsAdmin';
import { getTelegramAuth } from '@/lib/telegram-auth';
import { ArrowRight, Home, Sparkles, User, Package } from 'lucide-react';
import { getTrpcQueryOptions } from '@/lib/trpc';
import { Button } from '@/components/ui';

export function HomePage() {
  const isAdmin = useIsAdminBool();
  const adminState = useIsAdmin();
  const navigate = useNavigate();
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [tapCount, setTapCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const fullDebugRef = useRef('');

  const handleLogoTap = async () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    if (newCount >= 5) {
      setTapCount(0);
      const auth = getTelegramAuth();
      // Fetch debug info from backend
      let debugExtra = '';
      try {
        const res = await fetch('/trpc/auth.debug', {
          headers: {
            'authorization': 'tma ' + auth.initData,
            'x-tg-user-id': auth.userId,
            'x-tg-first-name': auth.firstName || '',
            'x-tg-username': auth.username || '',
          },
        });
        const json = await res.json();
        const d = Array.isArray(json) ? json[0]?.result?.data || json[0] || json : json?.result?.data || json;
        debugExtra =
          `\n── Backend received ──\n` +
          `receivedUserId: ${d.receivedUserId ?? 'null'}\n` +
          `receivedType: ${d.receivedType}\n` +
          `match: ${JSON.stringify(d.match)}\n` +
          `userData: ${JSON.stringify(d.userData ?? null)}\n` +
          `isAdmin: ${d.isAdmin}\n` +
          `\n── Backend echo headers ──\n` +
          `authorization: ${d.headers?.authorization ?? '❗MISSING'}\n` +
          `x-tg-user-id: ${d.headers?.['x-tg-user-id'] ?? '❗MISSING'}\n` +
          `origin: ${d.headers?.origin ?? 'null'}\n` +
          `referer: ${d.headers?.referer ?? 'null'}\n` +
          `content-type: ${d.headers?.['content-type'] ?? 'null'}\n` +
          `user-agent: ${d.headers?.['user-agent'] ?? 'null'}\n` +
          `\n── Env ──\n` +
          `hasBotToken: ${d.hasBotToken}\n` +
          `nodeEnv: ${d.nodeEnv}\n` +
          `adminIdsRaw: ${d.adminIdsRaw}`;
      } catch (e) { debugExtra = '\n(auth.debug failed)'; }

      // initData auth_date check
      let initDataAge = '';
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.initDataUnsafe?.auth_date) {
          const authDate = new Date(tg.initDataUnsafe.auth_date * 1000);
          const ageHours = Math.round((Date.now() - authDate.getTime()) / 3600000);
          initDataAge = `\ninitData age: ${ageHours}h (since ${authDate.toISOString()})`;
          if (ageHours > 24) initDataAge += ' ⚠️ EXPIRED (>24h)';
        }
      } catch {}

      // Telegram.WebApp info
      let tgInfo = '';
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (tg) {
          tgInfo =
            `\n\n── Telegram.WebApp ──\n` +
            `platform: ${tg.platform ?? '?'}\n` +
            `version: ${tg.version ?? '?'}\n` +
            `colorScheme: ${tg.colorScheme ?? '?'}\n` +
            `viewportH: ${tg.viewportHeight ?? '?'}\n` +
            `isExpanded: ${tg.isExpanded ?? '?'}\n` +
            `headerColor: ${tg.headerColor ?? '?'}`;
        }
      } catch {}

      const sentAuthFull = auth.initData ? `tma ${auth.initData}` : '❌';

      const fullTextLines = [
            `🔐 Auth Debug`,
            `build: ${__BUILD_SHA__}`,
            ``,
            `── Frontend sent ──`,
            `local userId: ${auth.userId || '❌'}`,
            `Authorization: ${sentAuthFull}`,
            `x-tg-user-id: ${auth.userId || '❌'}`,
            `hash: ${window.location.hash}`,
        `adminState: ${adminState.status}${adminState.status === 'checked' ? ` id=${adminState.userId} admin=${adminState.isAdmin}` : ''}`,
        `isAdmin bool: ${isAdmin}`,
      ];
      if (initDataAge) fullTextLines.push(initDataAge.trim());
      if (tgInfo) fullTextLines.push(tgInfo.trim());
      const fullText = fullTextLines.join('\n') + debugExtra;

      // Display text (truncated for screen) — just show shorter hash
      const displayTextLines = fullTextLines.map(l =>
        l.startsWith('hash: ') ? `hash: ${window.location.hash.substring(0, 60)}` : l
      );
      fullDebugRef.current = fullText;
      setDebugInfo(displayTextLines.join('\n') + debugExtra);
    }
  };

  const handleCopyDebug = async () => {
    try {
      await navigator.clipboard.writeText(fullDebugRef.current);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('Copy debug info:', fullDebugRef.current);
    }
  };

  const { data: latestDrops, isLoading: latestLoading } = useQuery(
    getTrpcQueryOptions('drop.latest', { limit: 10 }),
  );
  const { data: nextScheduled } = useQuery(
    getTrpcQueryOptions('drop.nextScheduled'),
  );
  const { data: stats } = useQuery(
    getTrpcQueryOptions('drop.stats'),
  );

  const drops: Record<string, unknown>[] = Array.isArray(latestDrops) ? latestDrops : [];
  const featuredDrop: Record<string, unknown> | undefined = drops[0];
  const dropStats = (stats || { allTime: 0, active: 0 }) as { allTime: number; active: number };

  const formatPrice = (price: unknown) => {
    if (!price) return '';
    const num = parseFloat(String(price));
    return `\u20AC${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-dvh safe-top scroll-safe">
      <header className="app-header flex items-center px-4">
        <div className="flex-1" /> {/* spacer */}
        <div className="flex items-center gap-2 max-w-[60%]">
          <div onClick={handleLogoTap} className="w-[60px] h-[60px] flex items-center justify-center cursor-pointer active:scale-95 transition-transform flex-shrink-0">
            <img src="/logo.png" alt="EDEN SecretDrop" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col leading-[1.05] brand-text-full">
            <span className="brand-text-eden text-xl font-bold tracking-tight" style={{ color: 'var(--gold)' }}>EDEN</span>
            <span className="text-[14px] font-medium" style={{ color: 'var(--gold)' }}>SecretDrop</span>
          </div>
        </div>
        <div className="flex-1 flex justify-end" />
      </header>

      {debugInfo && (
        <section className="mx-4 mb-2 p-3 rounded-xl text-xs font-mono whitespace-pre-wrap" style={{ background: 'rgba(0,0,0,0.5)', color: 'var(--gold)', border: '1px solid rgba(212,175,116,0.3)' }}>
          {debugInfo}
          <div className="flex gap-2 mt-2">
            <button onClick={handleCopyDebug} className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: copied ? 'var(--success)' : 'var(--muted)' }}>
              {copied ? '✓ Copied!' : '📋 Copy full'}
            </button>
            <button onClick={() => setDebugInfo('')} className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--muted)' }}>✕ close</button>
          </div>
        </section>
      )}

      {/* FR-03/FR-14: Search removed from Home */}

      <section className="mx-4 mt-2 glass-card p-6 text-center relative overflow-hidden" style={{ height: '220px' }}>
        <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-[var(--gold)]/50 to-transparent" />
        <div className="absolute top-3 right-3 opacity-[0.06]">
          <svg width="120" height="120" viewBox="0 0 60 60" fill="none" stroke="var(--text)" strokeWidth=".5">
            <polygon points="30,2 56,17 56,43 30,58 4,43 4,17" />
          </svg>
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center h-full gap-5">
          <p className="text-base font-normal leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Only the Best Deals —<br />
            <span className="text-[var(--gold)]">Selected electronics for members only</span>
          </p>
          <Button variant="primary" className="!h-14" style={{ borderRadius: '18px', padding: '0 32px' }}
            onClick={() => featuredDrop ? navigate(`/drop/${featuredDrop.displayId}`) : undefined}>
            {featuredDrop ? `View ${String(featuredDrop.title || '')}` : 'Join Drop'}
          </Button>
        </div>
      </section>

      {/* FR-03/FR-16: Counter — allTime + active (separate metrics) */}
      <section className="mx-4 mt-6 glass-card px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Total drops all time</span>
          <span className="text-lg font-bold" style={{ color: 'var(--gold)' }}>{dropStats.allTime}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Active now</span>
          <span className="text-lg font-bold" style={{ color: 'var(--emerald)' }}>{dropStats.active}</span>
        </div>
        {(() => {
          const scheduled = nextScheduled as Record<string, unknown> | null;
          if (scheduled?.scheduledAt) {
            const nextTime = new Date(String(scheduled.scheduledAt));
            const now = Date.now();
            const diff = nextTime.getTime() - now;
            if (diff > 0) {
              const hours = Math.floor(diff / 3600000);
              const mins = Math.floor((diff % 3600000) / 60000);
              return (
                <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Next update</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>{hours}h {mins}m</span>
                </div>
              );
            }
          }
          return null;
        })()}
      </section>

      {/* FR-03/FR-15: Category filters removed from Home */}

      {featuredDrop && (
        <section className="mx-4 mt-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>Featured</h2>
          <div className="glass-card overflow-hidden cursor-pointer transition-all"
            onClick={() => navigate(`/drop/${featuredDrop.displayId}`)}>
            <div className="relative h-[200px] flex items-center justify-center overflow-hidden" style={{ background: 'var(--surface)' }}>
              {featuredDrop.cutoutUrl || featuredDrop.mockupImageUrl ? (
                <img src={String(featuredDrop.cutoutUrl || featuredDrop.mockupImageUrl)} alt={String(featuredDrop.title || '')} className="h-full w-auto object-contain drop-shadow-[0_0_24px_rgba(31,139,116,0.4)]" />
              ) : (
                <span className="text-4xl opacity-20">✦</span>
              )}
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base" style={{ color: 'var(--text)' }}>{String(featuredDrop.title || '')}</h3>
                <p className="text-xl font-bold mt-1" style={{ color: 'var(--gold)' }}>{formatPrice(featuredDrop.price)}</p>
              </div>
              <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate(`/drop/${featuredDrop.displayId}`); }}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'var(--surface-light)', border: 'none' }}>
                <ArrowRight size={20} style={{ color: 'var(--gold)' }} />
              </button>
            </div>
          </div>
        </section>
      )}
      <section className="mx-4 mt-6">
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text)' }}>Latest Drops</h2>
        {latestLoading && [1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-3 h-[88px] mb-2 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl" style={{ background: 'var(--surface)' }} />
              <div className="flex-1 space-y-2"><div className="h-4 w-3/4 rounded" style={{ background: 'var(--surface)' }} /><div className="h-3 w-1/2 rounded" style={{ background: 'var(--surface)' }} /></div>
            </div>
          </div>
        ))}
        {!latestLoading && drops.length === 0 && (
          <p className="text-center py-8 text-sm" style={{ color: 'var(--muted)' }}>No drops available yet</p>
        )}
        {drops.map((drop: Record<string, unknown>) => (
          <div key={String(drop.id)} className="glass-card mb-2 cursor-pointer transition-all"
            onClick={() => navigate(`/drop/${drop.displayId}`)}>
            <div className="flex items-center gap-3 p-3">
              <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ background: 'var(--surface)' }}>
                {drop.cutoutUrl || drop.mockupImageUrl ? <img src={String(drop.cutoutUrl || drop.mockupImageUrl)} alt={String(drop.title || '')} className="h-full w-auto object-contain" /> : <span className="text-xl opacity-20">✦</span>}
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{String(drop.title || '')}</span>
                <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{String(drop.displayId || '')}</span>
                <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>{formatPrice(drop.price)}</span>
              </div>
              <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate(`/drop/${drop.displayId}`); }}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'var(--surface-light)', border: 'none' }}>
                <ArrowRight size={16} style={{ color: 'var(--gold)' }} />
              </button>
            </div>
          </div>
        ))}
      </section>

      <nav className="h-16 bottom-nav flex items-center justify-around px-2 z-50 fixed">
        <button className="flex flex-col items-center gap-0.5" style={{ color: 'var(--gold)' }}><Home size={22} /><span className="text-[10px] font-medium">Home</span></button>
        <button onClick={() => navigate('/catalog')} className="flex flex-col items-center gap-0.5" style={{ color: 'var(--muted)' }}><Package size={22} /><span className="text-[10px] font-medium">Catalog</span></button>
        <button onClick={() => navigate('/profile')} className="flex flex-col items-center gap-0.5" style={{ color: 'var(--muted)' }}><User size={22} /><span className="text-[10px] font-medium">Profile</span></button>
        {isAdmin && (
          <button onClick={() => navigate('/studio')} className="flex flex-col items-center gap-0.5" style={{ color: 'var(--muted)' }}>
            <Sparkles size={22} />
            <span className="text-[10px] font-medium">Studio</span>
          </button>
        )}
      </nav>
    </div>
  );
}
