import { useTranslation } from "react-i18next";
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Languages, Check, Plus, ChevronDown, Trash2, Eye, EyeOff } from 'lucide-react';
import { getTrpcQueryOptions, trpcMutate } from '@/lib/trpc';
import i18n from '@/lib/i18n';

interface TranslationKey {
  id: number;
  key: string;
  section: string;
  values: Record<string, string>;
}

interface SectionGroup {
  section: string;
  keys: TranslationKey[];
  count: number;
}

/** Keys that are actively used in frontend code (static + dynamic t() calls) */
const USED_KEYS = new Set([
  'catalog.filters', 'catalog.search', 'catalog.title',
  'common.error', 'common.loading', 'common.search', 'common.noTranslations',
  'drop.buyNow', 'drop.deliveryText', 'drop.estimatedDelivery', 'drop.inStock', 'drop.info', 'drop.limited',
  'drop.live', 'drop.na', 'drop.notFound', 'drop.published', 'drop.publishedHour', 'drop.publishedLessThanHour',
  'drop.remaining', 'drop.sold', 'drop.soldOut', 'drop.trust.fastDelivery', 'drop.trust.original',
  'drop.trust.verified', 'drop.trust.warranty', 'drop.viewed',
  'home.active', 'home.allTime', 'home.featured', 'home.featuredDesc', 'home.featuredSubtitle',
  'home.latest', 'home.tagline', 'home.taglineSub',
  'mockup.add', 'mockup.edit',
  'nav.catalog', 'nav.home', 'nav.profile', 'nav.studio',
  'profile.language', 'profile.memberSince', 'profile.selectLanguage', 'profile.title',
  'studio.addCategory', 'studio.addSubcategory', 'studio.categories', 'studio.categoryName',
  'studio.drops', 'studio.editDrop', 'studio.joinDrop', 'studio.mockups', 'studio.newDrop',
  'studio.searchPlaceholder', 'studio.selectCategory', 'studio.tapToUpload', 'studio.title',
  'studio.translations', 'studio.view',
  // New keys added in cleanup
  'catalog.sortBy', 'studio.noCategories', 'studio.parentCategory', 'studio.noMockups',
  'studio.scheduledAt', 'studio.notifySubscribers', 'studio.noMockup',
  'catalog.all', 'catalog.noResults', 'catalog.sort.newest', 'catalog.sort.oldest',
  'catalog.sort.priceLow', 'catalog.sort.priceHigh', 'home.nextDrop', 'home.noDropsAvailable',
  'profile.admin', 'profile.member', 'studio.noDrops',
]);

/** Check if a flat dotted key is referenced in frontend code */
function isKeyUsedInCode(key: string): boolean {
  return USED_KEYS.has(key);
}

