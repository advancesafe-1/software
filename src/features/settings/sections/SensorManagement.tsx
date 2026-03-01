import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/store/toast-store';
import { useAppStore } from '@/store/app-store';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function SensorManagement() {
  const [sensors, setSensors] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();
  const currentUser = useAppStore((s) => s.currentUser);

  useEffect(() => {
    window.advancesafe?.features?.sensors?.getAll?.({}).then((list: unknown) => {
      setSensors((list as Record<string, unknown>[]) ?? []);
      setLoading(false);
    });
  }, []);

  const handleDelete = async () => {
    if (!deleteId || !currentUser?.id) return;
    const result = await window.advancesafe?.admin?.sensors?.delete?.({ id: deleteId, userId: currentUser.id });
    if (result?.success) {
      toast.success('Sensor deactivated');
      setDeleteId(null);
      setSensors((p) => p.filter((s) => String((s as { id: string }).id) !== deleteId));
    }
  };

  if (loading) return <LoadingSpinner size="md" center />;

  return (
    <Card>
      <h2 className="font-rajdhani text-lg font-bold text-[var(--text-primary)]">SENSOR MANAGEMENT</h2>
      <table className="mt-4 w-full border-collapse font-mono text-xs">
        <thead>
          <tr className="border-b border-[var(--border-default)] text-left text-[var(--text-dim)]">
            <th className="py-2 pr-2">Name</th>
            <th className="py-2 pr-2">Type</th>
            <th className="py-2 pr-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sensors.map((s) => {
            const row = s as { id: string; name: string; sensor_type: string };
            return (
              <tr key={row.id} className="border-b border-[var(--border-default)]">
                <td className="py-2 pr-2 text-[var(--text-primary)]">{row.name}</td>
                <td className="py-2 pr-2">{row.sensor_type}</td>
                <td className="py-2 pr-2">
                  <button type="button" onClick={() => setDeleteId(row.id)} className="text-[var(--status-critical)]">Delete</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <ConfirmDialog open={!!deleteId} title="Deactivate sensor" message="Deactivate this sensor?" destructive onConfirm={handleDelete} onCancel={() => setDeleteId(null)} confirmLabel="Deactivate" />
    </Card>
  );
}
