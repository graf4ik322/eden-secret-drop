import { Search, Home, Grid3X3, Heart, User, ArrowRight } from 'lucide-react';
import { Button, GlassCard, Chip, Badge } from '@/components/ui';

export function HomePage() {
  return (
    <div className="min-h-dvh safe-top safe-bottom pb-20">
      {/* ===== Header (72px) ===== */}
      <header className="flex items-center justify-between px-4 h-[72px]">
        <div className="flex items-center gap-3">
          {/* Hex logo 44x44 */}
          <div className="w-[44px] h-[44px] rounded-full bg-[var(--emerald)]/30 border border-[var(--emerald)]/30 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
              <polygon points="12,2 22,8 22,18 12,24 2,18 2,8" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold tracking-[0.25em] uppercase" style={{ color: 'var(--text)' }}>
            EDEN
          </h1>
        </div>
        <button className="w-[44px] h-[44px] rounded-full glass-card flex items-center justify-center hover:border-[var(--gold)]/50 transition-all">
          <Search size={20} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </header>

      {/* ===== Hero (220px) (TZ 4.1.2) ===== */}
      <section className="mx-4 mt-2 glass-card p-6 text-center relative overflow-hidden" style={{ height: '220px' }}>
        {/* Glow line top */}
        <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-[var(--gold)]/50 to-transparent" />
        {/* Hex watermark */}
        <div className="absolute top-3 right-3 opacity-[0.06]">
          <svg width="120" height="120" viewBox="0 0 60 60" fill="none" stroke="var(--text)" strokeWidth=".5">
            <polygon points="30,2 56,17 56,43 30,58 4,43 4,17" />
          </svg>
        </div>
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full gap-5">
          <p className="text-base font-normal leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Only the Best Deals —<br />
            <span className="text-[var(--gold)]">Selected electronics for members only</span>
          </p>
          <Button variant="primary" className="!h-14" style={{ borderRadius: '18px', padding: '0 32px' }}>
            Join Drop
          </Button>
        </div>
      </section>

      {/* ===== Drop Counter (TZ 2.3, 4.1.3) ===== */}
      <section className="mx-4 mt-6 flex items-center justify-between glass-card px-5 py-4">
        <span className="text-lg font-bold" style={{ color: 'var(--gold)' }}>DROP #0842</span>
        <span className="text-sm" style={{ color: 'var(--muted)' }}>Last drop: 2 days ago</span>
      </section>

      {/* ===== Category Chips (TZ 4.1.4) ===== */}
      <section className="mx-4 mt-5">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {['All', '⌚ Watches', '📱 Tech', '💎 Jewelry', '🚗 Auto', '🎧 Audio'].map((cat) => (
            <Chip key={cat} active={cat === 'All'}>{cat}</Chip>
          ))}
        </div>
      </section>

      {/* ===== Featured Drop (TZ 4.1.5) ===== */}
      <section className="mx-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Featured Drop</h2>
          <button className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--gold)' }}>
            View all <ArrowRight size={14} />
          </button>
        </div>
        <GlassCard hoverable className="h-[330px] p-0 flex flex-col overflow-hidden">
          {/* Cutout image area */}
          <div className="flex-1 flex items-center justify-center relative bg-[var(--bg-secondary)]">
            <div className="w-24 h-24 rounded-full opacity-[.08]"
              style={{
                background: 'radial-gradient(circle, var(--gold) 0%, transparent 70%)',
                position: 'absolute',
              }}
            />
            <span className="text-sm" style={{ color: 'var(--muted)' }}>Drop Image</span>
            <Badge variant="limited" className="absolute top-3 left-3">Limited</Badge>
          </div>
          {/* Info */}
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold" style={{ color: 'var(--text)' }}>Featured Product</p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>SD-0042</p>
            </div>
            <span className="text-xl font-bold" style={{ color: 'var(--gold)' }}>€--</span>
          </div>
        </GlassCard>
      </section>

      {/* ===== Latest Drops (TZ 4.1.6) ===== */}
      <section className="mx-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Latest Drops</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <GlassCard key={i} hoverable className="h-[122px] flex items-center gap-4 p-4">
              {/* Thumb */}
              <div className="w-24 h-24 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0">
                <span className="text-xs" style={{ color: 'var(--muted)' }}>IMG</span>
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" style={{ color: 'var(--text)' }}>
                  {['Rolex Submariner', 'Sony A7 IV', 'B&O Beoplay'][i - 1]}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>SD-{String(100 + i).padStart(4, '0')}</p>
                <p className="text-xl font-bold mt-1" style={{ color: 'var(--gold)' }}>
                  €{['9,500', '3,200', '1,850'][i - 1]}
                </p>
              </div>
              <button className="flex-shrink-0 text-sm font-semibold" style={{ color: 'var(--gold)' }}>
                Buy →
              </button>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ===== Floating Bottom Navigation (TZ 4.1.7) ===== */}
      <nav className="fixed bottom-[18px] left-[18px] right-[18px] h-[72px] glass-card rounded-[28px] flex items-center justify-around px-4 z-50"
        style={{ backdropFilter: 'blur(32px)', border: '1px solid rgba(255,255,255,.08)' }}
      >
        {[
          { icon: Home, active: true },
          { icon: Grid3X3, active: false },
          { icon: Heart, active: false },
          { icon: User, active: false },
        ].map(({ icon: Icon, active }, i) => (
          <button
            key={i}
            className="w-[44px] h-[44px] rounded-full flex items-center justify-center transition-all"
            style={{
              color: active ? 'var(--gold)' : 'var(--muted)',
              background: active ? 'rgba(210,185,128,.1)' : 'transparent',
            }}
          >
            <Icon size={22} />
          </button>
        ))}
      </nav>
    </div>
  );
}
