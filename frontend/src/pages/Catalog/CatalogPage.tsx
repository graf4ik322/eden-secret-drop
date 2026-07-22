import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowRight, Package, X, ArrowUpDown } from 'lucide-react';
import { getTrpcQueryOptions } from '@/lib/trpc';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
] as const;

type SortBy = (typeof SORT_OPTIONS)[number]['value'];

export function CatalogPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<SortBy>('newest');

  const { data: activeDrops } = useQuery(
    getTrpcQueryOptions('drop.listActive', {
      limit: 50,
      categoryId: selectedSubcategory ?? selectedCategory,
      sortBy,
    })
  );
  const { data: categoriesData } = useQuery(getTrpcQueryOptions('drop.listCategories'));

  const drops = (Array.isArray(activeDrops) ? activeDrops : []) as Record<string, unknown>[];
  const categories = (Array.isArray(categoriesData) ? categoriesData : []) as Record<string, unknown>[];

  const selectedCatObj = categories.find(c => c.id === selectedCategory);
  const subcategories: Record<string, unknown>[] = (selectedCatObj?.subcategories as Record<string, unknown>[]) || [];

  const handleCategoryClick = (catId: number | undefined) => {
    setSelectedCategory(catId);
    setSelectedSubcategory(undefined);
  };

  const formatPrice = (price: unknown) => {
    if (!price) return '';
    const num = parseFloat(String(price));
    return `€${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const filtered = drops.filter((drop: Record<string, unknown>) => {
    const q = searchQuery.toLowerCase();
    if (q && !String(drop.title || '').toLowerCase().includes(q)) return false;
    if (selectedCategory && Number(drop.categoryId) !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="min-h-dvh safe-top scroll-safe">
      <header className="app-header flex items-center justify-between px-4">
        <button onClick={() => navigate(-1)} className="back-btn w-11 h-11 rounded-full glass-card flex items-center justify-center transition-all">
          <ArrowRight size={20} style={{ color: 'var(--text-secondary)', transform: 'rotate(180deg)' }} />
        </button>
        <h1 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Catalog</h1>
        <div className="w-11" />
      </header>

      {/* Search */}
      <section className="mx-4 mt-2">
        <div className="flex items-center gap-3 px-4 h-10 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.04)' }}>
          <Search size={16} style={{ color: 'var(--muted)' }} />
          <input type="text" placeholder="Search drops..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text)' }} />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}><X size={14} style={{ color: 'var(--muted)' }} /></button>
          )}
        </div>
      </section>

      {/* Category chips */}
      <section className="mx-4 mt-3">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button onClick={() => handleCategoryClick(undefined)}
            className={`px-4 h-[34px] rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              !selectedCategory
                ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#071A17] font-semibold'
                : 'glass-card text-[var(--text-secondary)]'}`}>All</button>
          {categories.map((cat: Record<string, unknown>) => (
            <button key={String(cat.id)} onClick={() => handleCategoryClick(Number(cat.id))}
              className={`px-4 h-[34px] rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                selectedCategory === Number(cat.id)
                  ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#071A17] font-semibold'
                  : 'glass-card text-[var(--text-secondary)]'}`}>
              {String(cat.icon || '')} {String(cat.name || '')}</button>
          ))}
        </div>
        {subcategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mt-2">
            {subcategories.map((sub: Record<string, unknown>) => (
              <button key={String(sub.id)} onClick={() => setSelectedSubcategory(Number(sub.id))}
                className={`px-4 h-[34px] rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  selectedSubcategory === Number(sub.id)
                    ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#071A17] font-semibold'
                    : 'glass-card text-[var(--text-secondary)]'}`}>
                {String(sub.icon || '')} {String(sub.name || '')}</button>
            ))}
          </div>
        )}
      </section>

      {/* Sort chips */}
      <section className="mx-4 mt-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <ArrowUpDown size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          {SORT_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => setSortBy(opt.value)}
              className={`px-3 h-[30px] rounded-full text-[11px] font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                sortBy === opt.value
                  ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#071A17] font-semibold'
                  : 'glass-card text-[var(--text-secondary)]'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Drop list */}
      <section className="mx-4 mt-3 mb-6">
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Package size={40} style={{ color: 'var(--muted)' }} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No drops found</p>
          </div>
        )}
        {filtered.map((drop: Record<string, unknown>) => (
          <div key={String(drop.id)} className="glass-card mb-2 cursor-pointer transition-all"
            onClick={() => navigate(`/drop/${drop.displayId}`)}>
            <div className="flex items-center gap-3 p-3">
              <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ background: 'var(--surface)' }}>
                {String(drop.cutoutUrl || drop.mockupImageUrl) ? <img src={String(drop.cutoutUrl || drop.mockupImageUrl)} alt="" className="h-full w-auto object-contain" /> : <span className="text-xl opacity-20">✦</span>}
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{String(drop.title || '')}</span>
                <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{String(drop.displayId || '')}</span>
                <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>{formatPrice(drop.price)}</span>
              </div>
              <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate(`/drop/${drop.displayId}`); }}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'var(--surface-light)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <ArrowRight size={14} style={{ color: 'var(--muted)' }} />
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