export function TranslationsPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [activeLocale, setActiveLocale] = useState('en');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showUsedOnly, setShowUsedOnly] = useState(true);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [addingKey, setAddingKey] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [reseedStatus, setReseedStatus] = useState<'idle'|'loading'|'done'|'error'>('idle');

  const { data, isLoading } = useQuery({
    ...getTrpcQueryOptions('i18n.listKeys'),
  });

  const groups = (data as SectionGroup[]) || [];

  // Filter by search + used toggle
  const filtered = groups
    .map(g => ({
      ...g,
      keys: g.keys.filter(k => {
        const matchesSearch = !search ||
          k.key.toLowerCase().includes(search.toLowerCase()) ||
          (k.values[activeLocale] || '').toLowerCase().includes(search.toLowerCase());
        const matchesUsed = !showUsedOnly || isKeyUsedInCode(k.key);
        return matchesSearch && matchesUsed;
      }),
    }))
    .filter(g => g.keys.length > 0);

  const usedCount = groups.reduce((acc, g) => acc + g.keys.filter(k => isKeyUsedInCode(k.key)).length, 0);
  const totalCount = groups.reduce((acc, g) => acc + g.keys.length, 0);

  const handleSave = useCallback(async (key: string, locale: string, value: string) => {
    try {
      await trpcMutate('i18n.updateValue', { key, locale, value });
      i18n.addResource(locale, 'translation', key, value);
      // Оптимистично обновляем кэш, чтобы UI показал новое значение мгновенно
      queryClient.setQueryData(['i18n', 'i18n.listKeys', undefined], (old: SectionGroup[] | undefined) => {
        if (!old) return old;
        return old.map(group => ({
          ...group,
          keys: group.keys.map(item => {
            if (item.key === key) {
              return { ...item, values: { ...item.values, [locale]: value } };
            }
            return item;
          }),
        }));
      });
    } catch (e) {
      console.error('Failed to save translation:', e);
    }
  }, [queryClient]);

  const handleDelete = useCallback(async (key: string) => {
    try {
      // Clear value for all locales
      for (const locale of ['en', 'ru']) {
        await trpcMutate('i18n.updateValue', { key, locale, value: '' });
      }
      queryClient.invalidateQueries({ queryKey: ['i18n'] });
      setDeletingKey(null);
    } catch (e) {
      console.error('Failed to delete translation:', e);
    }
  }, [queryClient]);

  const handleAddKey = useCallback(async () => {
    if (!addingKey.trim()) return;
    try {
      for (const locale of ['en', 'ru']) {
        await trpcMutate('i18n.updateValue', { key: addingKey.trim(), locale, value: '' });
      }
      queryClient.invalidateQueries({ queryKey: ['i18n'] });
      setAddingKey('');
      setShowAddForm(false);
      // Auto-expand the section
      const section = addingKey.trim().split('.')[0];
      setExpanded(prev => { const n = new Set(prev); n.add(section); return n; });
    } catch (e) {
      console.error('Failed to add translation:', e);
    }
  }, [addingKey, queryClient]);

  const handleReseed = useCallback(async () => {
    setReseedStatus('loading');
    try {
      await trpcMutate('i18n.reseed', {});
      setReseedStatus('done');
      queryClient.invalidateQueries({ queryKey: ['i18n'] });
      setTimeout(() => setReseedStatus('idle'), 3000);
    } catch (e) {
      console.error('Failed to reseed translations:', e);
      setReseedStatus('error');
      setTimeout(() => setReseedStatus('idle'), 3000);
    }
  }, [queryClient]);

  const toggleSection = (section: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  return (
    <div className="min-h-dvh safe-top scroll-safe">
      <header className="app-header flex items-center justify-between px-4">
        <h1 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
          <Languages size={18} style={{ color: 'var(--gold)' }} className="inline mr-2" />
          {t('studio.translations')}
        </h1>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>
          {usedCount}/{totalCount} {t('common.loading')?.includes('Loading') ? 'used' : 'исп.'}
        </span>
      </header>

      {/* Language tabs + Add key */}
      <div className="flex items-center gap-2 px-4 mt-4 overflow-x-auto">
        {['en', 'ru'].map(locale => (
          <button
            key={locale}
            onClick={() => setActiveLocale(locale)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeLocale === locale
                ? 'bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/40'
                : 'bg-[var(--surface)] text-[var(--muted)] border border-transparent hover:border-[var(--surface-light)]'
            }`}
          >
            {locale === 'en' ? 'EN' : 'RU'}
          </button>
        ))}
        <button
          onClick={() => {
            setShowAddForm(true);
            setAddingKey('');
          }}
          className="px-3 py-1.5 rounded-full text-xs font-semibold border border-dashed border-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--gold)] transition-all flex items-center gap-1"
        >
          <Plus size={12} /> Add key
        </button>
        <button
          onClick={handleReseed}
          disabled={reseedStatus === 'loading'}
          className="px-3 py-1.5 rounded-full text-xs font-semibold border border-dashed border-[var(--surface-light)] transition-all flex items-center gap-1"
          style={{
            color: reseedStatus === 'done' ? 'var(--gold)' : reseedStatus === 'error' ? '#ef4444' : 'var(--muted)',
            borderColor: reseedStatus === 'done' ? 'var(--gold)' : reseedStatus === 'error' ? '#ef4444' : 'var(--surface-light)',
          }}
        >
          {reseedStatus === 'loading' ? '...' : reseedStatus === 'done' ? '✓ Synced' : reseedStatus === 'error' ? '✗ Failed' : '↻ Reseed'}
        </button>
      </div>

      {/* Search + filter toggle */}
      <div className="mx-4 mt-3 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 h-10 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.04)' }}>
          <Search size={14} style={{ color: 'var(--muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.search")}
            className="flex-1 bg-transparent text-sm outline-none border-none"
            style={{ color: 'var(--text)' }}
          />
        </div>
        <button
          onClick={() => setShowUsedOnly(!showUsedOnly)}
          className="px-3 h-10 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
          style={{
            background: showUsedOnly ? 'var(--gold)' : 'var(--surface)',
            color: showUsedOnly ? 'var(--bg)' : 'var(--muted)',
            border: '1px solid rgba(255,255,255,0.04)'
          }}
          title={showUsedOnly ? t('common.search')?.includes('Search') ? 'Show all keys' : 'Показать все' : t('common.search')?.includes('Search') ? 'Show used only' : 'Только используемые'}
        >
          {showUsedOnly ? <Eye size={14} /> : <EyeOff size={14} />}
          {showUsedOnly ? 'Used' : 'All'}
        </button>
      </div>

      {/* Add key form */}
      {showAddForm && (
        <div className="mx-4 mt-3 p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--gold)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>
            {t('studio.translations')?.includes('Translations') ? 'New translation key (e.g. \"section.keyName\")' : 'Новый ключ (напр. \"section.keyName\")'}
          </p>
          <div className="flex items-center gap-2">
            <input
              value={addingKey}
              onChange={(e) => setAddingKey(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddKey(); if (e.key === 'Escape') setShowAddForm(false); }}
              placeholder="section.keyName"
              autoFocus
              className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <button
              onClick={handleAddKey}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--gold)', color: 'var(--bg)' }}
            >
              <Plus size={14} />
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--surface)', color: 'var(--muted)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="mx-4 mt-4 space-y-2 pb-32">
        {isLoading && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>{t('common.loading')}</p>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>{t('common.noTranslations')}</p>
        )}
        {filtered.map(group => (
          <div key={group.section} className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.04)' }}>
            {/* Section header (accordion trigger) */}
            <button
              onClick={() => toggleSection(group.section)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:opacity-80 transition-all"
              style={{ color: 'var(--text)' }}
            >
              <span>{group.section} <span className="text-xs font-normal" style={{ color: 'var(--muted)' }}>({group.count})</span></span>
              <ChevronDown size={16} className={`transition-transform ${expanded.has(group.section) ? '' : '-rotate-90'}`} style={{ color: 'var(--muted)' }} />
            </button>

            {/* Keys */}
            {expanded.has(group.section) && (
              <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                {group.keys.map(item => {
                  const isUsed = isKeyUsedInCode(item.key);
                  return (
                    <div key={item.key} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${isUsed ? 'bg-green-500' : 'bg-red-500'}`} />
                          <p className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{item.key}</p>
                        </div>
                        {deletingKey === item.key ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(item.key)}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold"
                              style={{ background: '#ef4444', color: 'white' }}
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setDeletingKey(null)}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold"
                              style={{ background: 'var(--surface)', color: 'var(--muted)' }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingKey(item.key)}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                            style={{ color: 'var(--muted)' }}
                            title="Delete key"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      {editingKey === item.key ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => {
                              handleSave(item.key, activeLocale, editValue);
                              setEditingKey(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSave(item.key, activeLocale, editValue);
                                setEditingKey(null);
                              }
                              if (e.key === 'Escape') setEditingKey(null);
                            }}
                            autoFocus
                            className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
                            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--gold)' }}
                          />
                          <button
                            onClick={() => {
                              handleSave(item.key, activeLocale, editValue);
                              setEditingKey(null);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{ background: 'var(--gold)', color: 'var(--bg)' }}
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingKey(item.key);
                            setEditValue(item.values[activeLocale] || '');
                          }}
                          className="w-full text-sm text-left px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                          style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text)' }}
                        >
                          {item.values[activeLocale] || <span style={{ color: 'var(--muted)' }}>— empty —</span>}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
