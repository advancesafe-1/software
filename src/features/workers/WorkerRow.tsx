import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import type { WorkerRow as WorkerRowType } from './useWorkersData';

function getInitials(name: string): string {
  const parts = name.split(/\s+/);
  return parts.map((s) => s[0]).join('').toUpperCase().slice(0, 2);
}

interface WorkerRowProps {
  worker: WorkerRowType;
  onSelect: () => void;
  isSelected: boolean;
}

export function WorkerRow(props: WorkerRowProps) {
  const { worker, onSelect, isSelected } = props;
  const [menuOpen, setMenuOpen] = useState(false);
  const hasZone = worker.current_zone_id != null;
  const color = hasZone ? 'var(--status-safe)' : 'var(--text-dim)';
  const statusLabel = hasZone ? 'ACTIVE' : 'OFF SHIFT';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={
        'flex h-16 items-center gap-4 border-b border-[var(--border-default)] px-3 hover:bg-[var(--bg-tertiary)]' +
        (isSelected ? ' bg-[var(--accent-cyan)]/10' : '')
      }
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold"
        style={{ backgroundColor: color + '30', color }}
      >
        {getInitials(worker.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-rajdhani font-semibold text-[var(--text-primary)]">{worker.name}</p>
        <p className="font-mono text-[10px] text-[var(--text-dim)]">{worker.employee_id}</p>
      </div>
      <div className="shrink-0 font-mono text-[10px] text-[var(--text-secondary)]">
        {(worker.department ?? '—') + ' · ' + (worker.role ?? '—')}
      </div>
      <div className="shrink-0 font-mono text-xs text-[var(--text-secondary)]">
        {worker.current_zone_name ?? 'Not checked in'}
      </div>
      <span
        className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]"
        style={{ backgroundColor: color + '20', color }}
      >
        {worker.is_contract_worker ? 'CONTRACT' : 'PERMANENT'}
      </span>
      <span className="shrink-0 font-mono text-[10px] text-[var(--text-dim)]">
        {(worker.language_preference ?? 'en').toUpperCase()}
      </span>
      <span
        className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]"
        style={{ backgroundColor: color + '20', color }}
      >
        {statusLabel}
      </span>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="rounded p-1 text-[var(--text-dim)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
          aria-label="Actions"
        >
          <MoreVertical size={16} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded border border-[var(--border-default)] bg-[var(--bg-card)] py-1 font-mono text-xs">
            <button type="button" className="block w-full px-3 py-1.5 text-left text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]" onClick={() => { setMenuOpen(false); onSelect(); }}>View Details</button>
            <button type="button" className="block w-full px-3 py-1.5 text-left text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">Check In</button>
            <button type="button" className="block w-full px-3 py-1.5 text-left text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">Check Out</button>
            <button type="button" className="block w-full px-3 py-1.5 text-left text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">Edit Worker</button>
          </div>
        )}
      </div>
    </div>
  );
}
