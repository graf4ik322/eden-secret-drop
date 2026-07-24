import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowRight, Package, X, Home, User, Sparkles, SlidersHorizontal, ChevronDown, Tag } from 'lucide-react';
import { getTrpcQueryOptions } from '@/lib/trpc';
import { useIsAdminBool } from '@/lib/useIsAdmin';
import { Modal } from '@/components/ui/Modal';
import { useTranslation } from 'react-i18next';

const SORT_VALUES = ['newest', 'oldest', 'price_asc', 'price_desc'] as const;

type SortBy = (typeof SORT_VALUES)[number];

export function CatalogPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const isAdmin = useIsAdminBool();

  const { data: activeDrops } = useQuery(
    getTrpcQueryOptions('drop.listActive', {
      limit: 50,
      sortBy,
    })
  );
  const { data: categoriesData } = useQuery(getTrpcQueryOptions('drop.listCategories'));

  const drops = (Array.isArray(activeDrops) ? activeDrops : []) as Record<string, unknown>[];
  const categories = (Array.isArray(categoriesData) ? categoriesData : []) as Record<string, unknown>[];

  const selectedCatObj = categories.find((c: Record<string, unknown>) => c.id === selectedCategory);

  const handleCategoryClick = (catId: number | undefined) => {
    setSelectedCategory(catId);
    setSelectedSubcategory(undefined);
  };

  // Build category ID map for filtering (root → rootId + all subIds)
  const categoryIdMap = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const root of categories) {
      const subs = (root.subcategories as Record<string, unknown>[] || []).map(s => Number(s.id));
      map.set(Number(root.id), [Number(root.id), ...subs]);
    }
    return map;
  }, [categories]);

  const activeFilterIds = useMemo(() => {
    // Если выбрана подкатегория — фильтруем ТОЛЬКО по ней
    if (selectedSubcategory !== undefined) {
      return [selectedSubcategory];
    }
    if (selectedCategory !== undefined) {
      return categoryIdMap.get(selectedCategory) || [selectedCategory];
    }
    return [];
  }, [categoryIdMap, selectedCategory, selectedSubcategory]);

  // Client-side filter
  const filteredDrops = useMemo(() => {
    let list = drops;
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d => String(d.title || '').toLowerCase().includes(q));
    }
    // Category filter
    if (activeFilterIds.length > 0) {
      list = list.filter(d => activeFilterIds.includes(Number(d.categoryId)));
    }
    return list;
  }, [drops, searchQuery, activeFilterIds]);

  const activeLabel = selectedCatObj ? String(selectedCatObj.name || '') : '';

  const formatPrice = (price: unknown) => {
    if (!price) return '';
    const num = parseFloat(String(price));
    return `€${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const SORT_LABELS: Record<string, string> = {
    newest: t('catalog.sort.newest'),
    oldest: t('catalog.sort.oldest'),
    price_asc: t('catalog.sort.priceLow'),
    price_desc: t('catalog.sort.priceHigh'),
  };

  return (
    <div className="min-h-dvh safe-top scroll-safe">
      {/* Header */}
      <header className="app-header flex items-center justify-between px-4">
        <div className="w-[44px]" />
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>{t('catalog.title')}</h1>
        <button onClick={() => setShowFilters(!showFilters)} className="w-11 h-11 rounded-full glass-card flex items-center justify-center">
          <SlidersHorizontal size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </header>

      {/* Search */}
      <section className="mx-4 mt-2">
        <div className="flex items-center gap-3 px-4 h-10 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.04)' }}>
          <Search size={16} style={{ color: 'var(--muted)' }} />
          <input type="text" placeholder={t('catalog.search')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text)' }} />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}><X size={14} style={{ color: 'var(--muted)' }} /></button>
          )}
        </div>
      </section>

      {/* Active filter chips */}
      <section className="mx-4 mt-3 flex items-center gap-2">
        {activeLabel && (
          <span className="h-[34px] px-3 rounded-full text-xs font-medium flex items-center gap-1.5"
            style={{ background: 'var(--surface)', color: 'var(--text-secondary)' }}>
            {activeLabel}
            <button onClick={() => handleCategoryClick(undefined)}><X size={12} /></button>
          </span>
        )}
        {sortBy !== 'newest' && (
          <span className="h-[34px] px-3 rounded-full text-xs font-medium flex items-center gap-1.5"
            style={{ background: 'var(--surface)', color: 'var(--text-secondary)' }}>
            {SORT_LABELS[sortBy]}
            <button onClick={() => setSortBy('newest')}><X size={12} /></button>
          </span>
        )}
      </section>

      {/* Drops list */}
      <section className="mx-4 mt-5 space-y-2">
        {filteredDrops.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{t('catalog.noResults')}</p>
          </div>
        )}
        {filteredDrops.map((drop: Record<string, unknown>) => (
          <div key={String(drop.id)} className="glass-card cursor-pointer transition-all"
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

      {/* Filters Modal */}
      <Modal open={showFilters} onClose={() => setShowFilters(false)} title={t('catalog.filters')}>
        {/* Sort */}
        <h3 className="text-xs font-semibold mb-2 mt-1" style={{ color: 'var(--muted)' }}>{t('catalog.sortBy')}</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {SORT_VALUES.map(val => {
            const labelMap: Record<string, string> = {
              newest: t('catalog.sort.newest'),
              oldest: t('catalog.sort.oldest'),
              price_asc: t('catalog.sort.priceLow'),
              price_desc: t('catalog.sort.priceHigh'),
            };
            return (
            <button key={val} onClick={() => setSortBy(val)}
              className={`px-4 h-[34px] rounded-full text-xs font-medium transition-all ${
                sortBy === val
                  ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#071A17] font-semibold'
                  : 'glass-card text-[var(--text-secondary)]'
              }`}>
              {labelMap[val]}
            </button>
          )})}
        </div>

        {/* Categories */}
        <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>{t('catalog.categories') || 'Category'}</h3>
        <div className="space-y-0.5 max-h-[40dvh] overflow-y-auto pb-safe" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 64px)' }}>
          <button onClick={() => handleCategoryClick(undefined)}
            className={`w-full flex items-center gap-3 px-4 h-11 rounded-xl text-sm transition-all ${
              selectedCategory === undefined
                ? 'bg-gradient-to-r from-[var(--gold)]/10 to-transparent text-[var(--gold)]'
                : 'hover:bg-[var(--surface)] text-[var(--text)]'
            }`}>
            <span className="flex-1 text-left font-medium">{t('catalog.all')}</span>
          </button>
          {categories.map((root: Record<string, unknown>) => {
            const subs = (root.subcategories as Record<string, unknown>[] || []);
            return (
              <div key={String(root.id)}>
                <button onClick={() => handleCategoryClick(Number(root.id))}
                  className={`w-full flex items-center gap-3 px-4 h-11 rounded-xl text-sm transition-all ${
                    Number(root.id) === selectedCategory
                      ? 'bg-gradient-to-r from-[var(--gold)]/10 to-transparent text-[var(--gold)]'
                      : 'hover:bg-[var(--surface)] text-[var(--text)]'
                  }`}
                  style={{ fontWeight: 600 }}>
                  <span>{String(root.icon || '') || <Tag size={16} style={{ color: 'var(--muted)' }} />}</span>
                  <span className="flex-1 text-left">{String(root.name || '')}</span>
                  <ChevronDown size={14} style={{ color: 'var(--muted)', opacity: 0.5 }} />
                </button>
                {subs.length > 0 && (
                  <div style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', marginLeft: '16px', paddingLeft: '8px' }}>
                    {subs.map((sub: Record<string, unknown>) => (
                      <button key={String(sub.id)} onClick={() => {
                        setSelectedCategory(Number(root.id));
                        setSelectedSubcategory(Number(sub.id));
                      }}
                        className={`w-full flex items-center gap-3 px-4 h-10 rounded-xl text-sm transition-all ${
                          Number(sub.id) === selectedSubcategory
                            ? 'bg-gradient-to-r from-[var(--gold)]/10 to-transparent text-[var(--gold)]'
                            : 'hover:bg-[var(--surface)] text-[var(--text-secondary)]'
                        }`}>
                        <span>{String(sub.icon || '') || <Tag size={16} style={{ color: 'var(--muted)' }} />}</span>
                        <span className="flex-1 text-left">{String(sub.name || '')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Bottom navigation */}
      <nav className="h-16 bottom-nav flex items-center justify-around px-2 z-50 fixed">
        <button onClick={() => navigate('/')} className="flex flex-col items-center gap-0.5" style={{ color: 'var(--muted)' }}><Home size={22} /><span className="text-[10px] font-medium">{t('nav.home')}</span></button>
        <button className="flex flex-col items-center gap-0.5" style={{ color: 'var(--gold)' }}><Package size={22} /><span className="text-[10px] font-medium">{t('nav.catalog')}</span></button>
        <button onClick={() => navigate('/profile')} className="flex flex-col items-center gap-0.5" style={{ color: 'var(--muted)' }}><User size={22} /><span className="text-[10px] font-medium">{t('nav.profile')}</span></button>
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
