import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useSensorsData } from './useSensorsData';
import { SensorCard } from './SensorCard';
import { SensorDetailPanel } from './SensorDetailPanel';
import type { SensorRow } from './useSensorsData';
import { MiniFloorMap } from '@/features/floor-map/MiniFloorMap';

const CATEGORIES = ['Air Quality', 'Temperature', 'Vibration', 'Noise Levels', 'Pressure', 'Other'];

export function SensorsPage() {
  const [floorId, setFloorId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set(CATEGORIES));
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SensorRow | null>(null);

  const { list, loading, error } = useSensorsData(floorId, categoryFilter, search);

  const toggleCategory = (label: string) => {
    setCategoryFilter((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handleExport = () => {
    const headers = ['Sensor', 'Type', 'Zone', 'Floor', 'Value', 'Unit', 'Status', 'Time'];
    const rows = list.map((s) => [
      s.name,
      s.sensor_type,
      s.zone_name ?? '',
      s.floor_name ?? '',
      s.latest_value ?? '',
      s.unit ?? '',
      s.latest_status ?? '',
      s.latest_reading_at ?? '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'advancesafe-sensors-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-rajdhani text-xl font-bold text-[var(--text-primary)]">SENSOR NETWORK</h1>
          <p className="font-mono text-xs text-[var(--text-dim)]">Monitoring {list.length} active nodes</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handleExport} className="rounded border border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-3 py-1.5 font-mono text-sm text-[var(--accent-cyan)]">Export Data</button>
          <button type="button" className="rounded border border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-3 py-1.5 font-mono text-sm text-[var(--accent-cyan)]">+ Add</button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <aside className="w-[280px] shrink-0 space-y-4">
          <Card>
            <SectionLabel>LOCATION FILTER</SectionLabel>
            <div className="mt-2 space-y-1 font-mono text-xs">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="floor" checked={floorId === null} onChange={() => setFloorId(null)} className="text-[var(--accent-cyan)]" />
                <span className={floorId === null ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-secondary)]'}>All Floors</span>
              </label>
              {/* Floor list could be loaded via IPC; for now single option */}
            </div>
          </Card>
          <Card>
            <SectionLabel>SENSOR CATEGORY</SectionLabel>
            <div className="mt-2 space-y-1 font-mono text-xs">
              {CATEGORIES.map((label) => (
                <label key={label} className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={categoryFilter.has(label)} onChange={() => toggleCategory(label)} className="rounded border-[var(--border-default)]" />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </Card>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="w-full max-w-sm">
            <SearchInput value={search} onChange={setSearch} onDebouncedChange={setSearch} placeholder="Search sensors..." aria-label="Search sensors" />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {loading && list.length === 0 ? (
              <LoadingSpinner center />
            ) : list.length === 0 ? (
              <div className="col-span-full">
                <EmptyState title="No sensors" description="No sensors match the current filters." />
              </div>
            ) : (
              list.map((s) => (
                <SensorCard key={s.id} sensor={s} onClick={() => setSelected(s)} />
              ))
            )}
          </div>
          <Card>
            <SectionLabel>SITE LAYOUT</SectionLabel>
            <div className="mt-2 h-[300px]">
              <MiniFloorMap />
            </div>
            <p className="mt-2 font-mono text-[10px] text-[var(--text-dim)]">Optimal | Warning | Danger</p>
          </Card>
        </div>

        {selected != null && <SensorDetailPanel sensor={selected} onClose={() => setSelected(null)} />}
      </div>
      {error != null && <p className="font-mono text-sm text-[var(--status-critical)]">{error}</p>}
    </div>
  );
}
