import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

const variants = {
  primary:
    'btn-gradient h-12 font-semibold rounded-[var(--radius-btn)]',
  'primary-lg':
    'h-14 bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] text-[var(--bg)] font-semibold rounded-[var(--radius-btn)] shadow-[var(--shadow-glow-gold)] active:scale-[.97] transition-all duration-250',
  secondary:
    'btn-secondary',
  ghost:
    'btn-ghost',
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
          'inline-flex items-center justify-center text-center font-medium transition-all duration-250 disabled:opacity-50 disabled:pointer-events-none',
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
