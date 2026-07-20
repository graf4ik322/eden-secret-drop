import { cn } from '@/lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Toggle({ checked, onChange, label, disabled, className }: ToggleProps) {
  return (
    <label className={cn('inline-flex items-center gap-3 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed', className)}>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <div
          className={cn(
            'w-[44px] h-[24px] rounded-full transition-all duration-300',
            checked
              ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)]'
              : 'bg-[var(--surface-light)]',
          )}
        >
          <div
            className={cn(
              'w-[18px] h-[18px] rounded-full bg-white top-[3px] absolute transition-all duration-300',
              checked ? 'left-[23px]' : 'left-[3px]',
            )}
          />
        </div>
      </div>
      {label && <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>}
    </label>
  );
}
