import React, { useState, useCallback } from 'react';
import { BarChart2, AlertTriangle, Activity, Shield, ClipboardList } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useRoleGate } from '@/hooks/useRoleGate';
import { ReportGenerator } from './ReportGenerator';
import { ReportHistory } from './ReportHistory';
import type { ReportType } from './reports-types';
import { REPORT_TYPE_LABELS } from './reports-types';

const REPORT_TYPES: { type: ReportType; icon: React.ComponentType<{ className?: string; size?: number }> }[] = [
  { type: 'safety_summary', icon: BarChart2 },
  { type: 'incident_report', icon: AlertTriangle },
  { type: 'sensor_report', icon: Activity },
  { type: 'compliance_report', icon: Shield },
  { type: 'audit_report', icon: ClipboardList },
];

export function ReportsPage() {
  const { canAccess } = useRoleGate();
  const organization = useAppStore((s) => s.organization);
  const currentUser = useAppStore((s) => s.currentUser);
  const [modalType, setModalType] = useState<ReportType | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  const canGenerate = canAccess('admin');
  const orgId = (organization as { id?: string } | null)?.id ?? '';
  const userId = (currentUser as { id?: string } | null)?.id ?? '';
  const userName = (currentUser as { fullName?: string } | null)?.fullName ?? (currentUser as { username?: string } | null)?.username ?? 'User';

  const refreshHistory = useCallback(() => setHistoryKey((k) => k + 1), []);

  return (
    <div className="flex h-full flex-col overflow-auto bg-[var(--bg-primary)]">
      <div className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)] px-6 py-4">
        <h1 className="font-rajdhani text-xl font-bold text-[var(--text-primary)]">Reports & Compliance</h1>
        <p className="text-sm text-[var(--text-secondary)]">Generate safety and compliance documentation</p>
      </div>
      <div className="flex-1 overflow-auto p-6 space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">Generate New Report</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {REPORT_TYPES.map(({ type, icon: Icon }) => {
              const meta = REPORT_TYPE_LABELS[type];
              return (
                <button
                  key={type}
                  type="button"
                  disabled={!canGenerate}
                  onClick={() => canGenerate && setModalType(type)}
                  className="flex flex-col items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6 text-center transition-colors hover:border-[var(--accent-cyan)] hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon className="mb-2 text-[var(--accent-cyan)]" size={32} />
                  <span className="font-medium text-[var(--text-primary)]">{meta.title}</span>
                  <span className="mt-1 text-xs text-[var(--text-secondary)]">{meta.description}</span>
                </button>
              );
            })}
          </div>
          {!canGenerate && (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Only Admin and above can generate reports.</p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">Recent Reports</h2>
          <ReportHistory key={historyKey} />
        </section>
      </div>

      {modalType && orgId && userId && (
        <ReportGenerator
          reportType={modalType}
          organizationId={orgId}
          generatedBy={userId}
          generatedByName={userName}
          onClose={() => setModalType(null)}
          onGenerated={refreshHistory}
        />
      )}
    </div>
  );
}
