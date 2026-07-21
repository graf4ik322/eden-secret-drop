import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit3, Share2, Archive, Package, Home, Trash2, X, Folder, FileText, Menu } from 'lucide-react';
import { Drawer } from '@/components/ui';
import { getTrpcQueryOptions, trpcMutate } from '@/lib/trpc';
import { useIsAdmin } from '@/lib/useIsAdmin';
import { useActivityStore } from '@/store/auth';
import { GlassCard, StatusDot } from '@/components/ui';
import type { StatusType } from '@/components/ui';

const FILTERS = ['All', 'Active', 'Scheduled', 'Draft', 'Archived'] as const;

const STATUS_COLORS: Record<string, StatusType> = {
  live: 'live', scheduled: 'scheduled', sold: 'sold', archived: 'archived', draft: 'draft',
};

function formatPrice(price: unknown): string {
  if (!price) return '\u2014';
  return `\u20AC${parseFloat(String(price)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/* ===== Drop Form ===== */
function DropForm({ drop, categories, onClose, onSaved }: {
  drop: Record<string, unknown> | null;
  categories: Record<string, unknown>[];
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
  const [notifySubscribers, setNotifySubscribers] = useState(Boolean(drop?.notifySubscribers ?? false));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const rootCats = categories.filter(c => !c.parentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('Title is required'); return; }
    if (!categoryId) { setError('Category is required'); return; }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        categoryId,
        price: price ? price.replace(',', '.') : undefined,
        description: description || undefined,
        status,
        brand: brand || undefined,
        remaining,
        notifySubscribers,
      };
      if (status === 'scheduled' && scheduledAt) {
        payload.scheduledAt = new Date(scheduledAt).toISOString();
      }
      if (isEdit && drop) {
        await trpcMutate('drop.update', { id: drop.id, ...payload });
      } else {
        await trpcMutate('drop.create', payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error saving drop');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-24">
      {error && (
        <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(255,107,107,0.15)', color: 'var(--danger)' }}>{error}</div>
      )}
      <div>
        <label className="text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>Title *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Rolex Submariner"
          className="w-full h-12 px-4 rounded-xl text-sm outline-none"
          style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.08)' }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>Category *</label>
          <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}
            className="w-full h-12 px-4 rounded-xl text-sm outline-none appearance-none cursor-pointer"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <option value={0}>Select</option>
            {rootCats.map((cat: Record<string, unknown>) => {
              const subs = categories.filter((c: Record<string, unknown>) => c.parentId === cat.id);
              if (subs.length > 0) return (
                <optgroup key={String(cat.id)} label={`${cat.icon || ''} ${cat.name || ''}`}>
                  {subs.map((sub: Record<string, unknown>) => (
                    <option key={String(sub.id)} value={Number(sub.id)}>{String(sub.icon || '')} {String(sub.name || '')}</option>
                  ))}
                </optgroup>
              );
              return <option key={String(cat.id)} value={Number(cat.id)}>{String(cat.icon || '')} {String(cat.name || '')}</option>;
            })}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>Price (\u20AC)</label>
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="9500"
            className="w-full h-12 px-4 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.08)' }} />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe the drop..."
          className="w-full p-4 rounded-xl text-sm outline-none resize-none"
          style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.08)' }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>Brand</label>
          <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Rolex"
            className="w-full h-12 px-4 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.08)' }} />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>Quantity</label>
          <input value={remaining} onChange={(e) => setRemaining(Number(e.target.value))} type="number" min="1"
            className="w-full h-12 px-4 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.08)' }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="w-full h-12 px-4 rounded-xl text-sm outline-none appearance-none cursor-pointer"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {['draft', 'scheduled', 'live', 'archived'].map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
        {status === 'scheduled' && (
          <div>
            <label className="text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>Schedule Date</label>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full h-12 px-4 rounded-xl text-sm outline-none"
              style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.08)' }} />
          </div>
        )}
      </div>
      {(status === 'live' || status === 'scheduled') && (
        <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
          style={{ background: 'rgba(212,175,116,0.08)', border: '1px solid rgba(212,175,116,0.15)' }}>
          <input type="checkbox" checked={notifySubscribers} onChange={(e) => setNotifySubscribers(e.target.checked)}
            className="w-[18px] h-[18px] accent-[var(--gold)]" />
          <div>
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Notify subscribers</span>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Send push notification when this drop goes live</p>
          </div>
        </label>
      )}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose}
          className="flex-1 h-12 rounded-xl font-semibold text-sm"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>Cancel</button>
        <button type="submit" disabled={saving}
          className="flex-1 h-12 rounded-xl font-bold text-sm transition-all"
          style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: '#071A17' }}>
          {saving ? 'Saving...' : isEdit ? 'Update Drop' : 'Create Drop'}
        </button>
      </div>
    </form>
  );
}

/* ===== Category Manager ===== */
function CategoryManager() {
  const queryClient = useQueryClient();
  const { data: catsRaw } = useQuery(getTrpcQueryOptions('category.list'));
  const cats = (Array.isArray(catsRaw) ? catsRaw : []) as Record<string, unknown>[];
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [parentId, setParentId] = useState<number | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const rootCats = cats.filter(c => !c.parentId);

  const createCat = async () => {
    if (!newName.trim()) { setError('Name required'); return; }
    try {
      await trpcMutate('category.create', { name: newName.trim(), icon: newIcon || undefined, parentId });
      setNewName(''); setNewIcon(''); setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['trpc', 'category.list'] });
    } catch (err: any) { setError(err.message); }
  };

  const deleteCat = async (id: number) => {
    if (!confirm('Delete this category?')) return;
    try {
      await trpcMutate('category.delete', { id });
      queryClient.invalidateQueries({ queryKey: ['trpc', 'category.list'] });
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(255,107,107,0.15)', color: 'var(--danger)' }}>{error}</div>
      )}
      <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--gold)' }}>
        <Plus size={16} /> {showForm ? 'Cancel' : 'Add Category'}
      </button>
      {showForm && (
        <div className="glass-card p-4 space-y-3">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Category name"
            className="w-full h-12 px-4 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.08)' }} />
          <div className="flex gap-2">
            <input value={newIcon} onChange={(e) => setNewIcon(e.target.value)} placeholder="Emoji" className="w-20 h-12 px-4 rounded-xl text-sm outline-none"
              style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.08)' }} />
            <select value={parentId || ''} onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : undefined)}
              className="flex-1 h-12 px-4 rounded-xl text-sm outline-none"
              style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <option value="">Root category</option>
              {rootCats.map((cat: Record<string, unknown>) => (
                <option key={String(cat.id)} value={Number(cat.id)}>Sub of {String(cat.name || '')}</option>
              ))}
            </select>
          </div>
          <button onClick={createCat}
            className="w-full h-12 rounded-xl font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: '#071A17' }}>Create</button>
        </div>
      )}
      {rootCats.map((cat: Record<string, unknown>) => {
        const subs = cats.filter((c: Record<string, unknown>) => c.parentId === cat.id) as Record<string, unknown>[];
        return (
          <div key={String(cat.id)} className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{cat.icon ? String(cat.icon) : <Folder size={18} />}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{String(cat.name || '')}</span>
                <span className="text-xs ml-1" style={{ color: 'var(--muted)' }}>#{Number(cat.sortOrder || 0)}</span>
              </div>
              <button onClick={() => deleteCat(Number(cat.id))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 transition-all" style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
            </div>
            {subs.length > 0 && (
              <div className="mt-2 ml-4 space-y-1.5 pl-3" style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                {subs.map((sub: Record<string, unknown>) => (
                  <div key={String(sub.id)} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{sub.icon ? String(sub.icon) : <FileText size={16} />}</span>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{String(sub.name || '')}</span>
                    </div>
                    <button onClick={() => deleteCat(Number(sub.id))} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-500/10" style={{ color: 'var(--danger)' }}><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ===== Main Studio Page ===== */
export function StudioPage() {
  const { activities, addActivity } = useActivityStore();
  // Admin check with loading state (TZ 2.7)
  const adminState = useIsAdmin();
  
  if (adminState.status === 'loading') {
    return (
      <div className="min-h-dvh safe-top safe-bottom flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--surface)' }}>
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--emerald)', borderTopColor: 'transparent' }} />
          </div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Verifying identity...</p>
        </div>
      </div>
    );
  }
  
  if (adminState.status === 'error') {
    return (
      <div className="min-h-dvh safe-top safe-bottom flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--surface)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="1.5"><polygon points="12,2 22,8 22,18 12,24 2,18 2,8" /></svg>
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>Drop Studio</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Verification failed. Try opening from Telegram.</p>
        </div>
      </div>
    );
  }
  
  if (adminState.status === 'checked' && !adminState.isAdmin) {
    return (
      <div className="min-h-dvh safe-top safe-bottom flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--surface)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5"><polygon points="12,2 22,8 22,18 12,24 2,18 2,8" /></svg>
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>Drop Studio</h2>
          <p className="text-sm mb-2" style={{ color: 'var(--muted)' }}>Admin access required. Open from Telegram to verify.</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Your Telegram ID must be in ADMIN_IDS on the server.</p>
        </div>
      </div>
    );
  }
  
  // ===== Admin verified =====

  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropModal, setShowDropModal] = useState(false);
  const [editingDrop, setEditingDrop] = useState<Record<string, unknown> | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showCategoriesScreen, setShowCategoriesScreen] = useState(false);
  const queryClient = useQueryClient();

  const statusParam = activeFilter === 'All' ? undefined : activeFilter.toLowerCase() === 'active' ? 'live' : activeFilter.toLowerCase();
  // Критично: запрос всегда без фильтра — аналитика не зависит от выбранного фильтра (BUG-17)
  const { data: allDropsRaw } = useQuery(getTrpcQueryOptions('drop.listAll', { limit: 100 }));
  const { data: catsRaw } = useQuery(getTrpcQueryOptions('category.list'));
  const { data: subsRaw } = useQuery(getTrpcQueryOptions('subscriber.list'));

  const allDrops = (Array.isArray(allDropsRaw) ? allDropsRaw : []) as Record<string, unknown>[];
  const categories = (Array.isArray(catsRaw) ? catsRaw : []) as Record<string, unknown>[];
  const subscribers = (Array.isArray(subsRaw) ? subsRaw : []) as Record<string, unknown>[];

  // Фильтр применяется только на уровне отображения — не влияет на аналитику
  const filteredDrops = useMemo(() => {
    return allDrops.filter((drop: Record<string, unknown>) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = String(drop.title || '').toLowerCase().includes(q) || String(drop.displayId || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (statusParam) {
        return String(drop.status || '') === statusParam;
      }
      return true;
    });
  }, [allDrops, searchQuery, statusParam]);

  const analytics = useMemo(() => ({
    active: allDrops.filter(d => d.status === 'live').length,
    sold: allDrops.filter(d => d.status === 'archived' && d.archivedReason === 'sold').length,
    draft: allDrops.filter(d => d.status === 'draft').length,
    views: allDrops.reduce((s: number, d: Record<string, unknown>) => s + Number(d.views || 0), 0),
  }), [allDrops]);

  const upcomingDrop = allDrops.find(d => d.status === 'scheduled') as Record<string, unknown> | undefined;
  const upcomingTime = upcomingDrop?.scheduledAt ? new Date(String(upcomingDrop.scheduledAt)).toLocaleString() : null;

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['trpc'] });
  };

  const handleArchive = async (drop: Record<string, unknown>) => {
    if (!confirm(`Archive ${String(drop.displayId || '')}?`)) return;
    try {
      await trpcMutate('drop.update', { id: drop.id, status: 'archived', archivedReason: 'manual' });
      addActivity('Archived ' + String(drop.displayId || '') + ' - ' + String(drop.title || ''));
      refetch();
    } catch {}
  };

  const handlePublish = async (drop: Record<string, unknown>) => {
    if (!confirm(`Publish ${String(drop.displayId || '')}? This will notify subscribers.`)) return;
    try {
      await trpcMutate('drop.publish', { id: drop.id });
      addActivity('Published ' + String(drop.displayId || ''));
      refetch();
    } catch (err: any) {
      alert(err?.message || 'Failed to publish');
    }
  };

  const handleMarkAsSold = async (drop: Record<string, unknown>) => {
    if (!confirm(`Mark ${String(drop.displayId || '')} as SOLD?`)) return;
    try {
      await trpcMutate('drop.markAsSold', { id: drop.id });
      addActivity('Marked as sold ' + String(drop.displayId || ''));
      refetch();
    } catch (err: any) {
      alert(err?.message || 'Failed to mark as sold');
    }
  };

  return (
    <div className="min-h-dvh safe-top safe-bottom pb-24">
      <header className="flex items-center justify-between px-4 h-16 border-b border-[var(--surface-light)]/50">
        <button onClick={() => setDrawerOpen(true)}
          className="w-11 h-11 rounded-full glass-card flex items-center justify-center transition-all">
          <Menu size={20} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Drop Studio</h1>
        <button onClick={() => navigate('/')}
          className="w-11 h-11 rounded-full glass-card flex items-center justify-center transition-all">
          <Home size={20} style={{ color: 'var(--gold)' }} />
        </button>
      </header>

      {/* Drawer navigation */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="flex flex-col gap-1">
          {[
            { id: 'drops', label: 'Дропы', icon: Package, active: !showCategoriesScreen },
            { id: 'categories', label: 'Категории', icon: Folder, active: showCategoriesScreen },
          ].map((item) => (
            <button key={item.id} onClick={() => {
              setShowCategoriesScreen(item.id === 'categories');
              setDrawerOpen(false);
            }}
              className={`flex items-center gap-3 px-4 h-12 rounded-xl text-sm font-medium transition-all ${
                item.active
                  ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#071A17]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>
      </Drawer>

      <section className="mx-4">
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

      <div className="mx-4 mt-4">
        <div className="flex items-center gap-3 px-4 h-12 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Search size={16} style={{ color: 'var(--muted)' }} />
          <input type="text" placeholder="Search Drop..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text)' }} />
        </div>
      </div>

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

      {showCategoriesScreen ? (
        /* ===== Categories Screen (FR-03) ===== */
        <section className="mx-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Categories</h3>
          </div>
          <CategoryManager />
        </section>
      ) : (
        /* ===== Drops List (default) ===== */
        <>
      <div className="mx-4 mt-4">
        <div className="flex items-center gap-3 px-4 h-12 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Search size={16} style={{ color: 'var(--muted)' }} />
          <input type="text" placeholder="Search Drop..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text)' }} />
        </div>
      </div>

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

      <section className="mx-4 mt-4">
        {filteredDrops.length === 0 && (
          <div className="text-center py-10"><p className="text-sm" style={{ color: 'var(--muted)' }}>No drops found</p></div>
        )}
        {filteredDrops.map((drop: Record<string, unknown>) => (
          <GlassCard key={String(drop.id)} className="mb-2">
            <div className="flex items-center gap-3 p-3 min-h-[88px]">
              <div className="w-[72px] h-[72px] rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ background: 'var(--surface)' }}>
                {drop.cutoutUrl ? <img src={String(drop.cutoutUrl)} alt="" className="h-full w-auto object-contain" /> : <Package size={24} style={{ color: 'var(--muted)' }} />}
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

      {showDropModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5" style={{ background: 'var(--bg-secondary)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                {editingDrop ? `Edit ${String(editingDrop.displayId || '')}` : 'New Drop'}
              </h2>
              <button onClick={() => { setShowDropModal(false); setEditingDrop(null); }} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ color: 'var(--muted)' }}><X size={18} /></button>
            </div>
            <DropForm
              drop={editingDrop}
              categories={categories}
              onClose={() => { setShowDropModal(false); setEditingDrop(null); }}
              onSaved={() => {
                if (editingDrop) addActivity('Updated ' + String(editingDrop.displayId || ''));
                else addActivity('Created new drop');
                refetch();
              }}
            />
          </div>
        </div>
      )}

      {activities.length > 0 && (
        <section className="mx-4 mt-6">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Recent Activity</h3>
          <GlassCard className="p-4">
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
      </>
      )}

      {/* FAB — create new drop */}
      <button onClick={() => { setEditingDrop(null); setShowDropModal(true); }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full z-40 flex items-center justify-center shadow-lg transition-all active:scale-95"
        style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: '#071A17', boxShadow: '0 4px 24px rgba(212,175,116,0.35)' }}>
        <Plus size={24} />
      </button>
    </div>
  );
}
export default StudioPage;
