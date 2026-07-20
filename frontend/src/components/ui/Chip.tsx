import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, active = false, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'h-[42px] px-4 rounded-[var(--radius-pill)] text-sm font-medium transition-all duration-200',
          'glass-card border-none',
          active
            ? '!bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] !text-[var(--bg)] font-semibold'
            : 'text-[var(--text-secondary)] hover:text-[var(--text)]',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Chip.displayName = 'Chip';
