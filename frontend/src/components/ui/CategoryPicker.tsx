import { useState } from 'react';
import { Search, Check, X, ChevronRight, Tag } from 'lucide-react';
import { Modal } from './Modal';

interface CategoryItem {
  id: number;
  name: string;
  icon?: string;
  /** If present, category has children (nested mode) */
  subcategories?: CategoryItem[];
}

interface CategoryPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (cat: { id: number; name: string } | null) => void;
  selectedId?: number | null;
  /** Flat list or tree (roots with subcategories) */
  categories: CategoryItem[];
  /** If true, first option is "No parent (root category)" */
  allowNull?: boolean;
}

/**
 * Searchable bottom sheet for selecting a category (FR-09 / FR-03 BUG-22).
 * Supports nested categories: roots render as bold group headers,
 * subcategories render indented beneath them.
 * When search is active, shows a flat filtered list for quick selection.
 */
export function CategoryPicker({ open, onClose, onSelect, selectedId, categories, allowNull }: CategoryPickerProps) {
  const [search, setSearch] = useState('');

  // Flatten for search mode
  const allCats = categories.flatMap(c => [c, ...(c.subcategories || [])]);

  const filtered = allCats.filter((cat) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return cat.name.toLowerCase().includes(q);
  });

  return (
    <Modal open={open} onClose={onClose} title="Select Category">
      {/* Search input */}
      <div className="flex items-center gap-2 px-3 h-10 rounded-xl mb-3"
        style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.04)' }}>
        <Search size={14} style={{ color: 'var(--muted)' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search category..."
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: 'var(--text)' }}
          autoFocus
        />
        {search && (
          <button onClick={() => setSearch('')}><X size={14} style={{ color: 'var(--muted)' }} /></button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[50dvh] overflow-y-auto -mx-6 px-6 space-y-0.5">
        {allowNull && (
          <button onClick={() => { onSelect(null); onClose(); }}
            className={`w-full flex items-center gap-3 px-4 h-11 rounded-xl text-sm transition-all ${
              !selectedId
                ? 'bg-gradient-to-r from-[var(--gold)]/10 to-transparent text-[var(--gold)]'
                : 'hover:bg-[var(--surface)] text-[var(--muted)]'
            }`}>
            <span className="flex-1 text-left">No parent (root category)</span>
            {!selectedId && <Check size={16} style={{ color: 'var(--gold)' }} />}
          </button>
        )}

        {filtered.length === 0 && (
          <p className="text-center py-8 text-sm" style={{ color: 'var(--muted)' }}>No categories found</p>
        )}

        {/* If search active — show flat list for speed */}
        {search ? (
          filtered.map((cat) => (
            <button key={cat.id} onClick={() => { onSelect({ id: cat.id, name: cat.name }); onClose(); }}
              className={`w-full flex items-center gap-3 px-4 h-11 rounded-xl text-sm transition-all ${
                selectedId === cat.id
                  ? 'bg-gradient-to-r from-[var(--gold)]/10 to-transparent text-[var(--gold)]'
                  : 'hover:bg-[var(--surface)] text-[var(--text)]'
              }`}>
              <span><Tag size={16} style={{ color: 'var(--muted)' }} /></span>
              <span className="flex-1 text-left">{cat.name}</span>
              {selectedId === cat.id && <Check size={16} style={{ color: 'var(--gold)' }} />}
            </button>
          ))
        ) : (
          /* Hierarchy mode */
          categories.map((root) => {
            const subs = root.subcategories || [];
            const isRootSelected = selectedId === root.id && !subs.some(s => s.id === selectedId);
            return (
              <div key={root.id} className="mb-1">
                {/* Root category — bold group header */}
                <button onClick={() => { onSelect({ id: root.id, name: root.name }); onClose(); }}
                  className={`w-full flex items-center gap-3 px-4 h-11 rounded-xl text-sm transition-all ${
                    selectedId === root.id
                      ? 'bg-gradient-to-r from-[var(--gold)]/10 to-transparent text-[var(--gold)]'
                      : 'hover:bg-[var(--surface)] text-[var(--text)]'
                  }`}
                  style={{ fontWeight: isRootSelected || subs.length === 0 ? 600 : 600 }}>
                  <span>{root.icon ? <span>{root.icon}</span> : <Tag size={16} style={{ color: 'var(--muted)' }} />}</span>
                  <span className="flex-1 text-left">{root.name}</span>
                  {subs.length > 0 && (
                    <ChevronRight size={14} style={{ color: 'var(--muted)', opacity: 0.5 }} />
                  )}
                </button>
                {/* Subcategories — indented */}
                {subs.length > 0 && (
                  <div style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', marginLeft: '16px', paddingLeft: '8px' }}>
                    {subs.map((sub) => (
                      <button key={sub.id} onClick={() => { onSelect({ id: sub.id, name: sub.name }); onClose(); }}
                        className={`w-full flex items-center gap-3 px-4 h-10 rounded-xl text-sm transition-all ${
                          selectedId === sub.id
                            ? 'bg-gradient-to-r from-[var(--gold)]/10 to-transparent text-[var(--gold)]'
                            : 'hover:bg-[var(--surface)] text-[var(--text-secondary)]'
                        }`}>
                        <span>{sub.icon ? <span>{sub.icon}</span> : <Tag size={16} style={{ color: 'var(--muted)' }} />}</span>
                        <span className="flex-1 text-left">{sub.name}</span>
                        {selectedId === sub.id && <Check size={16} style={{ color: 'var(--gold)' }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}
