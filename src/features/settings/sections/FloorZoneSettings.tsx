import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/store/toast-store';
import { useAppStore } from '@/store/app-store';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface FloorRow {
  id: string;
  name: string;
  floor_number: number;
  description: string | null;
}

interface ZoneRow {
  id: string;
  floor_id: string;
  name: string;
  zone_type: string;
  risk_level_default: string;
  sensor_count?: number;
}

export function FloorZoneSettings() {
  const [floors, setFloors] = useState<FloorRow[]>([]);
  const [zonesByFloor, setZonesByFloor] = useState<Record<string, ZoneRow[]>>({});
  const [expandedFloor, setExpandedFloor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteZone, setDeleteZone] = useState<ZoneRow | null>(null);
  const { toast } = useToast();
  const currentUser = useAppStore((s) => s.currentUser);

  const load = useCallback(async () => {
    const fl = (await window.advancesafe?.admin?.floors?.getAll?.()) ?? [];
    setFloors(fl as FloorRow[]);
    const allZones = (await window.advancesafe?.admin?.zones?.getAll?.()) ?? [];
    const byFloor: Record<string, ZoneRow[]> = {};
    for (const z of allZones as ZoneRow[]) {
      if (!byFloor[z.floor_id]) byFloor[z.floor_id] = [];
      byFloor[z.floor_id].push(z);
    }
    setZonesByFloor(byFloor);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeleteZone = async () => {
    if (!deleteZone || !currentUser?.id) return;
    const result = await window.advancesafe?.admin?.zones?.delete?.({ id: deleteZone.id, userId: currentUser.id });
    if (result?.success) {
      toast.success('Zone removed');
      setDeleteZone(null);
      load();
    } else {
      toast.error(result?.error ?? 'Failed');
    }
  };

  if (loading) return <LoadingSpinner size="md" center />;

  return (
    <Card>
      <h2 className="font-rajdhani text-lg font-bold text-[var(--text-primary)]">FLOORS & ZONES</h2>
      <p className="mt-1 font-mono text-xs text-[var(--text-dim)]">Manage floors and zones</p>
      <div className="mt-4 space-y-2">
        {floors.map((f) => (
          <div key={f.id} className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)]">
            <button type="button" onClick={() => setExpandedFloor(expandedFloor === f.id ? null : f.id)} className="flex w-full items-center justify-between px-3 py-2 text-left font-mono text-sm text-[var(--text-primary)]">
              <span>{f.name}</span>
              <span className="text-[var(--text-dim)]">{(zonesByFloor[f.id] ?? []).length} zones</span>
            </button>
            {expandedFloor === f.id && (
              <div className="border-t border-[var(--border-default)] p-3">
                {(zonesByFloor[f.id] ?? []).map((z) => (
                  <div key={z.id} className="mb-2 flex items-center justify-between rounded bg-[var(--bg-card)] px-2 py-1.5 font-mono text-xs">
                    <span className="text-[var(--text-primary)]">{z.name}</span>
                    <span className="text-[var(--text-dim)]">{z.zone_type} · {z.risk_level_default}</span>
                    <div>
                      <button type="button" onClick={() => setDeleteZone(z)} className="text-[var(--status-critical)]">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <ConfirmDialog open={!!deleteZone} title="Delete zone" message={deleteZone ? `Delete zone "${deleteZone.name}"? This will fail if sensors are attached.` : ''} destructive onConfirm={handleDeleteZone} onCancel={() => setDeleteZone(null)} confirmLabel="Delete" />
    </Card>
  );
}
