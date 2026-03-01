import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function WorkerManagement() {
  const [workers, setWorkers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.advancesafe?.features?.workers?.getAll?.({}).then((list: unknown) => {
      setWorkers((list as Record<string, unknown>[]) ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSpinner size="md" center />;

  return (
    <Card>
      <h2 className="font-rajdhani text-lg font-bold text-[var(--text-primary)]">WORKER MANAGEMENT</h2>
      <table className="mt-4 w-full border-collapse font-mono text-xs">
        <thead>
          <tr className="border-b border-[var(--border-default)] text-left text-[var(--text-dim)]">
            <th className="py-2 pr-2">Name</th>
            <th className="py-2 pr-2">Employee ID</th>
            <th className="py-2 pr-2">Department</th>
          </tr>
        </thead>
        <tbody>
          {workers.slice(0, 50).map((w) => (
            <tr key={String(w.id)} className="border-b border-[var(--border-default)]">
              <td className="py-2 pr-2 text-[var(--text-primary)]">{String(w.name)}</td>
              <td className="py-2 pr-2">{String(w.employee_id)}</td>
              <td className="py-2 pr-2">{String(w.department ?? '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
