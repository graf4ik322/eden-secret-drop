import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Pencil } from 'lucide-react';
import { getTrpcQueryOptions, trpcMutate } from '@/lib/trpc';
import { GlassCard, Modal, FabButton, ImageUploader } from '@/components/ui';

export function MockupsSection() {
  const { data: raw } = useQuery(getTrpcQueryOptions('mockup.list'));
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mockupList = (Array.isArray(raw) ? raw : []) as Record<string, unknown>[];
  const refetch = () => queryClient.invalidateQueries({ queryKey: ['mockup'] });

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete mockup "${name}"?`)) return;
    try { await trpcMutate('mockup.delete', { id }); refetch(); }
    catch (err: any) { alert(err?.message || 'Failed'); }
  };

  return (
    <>
      <section className="mx-4 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Mockups</h2>
        </div>

        {mockupList.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{t('studio.noMockups')}</p>
            <button onClick={() => { setEditing(null); setShowForm(true); }}
              className="mt-4 px-5 h-10 rounded-xl text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: '#071A17' }}>
              + Add Mockup
            </button>
          </div>
        )}

        <div className="space-y-2">
          {mockupList.map((m: Record<string, unknown>) => (
            <GlassCard key={String(m.id)} className="flex items-center gap-4 p-4">
              {/* Preview */}
              <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                style={{ background: 'var(--surface)' }}>
                {m.imageUrl
                  ? <img src={String(m.imageUrl)} alt="" className="h-full w-auto object-contain" />
                  : <span className="text-2xl opacity-20">✦</span>
                }
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{String(m.name || '')}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
                  {m.createdAt ? new Date(String(m.createdAt)).toLocaleDateString() : ''}
                </p>
              </div>
              {/* Actions */}
              <button onClick={() => { setEditing(m); setShowForm(true); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface)] transition-all">
                <Pencil size={14} style={{ color: 'var(--muted)' }} />
              </button>
              <button onClick={() => handleDelete(Number(m.id), String(m.name))}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface)] transition-all">
                <Trash2 size={14} style={{ color: 'var(--danger)' }} />
              </button>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Form modal */}
      <MockupFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        mockup={editing}
        onSaved={refetch}
      />

      {/* FAB */}
      <FabButton onClick={() => { setEditing(null); setShowForm(true); }} />
    </>
  );
}

/* ===== Mockup Form Modal ===== */
function MockupFormModal({ open, onClose, mockup, onSaved }: {
  open: boolean;
  onClose: () => void;
  mockup: Record<string, unknown> | null;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(String(mockup?.name || ''));
  const [imageUrl, setImageUrl] = useState(String(mockup?.imageUrl || ''));
  const [jpegUrl, setJpegUrl] = useState(String(mockup?.jpegUrl || ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!mockup;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name required'); return; }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await trpcMutate('mockup.update', { id: Number(mockup.id), name: name.trim(), imageUrl: imageUrl || undefined, jpegUrl: jpegUrl || undefined });
      } else {
        await trpcMutate('mockup.create', { name: name.trim(), imageUrl: imageUrl || undefined, jpegUrl: jpegUrl || undefined });
      }
      onSaved();
      onClose();
      setName('');
      setImageUrl('');
      setJpegUrl('');
    } catch (err: any) { setError(err?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t('mockup.edit') : t('mockup.add')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full h-11 px-4 rounded-[var(--radius-input)] text-sm outline-none"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.06)' }}
            placeholder="iPhone 17 Pro" />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Image</label>
          <ImageUploader value={imageUrl} onUploaded={(url, jpeg) => { setImageUrl(url); if (jpeg) setJpegUrl(jpeg); }} type="mockups" />
        </div>
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
    </Modal>
  );
}
