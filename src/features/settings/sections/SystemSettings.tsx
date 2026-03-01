import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/store/toast-store';
import { useRoleGate } from '@/hooks/useRoleGate';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PasswordConfirmDialog } from '@/components/ui/PasswordConfirmDialog';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAppStore } from '@/store/app-store';

export function SystemSettings() {
  const [info, setInfo] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [factoryResetConfirm, setFactoryResetConfirm] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState<'reset' | 'factory' | null>(null);
  const { toast } = useToast();
  const { canManageDangerZone } = useRoleGate();
  const currentUser = useAppStore((s) => s.currentUser);

  useEffect(() => {
    (async () => {
      const data = await window.advancesafe?.admin?.system?.getInfo?.();
      setInfo((data as Record<string, unknown>) ?? null);
      setLoading(false);
    })();
  }, []);

  const handleExportBackup = async () => {
    const result = await window.advancesafe?.admin?.system?.exportDatabase?.();
    if (result?.success && result?.path) {
      toast.success('Backup saved');
    } else {
      toast.error(result?.error ?? 'Export failed');
    }
  };

  if (loading || !info) return <LoadingSpinner size="md" center />;

  const totalRecords = (info.totalRecords as Record<string, number>) ?? {};
  return (
    <Card>
      <h2 className="font-rajdhani text-lg font-bold text-[var(--text-primary)]">SYSTEM SETTINGS</h2>
      <section className="mt-4">
        <h3 className="font-mono text-xs font-semibold uppercase text-[var(--text-dim)]">System information</h3>
        <dl className="mt-2 space-y-1 font-mono text-xs">
          <div><dt className="inline text-[var(--text-dim)]">App: </dt><dd className="inline text-[var(--text-primary)]">{String(info.appVersion)}</dd></div>
          <div><dt className="inline text-[var(--text-dim)]">Node: </dt><dd className="inline text-[var(--text-primary)]">{String(info.nodeVersion)}</dd></div>
          <div><dt className="inline text-[var(--text-dim)]">DB size: </dt><dd className="inline text-[var(--text-primary)]">{((Number(info.dbSizeBytes) || 0) / 1024 / 1024).toFixed(2)} MB</dd></div>
          <div><dt className="inline text-[var(--text-dim)]">Incidents: </dt><dd className="inline text-[var(--text-primary)]">{totalRecords.incidents ?? 0}</dd></div>
          <div><dt className="inline text-[var(--text-dim)]">Audit log: </dt><dd className="inline text-[var(--text-primary)]">{totalRecords.auditLog ?? 0}</dd></div>
        </dl>
      </section>
      <section className="mt-4">
        <button type="button" onClick={handleExportBackup} className="rounded bg-[var(--accent-cyan)] px-3 py-1.5 font-mono text-sm text-[var(--bg-primary)]">Export backup</button>
      </section>
      {canManageDangerZone && (
        <section className="mt-4 rounded border-2 border-[var(--status-critical)] p-3">
          <h3 className="font-mono text-xs font-semibold uppercase text-[var(--status-critical)]">Danger zone</h3>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setPasswordOpen('reset')} className="rounded border border-[var(--status-warning)] px-2 py-1 font-mono text-xs text-[var(--status-warning)]">Reset onboarding</button>
            <button type="button" onClick={() => setPasswordOpen('factory')} className="rounded border border-[var(--status-critical)] px-2 py-1 font-mono text-xs text-[var(--status-critical)]">Factory reset</button>
          </div>
        </section>
      )}
      <ConfirmDialog open={resetConfirm} title="Reset onboarding" message="Type RESET to confirm." confirmText="RESET" destructive onConfirm={() => setResetConfirm(false)} onCancel={() => setResetConfirm(false)} />
      <ConfirmDialog open={factoryResetConfirm} title="Factory reset" message="Type FACTORY RESET to confirm." confirmText="FACTORY RESET" destructive onConfirm={() => setFactoryResetConfirm(false)} onCancel={() => setFactoryResetConfirm(false)} />
      <PasswordConfirmDialog open={passwordOpen === 'reset'} title="Confirm password" userId={currentUser?.id ?? ''} onConfirm={() => { setPasswordOpen(null); setResetConfirm(true); }} onCancel={() => setPasswordOpen(null)} />
      <PasswordConfirmDialog open={passwordOpen === 'factory'} title="Confirm password" userId={currentUser?.id ?? ''} onConfirm={() => { setPasswordOpen(null); setFactoryResetConfirm(true); }} onCancel={() => setPasswordOpen(null)} />
    </Card>
  );
}
