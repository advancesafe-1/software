import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/store/toast-store';
import { useAppStore } from '@/store/app-store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function PPERuleSettings() {
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const currentUser = useAppStore((s) => s.currentUser);

  useEffect(() => {
    (async () => {
      const list = (await window.advancesafe?.admin?.zones?.getAll?.()) ?? [];
      setZones((list as { id: string; name: string }[]).map((z) => ({ id: z.id, name: z.name })));
      setLoading(false);
    })();
  }, []);

  const handleSaveZone = async (zoneId: string) => {
    if (!currentUser?.id) return;
    const result = await window.advancesafe?.admin?.ppeRules?.update?.({ zoneId, rules: '{}', userId: currentUser.id });
    if (result?.success) toast.success('PPE rules saved');
    else toast.error(result?.error ?? 'Save failed');
  };

  if (loading) return <LoadingSpinner size="md" center />;

  return (
    <Card>
      <h2 className="font-rajdhani text-lg font-bold text-[var(--text-primary)]">PPE RULES BY ZONE</h2>
      <div className="mt-4 space-y-3">
        {zones.map((z) => (
          <div key={z.id} className="rounded border border-[var(--border-default)] p-3">
            <div className="font-mono text-sm text-[var(--text-primary)]">{z.name}</div>
            <button type="button" onClick={() => handleSaveZone(z.id)} className="mt-2 rounded bg-[var(--accent-cyan)] px-2 py-1 font-mono text-xs text-[var(--bg-primary)]">Save zone</button>
          </div>
        ))}
        {zones.length === 0 && <p className="font-mono text-sm text-[var(--text-dim)]">No zones.</p>}
      </div>
    </Card>
  );
}
