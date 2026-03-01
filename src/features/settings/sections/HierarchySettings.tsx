import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function HierarchySettings() {
  const [levels, setLevels] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.advancesafe?.admin?.hierarchy?.get?.().then((r: unknown) => {
      const res = r as { levels?: unknown[] };
      setLevels(res?.levels ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSpinner size="md" center />;

  return (
    <Card>
      <h2 className="font-rajdhani text-lg font-bold text-[var(--text-primary)]">ALERT ESCALATION HIERARCHY</h2>
      <div className="mt-4 space-y-2 font-mono text-xs">
        {levels.map((l: unknown) => (
          <div key={String((l as { id: string }).id)} className="rounded border border-[var(--border-default)] p-2">
            Level {(l as { level: number }).level}: {(l as { role_name: string }).role_name}
          </div>
        ))}
        {levels.length === 0 && <p className="text-[var(--text-dim)]">No hierarchy levels.</p>}
      </div>
    </Card>
  );
}
