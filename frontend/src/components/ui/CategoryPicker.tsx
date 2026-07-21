import { useState } from 'react';
import { Search, Check, X } from 'lucide-react';
import { Modal } from './Modal';

interface CategoryPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (cat: { id: number; name: string } | null) => void;
  selectedId?: number | null;
  categories: { id: number; name: string; icon?: string }[];
  /** If true, first option is "No parent (root category)" */
  allowNull?: boolean;
}

/**
 * Searchable bottom sheet for selecting a category (FR-09).
 * Reusable in DropForm (field "Category") and CategoryForm (field "Parent category").
 */
export function CategoryPicker({ open, onClose, onSelect, selectedId, categories, allowNull }: CategoryPickerProps) {
  const [search, setSearch] = useState('');

  const filtered = categories.filter((cat) => {
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

        {filtered.map((cat) => (
          <button key={cat.id} onClick={() => { onSelect({ id: cat.id, name: cat.name }); onClose(); }}
            className={`w-full flex items-center gap-3 px-4 h-11 rounded-xl text-sm transition-all ${
              selectedId === cat.id
                ? 'bg-gradient-to-r from-[var(--gold)]/10 to-transparent text-[var(--gold)]'
                : 'hover:bg-[var(--surface)] text-[var(--text)]'
            }`}>
            <span>{cat.icon || '📁'}</span>
            <span className="flex-1 text-left">{cat.name}</span>
            {selectedId === cat.id && <Check size={16} style={{ color: 'var(--gold)' }} />}
          </button>
        ))}
      </div>
    </Modal>
  );
}
