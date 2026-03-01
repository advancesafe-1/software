import { useState, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useWorkersData } from './useWorkersData';
import { WorkerRow } from './WorkerRow';
import { WorkerDetailPanel } from './WorkerDetailPanel';
import type { WorkerRow as WorkerRowType } from './useWorkersData';
import { MiniFloorMap } from '@/features/floor-map/MiniFloorMap';
import { useAppStore } from '@/store/app-store';

const DEFAULT_PPE = 85;

export function WorkersPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'non_compliant' | 'danger_zone' | 'break'>('all');
  const [selected, setSelected] = useState<WorkerRowType | null>(null);
  const org = useAppStore((s) => s.organization);
  const { list, counts, loading, error } = useWorkersData(search);

  const filteredList = list.filter((w) => {
    if (filter === 'all') return true;
    if (filter === 'non_compliant') return false;
    if (filter === 'danger_zone') return w.current_zone_id != null;
    return w.current_zone_id == null;
  });

  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const worker = filteredList[index];
      if (!worker) return null;
      return (
        <div style={style}>
          <WorkerRow worker={worker} onSelect={() => setSelected(worker)} isSelected={selected?.id === worker.id} />
        </div>
      );
    },
    [filteredList, selected?.id]
  );

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="w-64">
          <SearchInput value={search} onChange={setSearch} onDebouncedChange={setSearch} placeholder="Search workers, IDs or zones..." aria-label="Search workers" />
        </div>
      </div>
      <div>
        <h1 className="font-rajdhani text-xl font-bold text-[var(--text-primary)]">WORKFORCE MONITORING</h1>
        <p className="font-mono text-xs text-[var(--text-dim)]">Real-time safety status for {org?.name ?? 'organization'}</p>
      </div>
      <div className="flex gap-2">
        {(['all', 'non_compliant', 'danger_zone', 'break'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={'rounded border px-3 py-1.5 font-mono text-xs ' + (filter === f ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]' : 'border-[var(--border-default)] text-[var(--text-secondary)]')}
          >
            {f === 'all' ? 'All Workers' : f === 'non_compliant' ? 'Non-compliant' : f === 'danger_zone' ? 'In Danger Zone' : 'On Break'}
          </button>
        ))}
      </div>

      {error != null && <p className="font-mono text-sm text-[var(--status-critical)]">{error}</p>}

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="min-w-0 flex-1">
          <Card className="h-full overflow-hidden p-0">
            {loading && filteredList.length === 0 ? (
              <LoadingSpinner center />
            ) : filteredList.length === 0 ? (
              <EmptyState title="No workers" description="No workers match the current filters." />
            ) : filteredList.length > 50 ? (
              <List height={500} itemCount={filteredList.length} itemSize={64} width="100%">
                {Row}
              </List>
            ) : (
              <div className="overflow-y-auto">
                {filteredList.map((w) => (
                  <WorkerRow key={w.id} worker={w} onSelect={() => setSelected(w)} isSelected={selected?.id === w.id} />
                ))}
              </div>
            )}
          </Card>
        </div>
        <aside className="flex w-[280px] shrink-0 flex-col gap-4">
          <Card>
            <SectionLabel>LIVE STATS</SectionLabel>
            <p className="font-mono text-2xl text-[var(--text-primary)]">{counts?.total ?? '—'}</p>
            <p className="font-mono text-xs text-[var(--text-dim)]">Total workforce</p>
            <p className="mt-2 font-mono text-2xl text-[var(--status-safe)]">{counts?.activeNow ?? '—'}</p>
            <p className="font-mono text-xs text-[var(--text-dim)]">Active now</p>
          </Card>
          <Card>
            <SectionLabel>PPE COMPLIANCE</SectionLabel>
            <p className="font-mono text-xs text-[var(--text-secondary)]">Hard Hats {DEFAULT_PPE}%</p>
            <p className="font-mono text-xs text-[var(--text-secondary)]">Gloves 82%</p>
            <p className="font-mono text-xs text-[var(--text-secondary)]">Vests 95%</p>
            <p className="font-mono text-xs text-[var(--text-secondary)]">Boots 91%</p>
          </Card>
          <button type="button" className="rounded border border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-3 py-1.5 font-mono text-sm text-[var(--accent-cyan)]">Full Audit</button>
          <Card>
            <SectionLabel>Active Heatmap</SectionLabel>
            <div className="h-[200px]">
              <MiniFloorMap />
            </div>
          </Card>
        </aside>
        {selected != null && <WorkerDetailPanel worker={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}
