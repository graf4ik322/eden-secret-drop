import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'h-12 px-4 rounded-[var(--radius-btn)] outline-none transition-all duration-200',
            'glass-card border border-[rgba(255,255,255,.08)]',
            'text-[var(--text)] placeholder:text-[var(--muted)]',
            'focus:border-[var(--gold)] focus:shadow-[var(--shadow-glow-gold)]',
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);

Input.displayName = 'Input';
