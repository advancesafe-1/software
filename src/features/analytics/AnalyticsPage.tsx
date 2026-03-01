import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAnalyticsData } from './useAnalyticsData';
import { SafetyTrendChart } from './SafetyTrendChart';
import { IncidentDistributionChart } from './IncidentDistributionChart';
import { RiskMatrix } from './RiskMatrix';
import { RecentIncidentLogs } from './RecentIncidentLogs';

const PERIODS = [30, 90, 365] as const;

export function AnalyticsPage() {
  const [period, setPeriod] = useState<number>(30);
  const { safetyTrend, incidentDist, riskMatrix, kpis, loading, error } = useAnalyticsData(period);

  const handleGenerateReport = () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>AdvanceSafe Report</title><style>body{font-family:sans-serif;padding:24px;background:#0a0f1a;color:#e2e8f0;} table{border-collapse:collapse;} th,td{border:1px solid #334155;padding:8px;} .header{color:#22d3ee;margin-bottom:24px;}</style></head>
        <body>
          <div class="header"><h1>AdvanceSafe Safety Report</h1><p>Generated: ${new Date().toISOString().slice(0, 10)}</p></div>
          <h2>KPIs</h2>
          <p>Total Incidents: ${kpis?.totalIncidents ?? '—'}</p>
          <p>Avg Guardian Score: ${kpis?.avgGuardianScore ?? '—'}</p>
          <p>Active Alerts: ${kpis?.activeAlerts ?? '—'}</p>
          <p>System Uptime: ${kpis?.systemUptime ?? '—'}%</p>
          <p>Resolved Today: ${kpis?.resolvedToday ?? '—'}</p>
          <p>Use Ctrl+P to print to PDF.</p>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-rajdhani text-xl font-bold text-[var(--text-primary)]">SAFETY ANALYTICS & REPORTS</h1>
          <p className="font-mono text-xs text-[var(--text-dim)]">SYSTEM_STATUS: NOMINAL</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setPeriod(d)}
              className={
                'rounded px-3 py-1.5 font-mono text-xs ' +
                (period === d ? 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]' : 'border border-[var(--border-default)] text-[var(--text-secondary)]')
              }
            >
              {d === 365 ? '1Y' : d + 'D'}
            </button>
          ))}
          <button type="button" onClick={handleGenerateReport} className="rounded border border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-3 py-1.5 font-mono text-sm text-[var(--accent-cyan)]">
            GENERATE PDF REPORT
          </button>
        </div>
      </div>

      {error != null && <p className="font-mono text-sm text-[var(--status-critical)]">{error}</p>}

      {loading && !kpis ? (
        <LoadingSpinner center />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <SectionLabel>Total Incidents</SectionLabel>
              <p className="font-mono text-2xl text-[var(--text-primary)]">{kpis?.totalIncidents ?? '—'}</p>
              <p className="font-mono text-[10px] text-[var(--text-dim)]">{kpis?.totalIncidentsChange != null ? kpis.totalIncidentsChange + '% vs prev' : ''}</p>
            </Card>
            <Card>
              <SectionLabel>Predictive Risk Score</SectionLabel>
              <p className="font-mono text-2xl text-[var(--text-primary)]">{kpis?.avgGuardianScore ?? '—'}</p>
            </Card>
            <Card>
              <SectionLabel>Active Alerts</SectionLabel>
              <p className="font-mono text-2xl text-[var(--text-primary)]">{kpis?.activeAlerts ?? '—'}</p>
            </Card>
            <Card>
              <SectionLabel>System Uptime</SectionLabel>
              <p className="font-mono text-2xl text-[var(--text-primary)]">{kpis?.systemUptime != null ? kpis.systemUptime + '%' : '—'}</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[65%_1fr]">
            <Card>
              <SectionLabel>SAFETY TREND</SectionLabel>
              <SafetyTrendChart data={safetyTrend} />
            </Card>
            <Card>
              <SectionLabel>INCIDENT DISTRIBUTION</SectionLabel>
              <IncidentDistributionChart data={incidentDist} />
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[55%_1fr]">
            <Card>
              <SectionLabel>PREDICTIVE RISK MATRIX</SectionLabel>
              <RiskMatrix data={riskMatrix} />
            </Card>
            <Card>
              <SectionLabel>RECENT LOGS</SectionLabel>
              <RecentIncidentLogs />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
