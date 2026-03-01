import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/store/toast-store';
import { useAppStore } from '@/store/app-store';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function CameraManagement() {
  const [cameras, setCameras] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();
  const currentUser = useAppStore((s) => s.currentUser);

  useEffect(() => {
    window.advancesafe?.database?.query?.('cameras', 'SELECT c.id, c.name, c.ip_address FROM cameras c WHERE c.is_active = 1', []).then((rows: unknown) => {
      setCameras((rows as Record<string, unknown>[]) ?? []);
      setLoading(false);
    });
  }, []);

  const handleDelete = async () => {
    if (!deleteId || !currentUser?.id) return;
    const result = await window.advancesafe?.admin?.cameras?.delete?.({ id: deleteId, userId: currentUser.id });
    if (result?.success) {
      toast.success('Camera deactivated');
      setDeleteId(null);
      setCameras((p) => p.filter((c) => (c as { id: string }).id !== deleteId));
    }
  };

  if (loading) return <LoadingSpinner size="md" center />;

  return (
    <Card>
      <h2 className="font-rajdhani text-lg font-bold text-[var(--text-primary)]">CAMERA MANAGEMENT</h2>
      <table className="mt-4 w-full border-collapse font-mono text-xs">
        <thead>
          <tr className="border-b border-[var(--border-default)] text-left text-[var(--text-dim)]">
            <th className="py-2 pr-2">Name</th>
            <th className="py-2 pr-2">IP</th>
            <th className="py-2 pr-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {cameras.map((c) => {
            const row = c as { id: string; name: string; ip_address: string | null };
            return (
              <tr key={row.id} className="border-b border-[var(--border-default)]">
                <td className="py-2 pr-2 text-[var(--text-primary)]">{row.name}</td>
                <td className="py-2 pr-2">{row.ip_address ?? '—'}</td>
                <td className="py-2 pr-2">
                  <button type="button" onClick={() => setDeleteId(row.id)} className="text-[var(--status-critical)]">Delete</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <ConfirmDialog open={!!deleteId} title="Deactivate camera" message="Deactivate this camera?" destructive onConfirm={handleDelete} onCancel={() => setDeleteId(null)} confirmLabel="Deactivate" />
    </Card>
  );
}
