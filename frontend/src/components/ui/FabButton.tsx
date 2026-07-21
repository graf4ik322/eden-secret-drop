import { Plus } from 'lucide-react';

interface FabButtonProps {
  onClick: () => void;
}

/**
 * Standardized FAB button (FR-08).
 * Square with --radius-btn rounding, gold gradient, glow shadow.
 */
export function FabButton({ onClick }: FabButtonProps) {
  return (
    <button onClick={onClick}
      className="fixed z-40 flex items-center justify-center shadow-lg transition-all active:scale-95"
      style={{
        bottom: 'calc(var(--safe-bottom, 0px) + 24px)',
        right: '24px',
        width: '52px',
        height: '52px',
        borderRadius: 'var(--radius-btn)',
        background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
        color: '#071A17',
        boxShadow: '0 4px 24px rgba(212,175,116,0.35)',
      }}>
      <Plus size={22} />
    </button>
  );
}
