import { useState, useCallback } from 'react';
import { List } from 'react-window';
import { FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useIncidentsData } from './useIncidentsData';
import { IncidentCard } from './IncidentCard';
import { IncidentDetailPanel } from './IncidentDetailPanel';
import type { IncidentRow } from './incidents-types';

const FILTERS: { key: 'all' | 'active' | 'acknowledged' | 'resolved'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'resolved', label: 'Resolved' },
];

export function IncidentsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all');
  const [selected, setSelected] = useState<IncidentRow | null>(null);

  const { list, counts, loading, error, refetch } = useIncidentsData(search);

  const filteredByStatus = list.filter((r) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return r.resolved_at == null && r.acknowledged_at == null;
    if (statusFilter === 'acknowledged') return r.acknowledged_at != null && r.resolved_at == null;
    return r.resolved_at != null;
  });

  const countFor = (key: string): number => {
    if (!counts) return 0;
    if (key === 'all') return counts.total;
    if (key === 'active') return counts.active;
    if (key === 'acknowledged') return counts.acknowledged;
    if (key === 'resolved') return counts.resolved;
    return 0;
  };

  const Row = useCallback(
    ({ index, style, data }: { index: number; style: React.CSSProperties; data: IncidentRow[] }) => {
      const incident = data[index];
      if (!incident) return null;
      return (
        <div style={style} className="px-2 pb-2">
          <IncidentCard
            incident={incident}
            onSelect={setSelected}
            isSelected={selected?.id === incident.id}
          />
        </div>
      );
    },
    [selected?.id]
  );

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-rajdhani text-xl font-bold text-[var(--text-primary)]">INCIDENTS</h1>
          <p className="font-mono text-xs text-[var(--text-dim)]">Real-time incident feed</p>
        </div>
        <button
          type="button"
          className="rounded border border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-3 py-1.5 font-mono text-sm text-[var(--accent-cyan)]"
          onClick={() => refetch()}
        >
          Generate Report
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStatusFilter(f.key)}
            className={
              'rounded border px-3 py-1.5 font-mono text-xs ' +
              (statusFilter === f.key
                ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]'
                : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]')
            }
          >
            {f.label}
            <span className="ml-1.5 font-semibold">({countFor(f.key)})</span>
          </button>
        ))}
        <div className="ml-auto w-64">
          <SearchInput
            value={search}
            onChange={setSearch}
            onDebouncedChange={setSearch}
            placeholder="Search by zone, sensor, type…"
            aria-label="Search incidents"
          />
        </div>
      </div>

      {error != null && (
        <p className="font-mono text-sm text-[var(--status-critical)]">{error}</p>
      )}

      <div className="flex min-h-0 flex-1 gap-0">
        <Card className="min-h-0 flex-1 overflow-hidden p-0">
          {loading && filteredByStatus.length === 0 ? (
            <LoadingSpinner center />
          ) : filteredByStatus.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-10 w-10" />}
              title="No incidents"
              description="No incidents match the current filters."
            />
          ) : filteredByStatus.length > 50 ? (
            <List
              height={600}
              itemCount={filteredByStatus.length}
              itemSize={140}
              width="100%"
              itemData={filteredByStatus}
            >
              {Row as React.ComponentType<{ index: number; style: React.CSSProperties; data: IncidentRow[] }>}
            </List>
          ) : (
            <div className="overflow-y-auto p-2">
              {filteredByStatus.map((incident) => (
                <div key={incident.id} className="mb-2">
                  <IncidentCard
                    incident={incident}
                    onSelect={setSelected}
                    isSelected={selected?.id === incident.id}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
        {selected != null && (
          <IncidentDetailPanel incident={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  );
}
