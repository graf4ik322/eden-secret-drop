import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Edit3, Share2, Archive, Package, ChevronDown } from 'lucide-react';
import { getTrpcQueryOptions, trpcMutate } from '@/lib/trpc';
import { useActivityStore } from '@/store/auth';
import { FabButton, GlassCard, Modal, StatusDot, CategoryPicker, ImageUploader } from '@/components/ui';
import type { StatusType } from '@/components/ui';

const FILTERS = ['All', 'Active', 'Scheduled', 'Draft', 'Archived'] as const;

const STATUS_COLORS: Record<string, StatusType> = {
  live: 'live', scheduled: 'scheduled', sold: 'sold', archived: 'archived', draft: 'draft',
};

function formatPrice(price: unknown): string {
  if (!price) return '—';
  return `€${parseFloat(String(price)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/* ===== Drop Form (unchanged) ===== */
function DropForm({ drop, categories, mockups: mockupList, onClose, onSaved }: {
  drop: Record<string, unknown> | null;
  categories: Record<string, unknown>[];
  mockups: Record<string, unknown>[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!drop;
  const [title, setTitle] = useState(String(drop?.title || ''));
  const [categoryId, setCategoryId] = useState(Number(drop?.categoryId || 0));
  const [price, setPrice] = useState(String(drop?.price || '').replace('.', ','));
  const [description, setDescription] = useState(String(drop?.description || ''));
  const [status, setStatus] = useState(String(drop?.status || 'draft'));
  const [brand, setBrand] = useState(String(drop?.brand || ''));
  const [remaining, setRemaining] = useState(Number(drop?.remaining ?? 1));
  const [scheduledAt, setScheduledAt] = useState(
    drop?.scheduledAt ? new Date(String(drop.scheduledAt)).toISOString().slice(0, 16) : ''
  );
  const [notifySubscribers, setNotifySubscribers] = useState(Boolean(drop?.notifySubscribers));
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [mockupId, setMockupId] = useState(Number(drop?.mockupId || 0));
  const [photos, setPhotos] = useState<string[]>(() => {
    try { const p = drop?.photos; return p ? JSON.parse(String(p)) : []; } catch { return []; }
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    if (!categoryId) { setError('Category is required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        categoryId,
        price: price ? price.replace(',', '.') : undefined,
        description: description || undefined,
        status,
        brand: brand || undefined,
        remaining: remaining || undefined,
        notifySubscribers,
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
        ...(mockupId ? { mockupId } : {}),
        ...(photos.length > 0 ? { photos: JSON.stringify(photos.filter(Boolean)) } : {}),
      };
      if (isEdit) {
        await trpcMutate('drop.update', { id: drop!.id, ...payload });
      } else {
        await trpcMutate('drop.create', payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-24">
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Title *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full h-11 px-4 rounded-[var(--radius-input)] text-sm outline-none"
          style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.06)' }}
          placeholder="iPhone 17 Pro" />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Category *</label>
        <button type="button" onClick={() => setShowCategoryPicker(true)}
          className="w-full flex items-center justify-between h-11 px-4 rounded-[var(--radius-input)] text-sm outline-none"
          style={{ background: 'var(--surface)', color: categoryId ? 'var(--text)' : 'var(--muted)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span>{categoryId ? String(categories.find((c: Record<string, unknown>) => c.id === categoryId)?.name || 'Select') : 'Select category'}</span>
          <ChevronDown size={14} style={{ color: 'var(--muted)' }} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Price (€)</label>
          <input value={price} onChange={(e) => setPrice(e.target.value)}
            className="w-full h-11 px-4 rounded-[var(--radius-input)] text-sm outline-none"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.06)' }}
            placeholder="2,499" />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="w-full h-11 px-4 rounded-[var(--radius-input)] text-sm outline-none appearance-none"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {['draft', 'scheduled', 'live', 'archived'].map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
          className="w-full px-4 py-3 rounded-[var(--radius-input)] text-sm outline-none resize-none"
          style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.06)' }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Brand</label>
          <input value={brand} onChange={(e) => setBrand(e.target.value)}
            className="w-full h-11 px-4 rounded-[var(--radius-input)] text-sm outline-none"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.06)' }} />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Stock</label>
          <input type="number" min={0} value={remaining} onChange={(e) => setRemaining(Number(e.target.value))}
            className="w-full h-11 px-4 rounded-[var(--radius-input)] text-sm outline-none"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.06)' }} />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Scheduled at</label>
        <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
          className="w-full h-11 px-4 rounded-[var(--radius-input)] text-sm outline-none"
          style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.06)' }} />
      </div>
      {(status === 'live' || status === 'scheduled') && (
        <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <input type="checkbox" checked={notifySubscribers} onChange={(e) => setNotifySubscribers(e.target.checked)}
            className="w-4 h-4 rounded" style={{ accentColor: 'var(--gold)' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Notify subscribers</span>
        </label>
      )}
      
      {/* Mockup selector */}
      {mockupList.length > 0 && (
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Mockup</label>
          <select value={mockupId} onChange={(e) => setMockupId(Number(e.target.value))}
            className="w-full h-11 px-4 rounded-[var(--radius-input)] text-sm outline-none appearance-none"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <option value={0}>No mockup</option>
            {mockupList.map((m: Record<string, unknown>) => (
              <option key={String(m.id)} value={Number(m.id)}>{String(m.name || '')}</option>
            ))}
          </select>
        </div>
      )}

      {/* Photos (up to 4) — upload via ImageUploader */}
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Photos (up to 4)</label>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((idx) => (
            <ImageUploader key={idx}
              value={photos[idx] || ''}
              onUploaded={(url) => {
                const next = [...photos];
                next[idx] = url;
                setPhotos(next);
              }}
              type="photos"
            />
          ))}
        </div>
      </div>

      <CategoryPicker
        open={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        onSelect={(cat) => setCategoryId(cat?.id ?? 0)}
        selectedId={categoryId || undefined}
        categories={categories.map((c: Record<string, unknown>) => ({ id: Number(c.id), name: String(c.name || ''), icon: String(c.icon || '') }))}
      />

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose}
          className="flex-1 h-11 rounded-[var(--radius-btn)] text-sm font-medium"
          style={{ background: 'var(--surface)', color: 'var(--text-secondary)' }}>Cancel</button>
        <button type="submit" disabled={saving}
          className="flex-1 h-11 rounded-[var(--radius-btn)] text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: '#071A17' }}>
          {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}

export function DropsSection() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropModal, setShowDropModal] = useState(false);
  const [editingDrop, setEditingDrop] = useState<Record<string, unknown> | null>(null);
  const queryClient = useQueryClient();

  const statusParam = activeFilter === 'All' ? undefined : activeFilter.toLowerCase() === 'active' ? 'live' : activeFilter.toLowerCase();
  const { data: allDropsRaw } = useQuery(getTrpcQueryOptions('drop.listAll', { limit: 100 }));
  const { data: catsRaw } = useQuery(getTrpcQueryOptions('category.list'));
  const { data: mockupsRaw } = useQuery(getTrpcQueryOptions('mockup.list'));
  const { data: subsRaw } = useQuery(getTrpcQueryOptions('subscriber.list'));
  const { activities } = useActivityStore();

  const allDrops = (Array.isArray(allDropsRaw) ? allDropsRaw : []) as Record<string, unknown>[];
  const categories = (Array.isArray(catsRaw) ? catsRaw : []) as Record<string, unknown>[];
  const mockups = (Array.isArray(mockupsRaw) ? mockupsRaw : []) as Record<string, unknown>[];
  const subscribers = (Array.isArray(subsRaw) ? subsRaw : []) as Record<string, unknown>[];

  const filteredDrops = useMemo(() => {
    return allDrops.filter((drop: Record<string, unknown>) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = String(drop.title || '').toLowerCase().includes(q) || String(drop.displayId || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (statusParam) return String(drop.status || '') === statusParam;
      return true;
    });
  }, [allDrops, searchQuery, statusParam]);

  const analytics = useMemo(() => ({
    active: allDrops.filter(d => d.status === 'live').length,
    sold: allDrops.filter(d => d.status === 'archived' && d.archivedReason === 'sold').length,
    draft: allDrops.filter(d => d.status === 'draft').length,
    views: allDrops.reduce((s: number, d: Record<string, unknown>) => s + Number(d.views || 0), 0),
  }), [allDrops]);

  const upcomingDrop = allDrops.find(d => d.status === 'scheduled');
  const upcomingTime = upcomingDrop?.scheduledAt
    ? new Date(String(upcomingDrop.scheduledAt)).toLocaleString()
    : '';

  const handleArchive = async (drop: Record<string, unknown>) => {
    if (!confirm(`Archive ${String(drop.displayId || '')}?`)) return;
    try {
      await trpcMutate('drop.update', { id: drop.id, status: 'archived', archivedReason: 'manual' });
      refetch();
    } catch (err: any) { alert(err?.message || 'Failed'); }
  };

  const handlePublish = async (drop: Record<string, unknown>) => {
    if (!confirm(`Publish ${String(drop.displayId || '')}?`)) return;
    try {
      await trpcMutate('drop.publish', { id: drop.id });
      refetch();
    } catch (err: any) { alert(err?.message || 'Failed'); }
  };

  const handleMarkAsSold = async (drop: Record<string, unknown>) => {
    if (!confirm(`Mark ${String(drop.displayId || '')} as sold?`)) return;
    try {
      await trpcMutate('drop.markAsSold', { id: drop.id });
      refetch();
    } catch (err: any) { alert(err?.message || 'Failed'); }
  };

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['trpc', 'drop.listAll'] });
    queryClient.invalidateQueries({ queryKey: ['trpc', 'drop.listActive'] });
    queryClient.invalidateQueries({ queryKey: ['trpc', 'drop.latest'] });
    queryClient.invalidateQueries({ queryKey: ['trpc', 'drop.getByDisplayId'] });
  };

  return (
    <>
      {/* Analytics panel (BUG-21: mt-6 отступ от хедера) */}
      <section className="mx-4 mt-6">
        <div className="glass-card p-4 flex items-center justify-around">
          {[
            { label: 'Active', value: analytics.active, color: 'var(--success)' },
            { label: 'Sold', value: analytics.sold, color: 'var(--sold)' },
            { label: 'Views', value: analytics.views, color: 'var(--gold)' },
            { label: 'Members', value: subscribers.length, color: 'var(--emerald-glow)' },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className="text-lg font-bold" style={{ color: item.color }}>{item.value}</span>
              <span className="text-[11px] font-medium" style={{ color: 'var(--muted)' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {upcomingDrop && (
        <section className="mx-4 mt-4">
          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--gold)' }}>Upcoming</p>
              <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text)' }}>{String(upcomingDrop.title || '')}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{upcomingTime}</p>
            </div>
            <button onClick={() => { setEditingDrop(upcomingDrop); setShowDropModal(true); }}
              className="btn-ghost text-xs">Edit</button>
          </div>
        </section>
      )}

      {/* Search */}
      <div className="mx-4 mt-4">
        <div className="flex items-center gap-3 px-4 h-12 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Search size={16} style={{ color: 'var(--muted)' }} />
          <input type="text" placeholder="Search Drop..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text)' }} />
        </div>
      </div>

      {/* Filter panel (FR-04) */}
      <section className="mx-4 mt-3">
        <div className="flex items-center h-10 rounded-xl px-1" style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.04)' }}>
          {FILTERS.map((f, idx) => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`relative flex-1 h-full text-xs font-medium transition-all rounded-lg ${
                activeFilter === f
                  ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#071A17] font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
              } ${idx > 0 ? 'filter-item' : ''}`}
            >{f}</button>
          ))}
        </div>
      </section>

      {/* Drops list */}
      <section className="mx-4 mt-4">
        {filteredDrops.length === 0 && (
          <div className="text-center py-10"><p className="text-sm" style={{ color: 'var(--muted)' }}>No drops found</p></div>
        )}
        {filteredDrops.map((drop: Record<string, unknown>) => (
          <GlassCard key={String(drop.id)} className="mb-2">
            <div className="flex items-center gap-3 p-3 min-h-[88px]">
              <div className="w-[72px] h-[72px] rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ background: 'var(--surface)' }}>
                {drop.cutoutUrl || drop.mockupImageUrl ? <img src={String(drop.cutoutUrl || drop.mockupImageUrl)} alt="" className="h-full w-auto object-contain" /> : <Package size={24} style={{ color: 'var(--muted)' }} />}
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{String(drop.title || '')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>{String(drop.displayId || '')}</span>
                  <StatusDot status={STATUS_COLORS[String(drop.status || 'draft')] || 'draft'} showLabel={false} />
                </div>
                <p className="text-sm font-bold" style={{ color: 'var(--gold)' }}>{formatPrice(drop.price)}</p>
              </div>
              <div className="flex items-center gap-1">
                {String(drop.status || '') === 'draft' && (
                  <button onClick={() => handlePublish(drop)}
                    className="h-8 px-3 rounded-lg text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: '#071A17' }}>
                    Publish
                  </button>
                )}
                {String(drop.status || '') === 'live' && (
                  <button onClick={() => handleMarkAsSold(drop)}
                    className="h-8 px-3 rounded-lg text-xs font-bold"
                    style={{ background: 'rgba(255,107,107,0.15)', color: 'var(--danger)', border: '1px solid rgba(255,107,107,0.2)' }}>
                    Sold
                  </button>
                )}
                <button onClick={() => { setEditingDrop(drop); setShowDropModal(true); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface-light)] transition-all">
                  <Edit3 size={13} style={{ color: 'var(--text-secondary)' }} />
                </button>
                <button onClick={() => { const baseUrl = window.location.origin; navigator.clipboard?.writeText(`${baseUrl}/#/drop/${drop.displayId}`); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface-light)] transition-all">
                  <Share2 size={13} style={{ color: 'var(--text-secondary)' }} />
                </button>
                {String(drop.status || '') !== 'archived' && (
                  <button onClick={() => handleArchive(drop)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface-light)] transition-all">
                    <Archive size={13} style={{ color: 'var(--danger)' }} />
                  </button>
                )}
              </div>
            </div>
          </GlassCard>
        ))}
      </section>

      {/* Activity log */}
      {activities.length > 0 && (
        <section className="mx-4 mt-4">
          <GlassCard className="p-4">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Activity</h3>
            <div className="space-y-2">
              {activities.slice(0, 10).map((a: { id: number; text: string; time: Date }) => (
                <div key={a.id} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--gold)' }} />
                  <span>{a.text}</span>
                  <span className="ml-auto flex-shrink-0" style={{ color: 'var(--muted)' }}>
                    {new Date(a.time).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        </section>
      )}

      {/* Drop Form Modal */}
      <Modal open={showDropModal} onClose={() => { setShowDropModal(false); setEditingDrop(null); }}
        title={editingDrop ? 'Edit Drop' : 'New Drop'}>
        <DropForm drop={editingDrop} categories={categories} mockups={mockups} onClose={() => { setShowDropModal(false); setEditingDrop(null); }} onSaved={refetch} />
      </Modal>

      {/* FAB (FR-08) */}
      <FabButton onClick={() => { setEditingDrop(null); setShowDropModal(true); }} />
    </>
  );
}
