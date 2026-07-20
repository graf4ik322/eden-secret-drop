import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

const variants = {
  primary:
    'h-14 bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] text-[var(--bg)] font-bold rounded-[var(--radius-btn)] shadow-[var(--shadow-glow-gold)] active:scale-[.97] transition-all duration-300',
  'primary-lg':
    'h-16 bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] text-[var(--bg)] font-bold rounded-[var(--radius-btn)] shadow-[var(--shadow-glow-gold)] active:scale-[.97] transition-all duration-300',
  secondary:
    'glass-card border-gold text-[var(--text)] rounded-[var(--radius-btn)] transition-all duration-300 hover:border-gold-light',
  ghost:
    'bg-transparent text-[var(--gold)] rounded-[var(--radius-btn)] transition-all duration-300 hover:bg-[rgba(255,255,255,.06)]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', fullWidth, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center px-6 text-center font-medium transition-all disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
