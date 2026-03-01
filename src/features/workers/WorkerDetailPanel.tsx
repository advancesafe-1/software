import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import type { WorkerRow } from './useWorkersData';

interface WorkerDetail {
  id: string;
  name: string;
  employee_id: string;
  department: string | null;
  role: string | null;
  phone: string | null;
  is_contract_worker: number;
  contractor_company: string | null;
  language_preference: string;
  checkins?: { zone_id: string; checked_in_at: string; checked_out_at: string | null }[];
}

function getInitials(name: string): string {
  return name.split(/\s+/).map((s) => s[0]).join('').toUpperCase().slice(0, 2);
}

interface WorkerDetailPanelProps {
  worker: WorkerRow | null;
  onClose: () => void;
}

export function WorkerDetailPanel({ worker, onClose }: WorkerDetailPanelProps) {
  const [detail, setDetail] = useState<WorkerDetail | null>(null);
  const [checkinZoneId, setCheckinZoneId] = useState('');
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!worker) {
      setDetail(null);
      return;
    }
    const api = window.advancesafe?.features?.workers;
    if (!api) return;
    api.getById(worker.id).then((w: unknown) => {
      if (w) setDetail(w as WorkerDetail);
    });
    window.advancesafe?.features?.zones?.list().then((rows: unknown) => {
      setZones(Array.isArray(rows) ? (rows as { id: string; name: string }[]) : []);
    });
  }, [worker?.id]);

  const handleCheckin = async () => {
    if (!worker || !checkinZoneId) return;
    await window.advancesafe?.features?.workers?.checkin(worker.id, checkinZoneId, 'manual');
    const api = window.advancesafe?.features?.workers;
    api?.getById(worker.id).then((w: unknown) => w && setDetail(w as WorkerDetail));
    setCheckinZoneId('');
  };

  if (!detail) return null;

  const currentCheckin = detail.checkins?.find((c) => c.checked_out_at == null);

  return (
    <div className="flex h-full w-[350px] shrink-0 flex-col border-l border-[var(--border-default)] bg-[var(--bg-secondary)]">
      <div className="flex items-center justify-between border-b border-[var(--border-default)] p-3">
        <h3 className="font-rajdhani text-sm font-semibold text-[var(--text-primary)]">Worker details</h3>
        <button type="button" onClick={onClose} className="rounded p-1 font-mono text-xs text-[var(--text-dim)] hover:bg-[var(--bg-tertiary)]">Close</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--accent-cyan)]/20 font-mono text-lg font-semibold text-[var(--accent-cyan)]">
            {getInitials(detail.name)}
          </div>
          <div>
            <p className="font-rajdhani font-semibold text-[var(--text-primary)]">{detail.name}</p>
            <p className="font-mono text-xs text-[var(--text-dim)]">{detail.employee_id}</p>
          </div>
        </div>
        <p className="mt-2 font-mono text-xs text-[var(--text-secondary)]">{detail.department ?? '—'} · {detail.role ?? '—'}</p>
        <p className="font-mono text-xs text-[var(--text-dim)]">{detail.phone ?? '—'}</p>
        <p className="font-mono text-[10px] text-[var(--text-dim)]">{detail.is_contract_worker ? 'Contract' : 'Permanent'} · Lang: {detail.language_preference ?? 'en'}</p>

        <div className="mt-4 border-t border-[var(--border-default)] pt-3">
          <h4 className="mb-2 font-mono text-xs font-semibold text-[var(--text-primary)]">Current status</h4>
          <p className="font-mono text-xs text-[var(--text-secondary)]">
            {currentCheckin ? `Checked in · Zone ID: ${currentCheckin.zone_id}` : 'Not currently checked in'}
          </p>
        </div>

        <div className="mt-4 border-t border-[var(--border-default)] pt-3">
          <h4 className="mb-2 font-mono text-xs font-semibold text-[var(--text-primary)]">Manual check in</h4>
          <select value={checkinZoneId} onChange={(e) => setCheckinZoneId(e.target.value)} className="mb-2 w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-xs text-[var(--text-primary)]">
            <option value="">Select zone</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
          <button type="button" disabled={!checkinZoneId} onClick={handleCheckin} className="rounded border border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-2 py-1 font-mono text-xs text-[var(--accent-cyan)] disabled:opacity-50">MANUAL CHECK IN</button>
        </div>

        {detail.checkins != null && detail.checkins.length > 0 && (
          <div className="mt-4 border-t border-[var(--border-default)] pt-3">
            <h4 className="mb-2 font-mono text-xs font-semibold text-[var(--text-primary)]">Check-in history</h4>
            <div className="space-y-1 font-mono text-[10px] text-[var(--text-secondary)]">
              {detail.checkins.slice(0, 7).map((c, i) => (
                <div key={i}>{new Date(c.checked_in_at).toLocaleDateString()} · Out: {c.checked_out_at ? new Date(c.checked_out_at).toLocaleTimeString() : '—'}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
