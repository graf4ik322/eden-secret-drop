import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { getTrpcQueryOptions, trpcMutate } from '@/lib/trpc';
import { GlassCard, Modal, FabButton, CategoryPicker } from '@/components/ui';

export function CategoriesSection() {
  const { data: catsRaw } = useQuery(getTrpcQueryOptions('category.list'));
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [showNewCat, setShowNewCat] = useState(false);
  const [showNewSub, setShowNewSub] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const categories = (Array.isArray(catsRaw) ? catsRaw : []) as Record<string, unknown>[];
  const rootCats = useMemo(() => categories.filter(c => !c.parentId), [categories]);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['trpc', 'category.list'] });

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    try {
      await trpcMutate('category.delete', { id });
      refetch();
    } catch (err: any) { alert(err?.message || 'Failed'); }
  };

  return (
    <>
      <section className="mx-4 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Categories</h2>
        </div>

        {rootCats.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No categories yet</p>
          </div>
        )}

        <div className="space-y-2">
          {rootCats.map((cat: Record<string, unknown>) => {
            const subs = categories.filter(c => c.parentId === cat.id);
            const isExpanded = expandedIds.has(Number(cat.id));
            return (
              <GlassCard key={String(cat.id)} className="overflow-hidden">
                {/* Root category header — accordion */}
                <button onClick={() => toggleExpand(Number(cat.id))}
                  className="w-full flex items-center gap-3 p-4 text-left transition-all hover:bg-[var(--surface)]/30">
                  {subs.length > 0 ? (
                    isExpanded ? <ChevronDown size={16} style={{ color: 'var(--muted)' }} />
                      : <ChevronRight size={16} style={{ color: 'var(--muted)' }} />
                  ) : <div className="w-4" />}
                  <span className="text-sm">{String(cat.icon || '')}</span>
                  <span className="text-sm font-medium flex-1" style={{ color: 'var(--text)' }}>{String(cat.name || '')}</span>
                  {subs.length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--surface)', color: 'var(--muted)' }}>
                      {subs.length}
                    </span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setShowNewSub(Number(cat.id)); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--surface)] transition-all">
                    <Plus size={14} style={{ color: 'var(--gold)' }} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(Number(cat.id), String(cat.name)); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--surface)] transition-all">
                    <Trash2 size={13} style={{ color: 'var(--danger)' }} />
                  </button>
                </button>

                {/* Subcategories (collapsible) */}
                {isExpanded && subs.length > 0 && (
                  <div className="border-t border-[var(--surface-light)]/30">
                    {subs.map((sub: Record<string, unknown>) => (
                      <div key={String(sub.id)}
                        className="flex items-center gap-3 px-4 py-3 ml-7"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <span className="text-sm">{String(sub.icon || '')}</span>
                        <span className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>{String(sub.name || '')}</span>
                        <button onClick={() => handleDelete(Number(sub.id), String(sub.name))}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--surface)] transition-all">
                          <Trash2 size={12} style={{ color: 'var(--danger)' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* Add Root Category Modal */}
      <CategoryFormModal open={showNewCat} onClose={() => setShowNewCat(false)} parentId={null}
        categories={categories} onSaved={refetch} />

      {/* Add Subcategory Modal */}
      <CategoryFormModal open={showNewSub !== null} onClose={() => setShowNewSub(null)}
        parentId={showNewSub} categories={categories} onSaved={refetch} />

      {/* FAB — add root category */}
      <FabButton onClick={() => setShowNewCat(true)} />
    </>
  );
}

/* ===== Inline Category Form Modal ===== */
function CategoryFormModal({ open, onClose, parentId: initialParentId, categories, onSaved }: {
  open: boolean;
  onClose: () => void;
  parentId: number | null;
  categories: Record<string, unknown>[];
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [parentId, setParentId] = useState<number | null>(initialParentId);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name required'); return; }
    setSaving(true);
    setError('');
    try {
      await trpcMutate('category.create', { name: name.trim(), icon: icon || undefined, parentId: parentId || undefined });
      onSaved();
      onClose();
      setName('');
      setIcon('');
    } catch (err: any) { setError(err?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={parentId ? 'Add Subcategory' : 'Add Category'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full h-11 px-4 rounded-[var(--radius-input)] text-sm outline-none"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.06)' }}
            placeholder="Category name" />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Icon (emoji)</label>
          <input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={2}
            className="w-full h-11 px-4 rounded-[var(--radius-input)] text-sm outline-none"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.06)' }}
            placeholder="🔌" />
        </div>
        {parentId && (
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Parent: {String(categories.find(c => c.id === parentId)?.name || '')}
          </p>
        )}
        {parentId && (
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Parent: {String(categories.find(c => c.id === parentId)?.name || '')}
          </p>
        )}
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Parent category</label>
          <button type="button" onClick={() => setShowPicker(true)}
            className="w-full flex items-center justify-between h-11 px-4 rounded-[var(--radius-input)] text-sm outline-none"
            style={{ background: 'var(--surface)', color: parentId ? 'var(--text)' : 'var(--muted)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span>{parentId ? String(categories.find(c => c.id === parentId)?.name || '') : 'No parent (root category)'}</span>
            <ChevronDown size={14} style={{ color: 'var(--muted)' }} />
          </button>
        </div>

        <CategoryPicker
          open={showPicker}
          onClose={() => setShowPicker(false)}
          onSelect={(cat) => setParentId(cat?.id ?? null)}
          selectedId={parentId ?? undefined}
          categories={categories.filter(c => !c.parentId).map(c => ({ id: Number(c.id), name: String(c.name || ''), icon: String(c.icon || '') }))}
          allowNull
        />

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 h-11 rounded-[var(--radius-btn)] text-sm font-medium"
            style={{ background: 'var(--surface)', color: 'var(--text-secondary)' }}>Cancel</button>
          <button type="submit" disabled={saving}
            className="flex-1 h-11 rounded-[var(--radius-btn)] text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: '#071A17' }}>
            {saving ? 'Saving...' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
