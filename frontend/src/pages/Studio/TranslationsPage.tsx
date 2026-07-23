import { useTranslation } from "react-i18next";
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Languages, Check, Plus, ChevronDown } from 'lucide-react';
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

export function TranslationsPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [activeLocale, setActiveLocale] = useState('en');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const { data, isLoading } = useQuery({
    ...getTrpcQueryOptions('i18n.listKeys'),
  });

  const groups = (data as SectionGroup[]) || [];

  // Filter by search
  const filtered = search
    ? groups.map(g => ({
        ...g,
        keys: g.keys.filter(k =>
          k.key.toLowerCase().includes(search.toLowerCase()) ||
          (k.values[activeLocale] || '').toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(g => g.keys.length > 0)
    : groups;

  const handleSave = useCallback(async (key: string, locale: string, value: string) => {
    try {
      await trpcMutate('i18n.updateValue', { key, locale, value });
      // Update the live i18n bundle immediately (so t() reflects the change)
      i18n.addResource(locale, 'translation', key, value);
      queryClient.invalidateQueries({ queryKey: ['trpc', 'i18n.listKeys'] });
    } catch (e) {
      console.error('Failed to save translation:', e);
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
          Translations
        </h1>
      </header>

      {/* Language tabs */}
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
        <button className="px-3 py-1.5 rounded-full text-xs font-semibold border border-dashed border-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--gold)] transition-all flex items-center gap-1">
          <Plus size={12} /> Add
        </button>
      </div>

      {/* Search */}
      <div className="mx-4 mt-3 flex items-center gap-2 px-3 h-10 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.04)' }}>
        <Search size={14} style={{ color: 'var(--muted)' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("common.search")}
          className="flex-1 bg-transparent text-sm outline-none border-none"
          style={{ color: 'var(--text)' }}
        />
      </div>

      {/* Sections */}
      <div className="mx-4 mt-4 space-y-2 pb-32">
        {isLoading && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>Loading translations...</p>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>No translations found</p>
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
                {group.keys.map(item => (
                  <div key={item.key} className="px-4 py-3">
                    <p className="text-xs font-mono mb-1" style={{ color: 'var(--muted)' }}>{item.key}</p>
                    {editingKey === item.key ? (
                      <div className="flex gap-2">
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
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
