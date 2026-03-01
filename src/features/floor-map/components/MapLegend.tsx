import type { MapZoneStatus } from '../floor-map-types';

const STATUS_LABELS: Record<MapZoneStatus, string> = {
  safe: 'SAFE (85-100)',
  warning: 'WARNING (65-84)',
  danger: 'DANGER (40-64)',
  critical: 'CRITICAL (0-39)',
};

const STATUS_COLORS: Record<MapZoneStatus, string> = {
  safe: '#00C46A',
  warning: '#FFB700',
  danger: '#FF6B35',
  critical: '#FF2D2D',
};

interface MapLegendProps {
  visible: boolean;
  onToggle: () => void;
}

export function MapLegend({ visible, onToggle }: MapLegendProps) {
  return (
    <div className="absolute bottom-4 left-4 flex flex-col gap-2 rounded border border-[var(--border-default)] bg-[var(--bg-secondary)]/95 p-2 font-mono text-xs shadow-lg">
      <button type="button" onClick={onToggle} className="self-end text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        {visible ? 'Hide' : 'Show'}
      </button>
      {visible && (
        <>
          {(['safe', 'warning', 'danger', 'critical'] as const).map((status) => (
            <div key={status} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
              <span className="text-[var(--text-secondary)]">{STATUS_LABELS[status]}</span>
            </div>
          ))}
          <div className="mt-1 border-t border-[var(--border-default)] pt-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent-cyan)]" />
              <span className="text-[var(--text-secondary)]">Sensor</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base">Camera</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
