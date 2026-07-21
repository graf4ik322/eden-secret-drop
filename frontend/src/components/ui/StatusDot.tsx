import { cn } from '@/lib/utils';

export type StatusType = 'live' | 'scheduled' | 'sold' | 'archived' | 'draft';

const statusConfig: Record<StatusType, { color: string; label: string }> = {
  live: { color: 'var(--success)', label: 'Live' },
  scheduled: { color: 'var(--scheduled)', label: 'Scheduled' },
  sold: { color: 'var(--sold)', label: 'Sold' },
  archived: { color: 'var(--danger)', label: 'Archived' },
  draft: { color: 'var(--muted)', label: 'Draft' },
};

interface StatusDotProps {
  status: StatusType;
  showLabel?: boolean;
  className?: string;
}

export function StatusDot({ status, showLabel = true, className }: StatusDotProps) {
  const config = statusConfig[status];
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span
        className="w-1.5 h-1.5 rounded-full inline-block"
        style={{ backgroundColor: config.color }}
      />
      {showLabel && (
        <span className="text-[10px] font-medium" style={{ color: config.color }}>
          {config.label}
        </span>
      )}
    </span>
  );
}
