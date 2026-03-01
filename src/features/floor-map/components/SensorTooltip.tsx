import type { MapSensor } from '../floor-map-types';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface SensorTooltipProps {
  sensor: MapSensor | null;
  x: number;
  y: number;
}

export function SensorTooltip({ sensor, x, y }: SensorTooltipProps) {
  if (!sensor) return null;
  return (
    <div className="pointer-events-none fixed z-50 rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 font-mono text-xs shadow-lg" style={{ left: x + 12, top: y + 12 }}>
      <p className="font-medium text-[var(--text-primary)]">{sensor.name}</p>
      <p className="text-[var(--text-mono)]">{sensor.value} {sensor.unit}</p>
      <StatusBadge status={sensor.status} />
    </div>
  );
}
