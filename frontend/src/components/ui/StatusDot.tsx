import { cn } from '@/lib/utils';

export type StatusType = 'live' | 'scheduled' | 'sold' | 'archived' | 'draft';

const statusConfig: Record<StatusType, { color: string; label: string }> = {
  live: { color: 'var(--success)', label: 'LIVE' },
  scheduled: { color: 'var(--scheduled)', label: 'SCHEDULED' },
  sold: { color: 'var(--sold)', label: 'SOLD' },
  archived: { color: 'var(--danger)', label: 'ARCHIVED' },
  draft: { color: 'var(--muted)', label: 'DRAFT' },
};

interface StatusDotProps {
  status: StatusType;
  showLabel?: boolean;
  className?: string;
}

export function StatusDot({ status, showLabel = true, className }: StatusDotProps) {
  const config = statusConfig[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className="w-2 h-2 rounded-full inline-block"
        style={{ backgroundColor: config.color }}
      />
      {showLabel && (
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: config.color }}>
          {config.label}
        </span>
      )}
    </span>
  );
}
