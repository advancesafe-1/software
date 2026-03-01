import type { SensorRow } from './useSensorsData';

const statusColors: Record<string, string> = {
  safe: 'var(--status-safe)',
  warning: 'var(--status-warning)',
  danger: 'var(--status-danger)',
  critical: 'var(--status-critical)',
};

function getProgressPercent(row: SensorRow): number {
  const v = row.latest_value ?? 0;
  const safeMax = row.safe_max ?? 100;
  const criticalMax = row.critical_max ?? safeMax * 1.5;
  if (v <= safeMax) return Math.min(100, (v / safeMax) * 100);
  if (v >= criticalMax) return 100;
  return 85 + ((v - safeMax) / (criticalMax - safeMax)) * 15;
}

function formatAgo(iso: string | null): string {
  if (!iso) return '—';
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  return `${min}m ago`;
}

interface SensorCardProps {
  sensor: SensorRow;
  onClick: () => void;
}

export function SensorCard({ sensor, onClick }: SensorCardProps) {
  const status = sensor.latest_status ?? 'safe';
  const color = statusColors[status] ?? statusColors.safe;
  const percent = getProgressPercent(sensor);
  const value = sensor.latest_value ?? 0;
  const unit = sensor.unit ?? '';

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-card)] p-3 text-left transition hover:border-[var(--accent-cyan)]/50"
    >
      <div className="flex items-start justify-between">
        <span className="font-rajdhani font-semibold text-[var(--text-primary)] uppercase">
          {sensor.sensor_type.replace('_', ' ')}
        </span>
        <span className="font-mono text-xs font-medium" style={{ color }}>
          {status.toUpperCase()}
        </span>
      </div>
      <p className="mt-1 font-mono text-[10px] text-[var(--text-dim)]">
        Zone: {sensor.zone_name ?? '—'} · {sensor.floor_name ?? '—'}
      </p>
      <div className="mt-3 font-mono text-2xl font-semibold text-[var(--text-primary)]">
        {value} <span className="text-sm text-[var(--text-dim)]">{unit}</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, percent)}%`, backgroundColor: color }}
        />
      </div>
      <p className="mt-1 font-mono text-[10px] text-[var(--text-dim)]">
        Safe: &lt;{sensor.safe_max ?? '—'} | Warn: {sensor.warning_min ?? '—'}-{sensor.warning_max ?? '—'}
      </p>
      <p className="font-mono text-[10px] text-[var(--text-dim)]">
        Last reading: {formatAgo(sensor.latest_reading_at)}
      </p>
    </button>
  );
}
