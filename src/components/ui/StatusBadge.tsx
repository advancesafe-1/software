import type { SensorStatus } from '@/types';

const statusConfig: Record<
  SensorStatus,
  { color: string; label: string }
> = {
  safe: { color: 'var(--status-safe)', label: 'Safe' },
  warning: { color: 'var(--status-warning)', label: 'Warning' },
  danger: { color: 'var(--status-danger)', label: 'Danger' },
  critical: { color: 'var(--status-critical)', label: 'Critical' },
};

interface StatusBadgeProps {
  status: SensorStatus;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayLabel = label ?? config.label;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs">
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      {displayLabel}
    </span>
  );
}
