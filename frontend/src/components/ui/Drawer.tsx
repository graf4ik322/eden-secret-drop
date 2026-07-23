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

          {/* Panel — slide from left, full height with safe areas */}
          <div
            className={cn(
              'absolute left-0 top-0 flex flex-col w-72',
              'bg-[var(--bg)]/98 backdrop-blur-xl',
              'border-r border-[var(--surface-light)]',
              'animate-fade-up',
              'overflow-y-auto',
            )}
            style={{
              top: '0',
              bottom: '0',
              paddingTop: `calc(var(--safe-top, 0px) + 24px)`,
              paddingBottom: `calc(var(--safe-bottom, 0px) + 16px)`,
            }}
          >
            {/* Header with close btn — отступ сверху уже есть через paddingTop панели */}
            <div className="flex items-center justify-between px-4 pb-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Menu</span>
              <button onClick={onClose}
                className="w-9 h-9 rounded-full glass-card flex items-center justify-center">
                <X size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            {/* Content — scrollable, с отступом снизу под safe area */}
            <div className="flex-1 overflow-y-auto px-4 space-y-1">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
