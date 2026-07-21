import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Drawer({ open, onClose, children }: DrawerProps) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          {/* Panel — slide from left */}
          <div
            className={cn(
              'absolute left-0 top-0 bottom-0 w-72',
              'bg-[var(--bg)]/98 backdrop-blur-xl',
              'border-r border-[var(--surface-light)]',
              'animate-fade-up',
              'p-6 pt-16',
            )}
          >
            {/* Close btn */}
            <button onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full glass-card flex items-center justify-center">
              <X size={16} style={{ color: 'var(--text-secondary)' }} />
            </button>

            {children}
          </div>
        </div>
      )}
    </>
  );
}
