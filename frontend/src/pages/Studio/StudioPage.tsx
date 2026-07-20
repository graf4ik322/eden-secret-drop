import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Edit3, Share2, Archive, BarChart3,
  Package, DollarSign, Eye, TrendingUp, Home, User,
} from 'lucide-react';
import { Button, GlassCard, Chip, StatusDot } from '@/components/ui';
import type { StatusType } from '@/components/ui';

interface DropItem {
  id: string;
  displayId: string;
  title: string;
  price: string;
  status: StatusType;
  image?: string;
}

const MOCK_DROPS: DropItem[] = [
  { id: '1', displayId: 'SD-0042', title: 'Rolex Submariner', price: '€9,500', status: 'live' },
  { id: '2', displayId: 'SD-0041', title: 'Sony A7 IV', price: '€3,200', status: 'scheduled' },
  { id: '3', displayId: 'SD-0040', title: 'B&O Beoplay H95', price: '€850', status: 'sold' },
  { id: '4', displayId: 'SD-0039', title: 'Tag Heuer Carrera', price: '€4,200', status: 'archived' },
  { id: '5', displayId: 'SD-0038', title: 'iPhone 16 Pro Max', price: '€1,499', status: 'live' },
  { id: '6', displayId: 'SD-0037', title: 'Dyson Zone', price: '€699', status: 'draft' },
];

const FILTERS = ['All', 'Active', 'Scheduled', 'Draft', 'Sold', 'Archived'] as const;

export function StudioPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDrops = MOCK_DROPS.filter((drop) => {
    const matchesFilter = activeFilter === 'All'
      || drop.status === activeFilter.toLowerCase()
      || (activeFilter === 'Active' && drop.status === 'live');
    const matchesSearch = drop.title.toLowerCase().includes(searchQuery.toLowerCase())
      || drop.displayId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-dvh safe-top safe-bottom pb-24">
      {/* ===== Header (72px) (TZ 5.1.1) ===== */}
      <header className="flex items-center justify-between px-4 h-[72px]">
        <div className="flex items-center gap-3">
          <div className="w-[44px] h-[44px] rounded-full bg-[var(--emerald)]/30 border border-[var(--emerald)]/30 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
              <polygon points="12,2 22,8 22,18 12,24 2,18 2,8" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Drop Studio</h1>
        </div>
        <Button
          variant="primary"
          className="!h-[44px] !px-6 text-sm"
          onClick={() => navigate('/studio/new')}
        >
          <Plus size={18} className="mr-1" /> Drop
        </Button>
      </header>

      {/* ===== Analytics (TZ 5.1.2) ===== */}
      <section className="mx-4 grid grid-cols-4 gap-2">
        {[
          { icon: Package, label: 'Active', value: '12', color: 'var(--success)' },
          { icon: DollarSign, label: 'Sold', value: '847', color: 'var(--sold)' },
          { icon: TrendingUp, label: 'Revenue', value: '€2.4M', color: 'var(--gold)' },
          { icon: Eye, label: 'Views', value: '14.2K', color: 'var(--emerald-glow)' },
        ].map(({ icon: Icon, label, value, color }) => (
          <GlassCard key={label} className="p-3 text-center">
            <Icon size={16} className="mx-auto mb-1" style={{ color }} />
            <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
          </GlassCard>
        ))}
      </section>

      {/* ===== Search (TZ 5.1.3) ===== */}
      <div className="mx-4 mt-4 relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
        <input
          type="text"
          placeholder="Search Drop..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-[48px] pl-11 pr-4 rounded-[16px] outline-none glass-card border border-[rgba(255,255,255,.08)] text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--gold)] transition-all"
        />
      </div>

      {/* ===== Filter Pills (TZ 5.1.4) ===== */}
      <section className="mx-4 mt-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTERS.map((f) => (
            <Chip key={f} active={activeFilter === f} onClick={() => setActiveFilter(f)}>
              {f}
            </Chip>
          ))}
        </div>
      </section>

      {/* ===== Drops List (TZ 5.1.5) ===== */}
      <section className="mx-4 mt-4 space-y-3">
        {filteredDrops.map((drop) => (
          <GlassCard key={drop.id} hoverable className="p-4">
            <div className="flex items-center gap-4">
              {/* Thumb */}
              <div className="w-[80px] h-[80px] rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0">
                <span className="text-xs" style={{ color: 'var(--muted)' }}>IMG</span>
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate" style={{ color: 'var(--text)' }}>{drop.title}</p>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{drop.displayId}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-base font-bold" style={{ color: 'var(--gold)' }}>{drop.price}</span>
                  <StatusDot status={drop.status} />
                </div>
              </div>
              {/* Actions */}
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button className="w-[36px] h-[36px] rounded-full glass-card flex items-center justify-center hover:border-[var(--gold)]/50">
                  <Edit3 size={14} style={{ color: 'var(--text-secondary)' }} />
                </button>
                <button className="w-[36px] h-[36px] rounded-full glass-card flex items-center justify-center hover:border-[var(--gold)]/50">
                  <Share2 size={14} style={{ color: 'var(--text-secondary)' }} />
                </button>
                <button className="w-[36px] h-[36px] rounded-full glass-card flex items-center justify-center hover:border-[var(--gold)]/50">
                  <Archive size={14} style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>
            </div>
          </GlassCard>
        ))}
      </section>

      {/* ===== Bottom Navigation (TZ 5.1.9) ===== */}
      <nav
        className="fixed bottom-[18px] left-[18px] right-[18px] h-[72px] rounded-[28px] flex items-center justify-around px-4 z-50"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03))',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255,255,255,.08)',
        }}
      >
        {[
          { icon: Home, label: 'Home', active: false },
          { icon: Package, label: 'Drops', active: true },
          { icon: Plus, label: 'Add', active: false },
          { icon: BarChart3, label: 'Analytics', active: false },
          { icon: User, label: 'Profile', active: false },
        ].map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            className="flex flex-col items-center gap-0.5 transition-all"
            style={{
              color: active ? 'var(--gold)' : 'var(--muted)',
              transform: active ? 'translateY(-4px)' : 'none',
            }}
          >
            <div
              className="w-[44px] h-[44px] rounded-full flex items-center justify-center"
              style={{ background: active ? 'rgba(210,185,128,.1)' : 'transparent' }}
            >
              <Icon size={22} />
            </div>
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
