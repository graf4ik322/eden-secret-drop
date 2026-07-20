import { cn } from '@/lib/utils';

type BadgeVariant = 'limited' | 'vip' | 'new' | 'default';

const badgeStyles: Record<BadgeVariant, string> = {
  limited: 'bg-gradient-to-r from-[var(--gold)]/20 to-[var(--gold-light)]/10 border border-[var(--gold)]/30 text-[var(--gold)]',
  vip: 'bg-gradient-to-r from-[var(--emerald-light)]/20 to-[var(--emerald-glow)]/10 border border-[var(--emerald-glow)]/30 text-[var(--emerald-glow)]',
  new: 'bg-gradient-to-r from-[var(--emerald)]/20 to-[var(--emerald-light)]/10 border border-[var(--emerald-light)]/30 text-[var(--emerald-light)]',
  default: 'glass-card text-[var(--muted)]',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-pill)]',
        badgeStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
