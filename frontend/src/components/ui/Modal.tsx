import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Sheet — solid bg to prevent transparency (BUG-23) */}
      <div
        className={cn(
          'relative z-10 w-full max-w-lg rounded-t-[var(--radius-card)] sm:rounded-[var(--radius-card)]',
          'border-b-0 sm:border',
          'max-h-[90dvh] overflow-y-auto p-6 pb-[calc(env(safe-area-inset-bottom)+64px)] animate-fade-up',
          className,
        )}
        style={{ background: 'var(--bg)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
            <button
              onClick={onClose}
              className="w-[36px] h-[36px] rounded-full glass-card flex items-center justify-center hover:border-[var(--gold)]/50"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
