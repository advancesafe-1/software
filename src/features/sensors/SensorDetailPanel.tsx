import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { useToast } from '@/store/toast-store';
import { SensorTrendChart } from './SensorTrendChart';
import { getSensorHistory } from './useSensorsData';
import type { SensorRow } from './useSensorsData';

const statusColors: Record<string, string> = {
  safe: 'var(--status-safe)',
  warning: 'var(--status-warning)',
  danger: 'var(--status-danger)',
  critical: 'var(--status-critical)',
};

interface SensorDetailPanelProps {
  sensor: SensorRow | null;
  onClose: () => void;
}

export function SensorDetailPanel({ sensor, onClose }: SensorDetailPanelProps) {
  const [history, setHistory] = useState<{ value: number; status: string; recorded_at: string }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [thresholds, setThresholds] = useState({
    safeMin: 0,
    safeMax: 100,
    warningMin: 0,
    warningMax: 0,
    dangerMin: 0,
    dangerMax: 0,
    criticalMin: 0,
    criticalMax: 0,
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const currentUser = useAppStore((s) => s.currentUser);
  const userId = currentUser?.id ?? 'system';

  useEffect(() => {
    if (!sensor) return;
    setThresholds({
      safeMin: sensor.safe_min ?? 0,
      safeMax: sensor.safe_max ?? 100,
      warningMin: sensor.warning_min ?? 0,
      warningMax: sensor.warning_max ?? 0,
      dangerMin: sensor.danger_min ?? 0,
      dangerMax: sensor.danger_max ?? 0,
      criticalMin: sensor.critical_min ?? 0,
      criticalMax: sensor.critical_max ?? 0,
    });
    setLoadingHistory(true);
    getSensorHistory(sensor.id, 2).then(setHistory).finally(() => setLoadingHistory(false));
  }, [sensor?.id]);

  const handleSaveThresholds = async () => {
    if (!sensor) return;
    setSaving(true);
    try {
      await window.advancesafe?.features?.sensors?.updateThresholds({
        sensorId: sensor.id,
        safeMin: thresholds.safeMin,
        safeMax: thresholds.safeMax,
        warningMin: thresholds.warningMin,
        warningMax: thresholds.warningMax,
        dangerMin: thresholds.dangerMin,
        dangerMax: thresholds.dangerMax,
        criticalMin: thresholds.criticalMin,
        criticalMax: thresholds.criticalMax,
        userId,
      });
      toast.success('Thresholds saved');
    } catch {
      toast.error('Failed to save thresholds');
    } finally {
      setSaving(false);
    }
  };

  if (!sensor) return null;

  const status = sensor.latest_status ?? 'safe';
  const color = statusColors[status] ?? statusColors.safe;

  return (
    <div className="flex h-full w-[350px] shrink-0 flex-col border-l border-[var(--border-default)] bg-[var(--bg-secondary)]">
      <div className="flex items-center justify-between border-b border-[var(--border-default)] p-3">
        <h3 className="font-rajdhani text-sm font-semibold text-[var(--text-primary)]">Sensor details</h3>
        <button type="button" onClick={onClose} className="rounded p-1 font-mono text-xs text-[var(--text-dim)] hover:bg-[var(--bg-tertiary)]">Close</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <p className="font-rajdhani font-semibold text-[var(--text-primary)]">{sensor.name}</p>
        <p className="font-mono text-xs text-[var(--text-dim)]">{sensor.sensor_type} · {sensor.zone_name ?? '—'} · {sensor.floor_name ?? '—'}</p>
        <div className="mt-3 font-mono text-2xl font-semibold" style={{ color }}>{sensor.latest_value ?? '—'} {sensor.unit ?? ''}</div>
        <span className="mt-1 inline-block rounded px-2 py-0.5 font-mono text-xs font-medium uppercase" style={{ backgroundColor: color + '20', color }}>{status}</span>

        <div className="mt-4 border-t border-[var(--border-default)] pt-3">
          <h4 className="mb-2 font-mono text-xs font-semibold text-[var(--text-primary)]">Thresholds</h4>
          {['Safe', 'Warning', 'Danger', 'Critical'].map((label, i) => {
            const keyMin = (['safeMin', 'warningMin', 'dangerMin', 'criticalMin'] as const)[i];
            const keyMax = (['safeMax', 'warningMax', 'dangerMax', 'criticalMax'] as const)[i];
            return (
              <div key={label} className="mb-2 flex items-center gap-2 font-mono text-xs">
                <span className="w-16 text-[var(--text-secondary)]">{label}</span>
                <input type="number" value={thresholds[keyMin]} onChange={(e) => setThresholds((t) => ({ ...t, [keyMin]: Number(e.target.value) }))} className="w-16 rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-1 py-0.5 text-[var(--text-primary)]" />
                <span className="text-[var(--text-dim)]">–</span>
                <input type="number" value={thresholds[keyMax]} onChange={(e) => setThresholds((t) => ({ ...t, [keyMax]: Number(e.target.value) }))} className="w-16 rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-1 py-0.5 text-[var(--text-primary)]" />
              </div>
            );
          })}
          <button type="button" disabled={saving} onClick={handleSaveThresholds} className="mt-2 rounded border border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-2 py-1 font-mono text-xs text-[var(--accent-cyan)] disabled:opacity-50">SAVE THRESHOLDS</button>
        </div>

        <div className="mt-4 border-t border-[var(--border-default)] pt-3">
          <h4 className="mb-2 font-mono text-xs font-semibold text-[var(--text-primary)]">Trend (last 2h)</h4>
          {loadingHistory ? <p className="font-mono text-xs text-[var(--text-dim)]">Loading…</p> : <SensorTrendChart sensor={sensor} data={history} />}
        </div>
      </div>
    </div>
  );
}
