import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowRight, Home, Grid3X3, Heart, User } from 'lucide-react';
import { getTrpcQueryOptions } from '@/lib/trpc';
import { Button } from '@/components/ui';
;

export function HomePage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | undefined>(undefined);

  const { data: categoriesData } = useQuery(
    getTrpcQueryOptions('drop.listCategories'),
  );
  const { data: activeDrops, isLoading: dropsLoading } = useQuery(
    getTrpcQueryOptions('drop.listActive', { limit: 20, categoryId: selectedSubcategory ?? selectedCategory }),
  );
  const { data: latestDrops, isLoading: latestLoading } = useQuery(
    getTrpcQueryOptions('drop.latest', { limit: 10 }),
  );
  const { data: nextScheduled } = useQuery(
    getTrpcQueryOptions('drop.nextScheduled'),
  );

  const featuredDrop: Record<string, unknown> | undefined = Array.isArray(activeDrops) ? activeDrops[0] : undefined;
  const categories: Record<string, unknown>[] = Array.isArray(categoriesData) ? categoriesData : [];
  const latest: Record<string, unknown>[] = Array.isArray(latestDrops) ? latestDrops : [];
  const drops: Record<string, unknown>[] = Array.isArray(activeDrops) ? activeDrops : [];

  const selectedCatObj = categories.find(c => c.id === selectedCategory);
  const subcategories: Record<string, unknown>[] = (selectedCatObj?.subcategories as Record<string, unknown>[]) || [];

  const handleCategoryClick = (catId: number | undefined) => {
    setSelectedCategory(catId);
    setSelectedSubcategory(undefined);
  };

  const formatPrice = (price: unknown) => {
    if (!price) return '';
    const num = parseFloat(String(price));
    return `\u20AC${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-dvh safe-top safe-bottom pb-20">
      <header className="flex items-center justify-between px-4 h-[72px]">
        <div className="flex items-center gap-3">
          <div className="w-[44px] h-[44px] rounded-full bg-[var(--emerald)]/30 border border-[var(--emerald)]/30 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
              <polygon points="12,2 22,8 22,18 12,24 2,18 2,8" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold tracking-[0.25em] uppercase" style={{ color: 'var(--text)' }}>EDEN</h1>
        </div>
        <button onClick={() => navigate('/studio')} className="w-[44px] h-[44px] rounded-full glass-card flex items-center justify-center hover:border-[var(--gold)]/50 transition-all">
          <Search size={20} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </header>

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

      <section className="mx-4 mt-6 flex items-center justify-between glass-card px-5 py-4">
        <span className="text-lg font-bold" style={{ color: 'var(--gold)' }}>
          {dropsLoading ? 'DROP #----' : `DROP #${String(drops.length).padStart(4, '0')}`}
        </span>
        <div className="text-right">
          <span className="text-sm" style={{ color: 'var(--muted)' }}>
            {drops.length > 0 ? `${drops.length} active` : 'No drops'}
          </span>
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
                  <p className="text-xs mt-0.5" style={{ color: 'var(--gold)' }}>
                    Next update: {hours}h {mins}m
                  </p>
                );
              }
            }
            return null;
          })()}
        </div>
      </section>

      <section className="mx-4 mt-5">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button onClick={() => handleCategoryClick(undefined)}
            className={`px-4 h-[42px] rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === undefined
                ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#071A17] font-semibold'
                : 'glass-card text-[var(--text-secondary)]'
            }`}>All</button>
          {categories.map((cat: Record<string, unknown>) => (
            <button key={String(cat.id)} onClick={() => handleCategoryClick(Number(cat.id))}
              className={`px-4 h-[42px] rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#071A17] font-semibold'
                  : 'glass-card text-[var(--text-secondary)]'
              }`}>{String(cat.icon || '')} {String(cat.name || '')}</button>
          ))}
        </div>
        {subcategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mt-2">
            {subcategories.map((sub: Record<string, unknown>) => (
              <button key={String(sub.id)} onClick={() => setSelectedSubcategory(Number(sub.id))}
                className={`px-4 h-[42px] rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedSubcategory === sub.id
                    ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#071A17] font-semibold'
                    : 'glass-card text-[var(--text-secondary)]'
                }`}>{String(sub.icon || '')} {String(sub.name || '')}</button>
            ))}
          </div>
        )}
      </section>

      {featuredDrop && (
        <section className="mx-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Featured Drop</h2>
            <button onClick={() => navigate('/studio')} className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--gold)' }}>View all \u2192</button>
          </div>
          <div className="glass-card overflow-hidden cursor-pointer hover:-translate-y-0.5 transition-all"
            onClick={() => navigate(`/drop/${featuredDrop.displayId}`)}>
            <div className="relative h-[190px] flex items-center justify-center overflow-hidden" style={{ background: 'var(--surface)' }}>
              {featuredDrop.cutoutUrl ? (
                <img src={String(featuredDrop.cutoutUrl)} alt={String(featuredDrop.title || '')} className="h-full w-auto object-contain drop-shadow-[0_0_24px_rgba(31,139,116,0.4)]" />
              ) : (
                <span className="text-4xl opacity-30">\u2726</span>
              )}
              <span className="absolute top-3 left-3 inline-flex items-center px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] bg-gradient-to-r from-[var(--emerald)]/20 to-[var(--emerald-light)]/10 border border-[var(--emerald-light)]/30 text-[var(--emerald-light)]">LIVE</span>
            </div>
            <div className="p-[18px] flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base" style={{ color: 'var(--text)' }}>{String(featuredDrop.title || '')}</h3>
                <p className="text-[22px] font-bold mt-1" style={{ color: 'var(--gold)' }}>{formatPrice(featuredDrop.price)}</p>
              </div>
              <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate(`/drop/${featuredDrop.displayId}`); }}
                className="h-10 px-5 rounded-xl font-bold text-sm transition-all"
                style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: '#071A17' }}>Buy</button>
            </div>
          </div>
        </section>
      )}

      <section className="mx-4 mt-6">
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text)' }}>Latest Drops</h2>
        {latestLoading && [1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-[18px] h-[122px] mb-3 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-[96px] h-[96px] rounded-xl" style={{ background: 'var(--surface)' }} />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded" style={{ background: 'var(--surface)' }} />
                <div className="h-3 w-1/2 rounded" style={{ background: 'var(--surface)' }} />
                <div className="h-5 w-1/3 rounded" style={{ background: 'var(--surface)' }} />
              </div>
            </div>
          </div>
        ))}
        {!latestLoading && latest.length === 0 && (
          <p className="text-center py-8 text-sm" style={{ color: 'var(--muted)' }}>No drops available yet</p>
        )}
        {latest.map((drop: Record<string, unknown>) => (
          <div key={String(drop.id)} className="glass-card mb-3 cursor-pointer hover:-translate-y-0.5 transition-all"
            onClick={() => navigate(`/drop/${drop.displayId}`)}>
            <div className="flex items-center gap-4 p-[18px]">
              <div className="w-[96px] h-[96px] rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ background: 'var(--surface)' }}>
                {drop.cutoutUrl ? <img src={String(drop.cutoutUrl)} alt={String(drop.title || '')} className="h-full w-auto object-contain" /> : <span className="text-2xl opacity-20">\u2726</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{String(drop.displayId || '')}</p>
                <h3 className="font-semibold text-base truncate mt-0.5" style={{ color: 'var(--text)' }}>{String(drop.title || '')}</h3>
                <p className="text-lg font-bold mt-1" style={{ color: 'var(--gold)' }}>{formatPrice(drop.price)}</p>
              </div>
              <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate(`/drop/${drop.displayId}`); }}
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:border-[var(--gold)]"
                style={{ background: 'var(--surface-light)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <ArrowRight size={18} style={{ color: 'var(--gold)' }} />
              </button>
            </div>
          </div>
        ))}
      </section>

      <nav className="fixed bottom-[18px] left-4 right-4 h-[72px] glass-card flex items-center justify-around px-2 z-50" style={{ borderRadius: '28px' }}>
        <button className="flex flex-col items-center gap-0.5" style={{ color: 'var(--gold)' }}><Home size={22} /><span className="text-[10px] font-medium">Home</span></button>
        <button onClick={() => navigate('/studio')} className="flex flex-col items-center gap-0.5" style={{ color: 'var(--muted)' }}><Grid3X3 size={22} /><span className="text-[10px] font-medium">Drops</span></button>
        <button className="flex flex-col items-center gap-0.5" style={{ color: 'var(--muted)' }}><Heart size={22} /><span className="text-[10px] font-medium">Favorites</span></button>
        <button className="flex flex-col items-center gap-0.5" style={{ color: 'var(--muted)' }}><User size={22} /><span className="text-[10px] font-medium">Profile</span></button>
      </nav>
    </div>
  );
}
