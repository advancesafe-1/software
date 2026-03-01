import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useEngineData } from '@/hooks/useEngineData';
import { useAlertActions } from '@/hooks/useAlertActions';
import { MiniFloorMap } from '@/features/floor-map/MiniFloorMap';
import type {
  EngineOrganizationScore,
  EngineAlertEvent,
  EngineSensorReading,
  ZoneStatus,
} from '@/types';

function formatElapsed(triggeredAt: string): string {
  const then = new Date(triggeredAt).getTime();
  const sec = Math.floor((Date.now() - then) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

function statusColor(status: ZoneStatus): string {
  switch (status) {
    case 'safe': return 'var(--status-safe)';
    case 'warning': return 'var(--status-warning)';
    case 'danger': return 'var(--status-danger)';
    case 'critical': return 'var(--status-critical)';
    default: return 'var(--text-secondary)';
  }
}

function GuardianScoreCard({ orgScore }: { orgScore: EngineOrganizationScore | null }) {
  const score = orgScore?.overallScore ?? null;
  const status = orgScore?.status ?? 'safe';
  const color = statusColor(status);
  return (
    <Card>
      <SectionLabel>Guardian Score</SectionLabel>
      <p
        className="font-mono text-4xl font-bold text-[var(--text-primary)] transition-[color] duration-500"
        style={{ color: score != null ? color : 'var(--text-muted)' }}
      >
        {score != null ? Math.round(score) : '—'}
      </p>
      <p className="mt-2 text-xs text-[var(--text-secondary)]">
        {orgScore ? `${status.toUpperCase()} — Live` : 'ENGINE STARTING'}
      </p>
      {score != null && (
        <div
          className="mt-2 h-1 w-full rounded-full bg-[var(--bg-tertiary)]"
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${score}%`, backgroundColor: color }}
          />
        </div>
      )}
    </Card>
  );
}

function PlantStatusCard({ orgScore }: { orgScore: EngineOrganizationScore | null }) {
  const safeCount = useMemo(() => {
    if (!orgScore) return 0;
    let n = 0;
    for (const floor of orgScore.floors) {
      for (const zone of floor.zones) {
        if (zone.status === 'safe') n++;
      }
    }
    return n;
  }, [orgScore]);
  const totalZones = useMemo(() => {
    if (!orgScore) return 0;
    return orgScore.floors.reduce((s, f) => s + f.zones.length, 0);
  }, [orgScore]);
  const status = orgScore?.status ?? 'safe';
  return (
    <Card>
      <SectionLabel>Plant Status</SectionLabel>
      <p className="font-mono text-2xl text-[var(--text-primary)]">
        {orgScore ? `${safeCount} / ${totalZones}` : '—'}
      </p>
      <p className="mt-2 text-xs text-[var(--text-secondary)]">
        Active zones · Level: <span style={{ color: statusColor(status) }}>{status.toUpperCase()}</span>
      </p>
      {orgScore && (
        <div className="mt-2 flex gap-2 text-xs font-mono">
          <span style={{ color: 'var(--status-safe)' }}>{orgScore.floors.flatMap(f => f.zones).filter(z => z.status === 'safe').length} SAFE</span>
          <span style={{ color: 'var(--status-warning)' }}>{orgScore.floors.flatMap(f => f.zones).filter(z => z.status === 'warning').length} WARNING</span>
          <span style={{ color: 'var(--status-danger)' }}>{orgScore.floors.flatMap(f => f.zones).filter(z => z.status === 'danger').length} DANGER</span>
          <span style={{ color: 'var(--status-critical)' }}>{orgScore.floors.flatMap(f => f.zones).filter(z => z.status === 'critical').length} CRITICAL</span>
        </div>
      )}
    </Card>
  );
}

function ActiveIncidentsPanel({
  alerts,
  onAcknowledge,
}: {
  alerts: EngineAlertEvent[];
  onAcknowledge: (incidentId: string) => Promise<void>;
}) {
  return (
    <Card className="min-h-[200px]">
      <SectionLabel>Active Incidents</SectionLabel>
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <span className="h-2 w-2 rounded-full bg-[var(--status-safe)]" />
          <p className="font-mono text-sm text-[var(--text-secondary)]">No active incidents</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {alerts.slice(0, 8).map((alert) => (
            <li
              key={alert.alertId}
              className="rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] p-2"
              style={{ borderLeftWidth: '3px', borderLeftColor: statusColor(alert.severity as ZoneStatus) }}
            >
              <p className="font-mono text-sm font-medium text-[var(--text-primary)]">{alert.title}</p>
              <p className="text-xs text-[var(--text-secondary)]">
                {alert.zoneName} · {alert.floorName} · {formatElapsed(alert.triggeredAt)}
              </p>
              <button
                type="button"
                className="mt-2 rounded bg-[var(--accent-cyan)] px-2 py-1 font-mono text-xs text-[var(--bg-primary)] hover:opacity-90"
                onClick={() => onAcknowledge(alert.incidentId)}
              >
                ACKNOWLEDGE
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function CriticalSensorsRow({ orgScore }: { orgScore: EngineOrganizationScore | null }) {
  const worstSensors = useMemo((): EngineSensorReading[] => {
    if (!orgScore) return [];
    const list: EngineSensorReading[] = [];
    for (const floor of orgScore.floors) {
      for (const zone of floor.zones) {
        for (const r of zone.sensorReadings) {
          if (r.status !== 'safe') list.push(r);
        }
        if (zone.worstSensor && zone.worstSensor.status !== 'safe') {
          if (!list.find((s) => s.sensorId === zone.worstSensor!.sensorId)) {
            list.push(zone.worstSensor);
          }
        }
      }
    }
    list.sort((a, b) => a.scoreContribution - b.scoreContribution);
    return list.slice(0, 4);
  }, [orgScore]);

  if (worstSensors.length === 0) {
    return (
      <Card>
        <SectionLabel>Critical Sensors</SectionLabel>
        <p className="font-mono text-sm text-[var(--text-secondary)]">All sensors nominal</p>
      </Card>
    );
  }

  return (
    <Card>
      <SectionLabel>Critical Sensors</SectionLabel>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {worstSensors.map((s) => (
          <div
            key={s.sensorId}
            className="rounded border border-[var(--border-default)] p-2"
            style={{ borderLeftWidth: '3px', borderLeftColor: statusColor(s.status as ZoneStatus) }}
          >
            <p className="font-mono text-xs font-medium text-[var(--text-primary)]">{s.sensorName}</p>
            <p className="font-mono text-lg text-[var(--text-mono)]">
              {s.value} {s.unit}
            </p>
            <StatusBadge status={s.status} />
            <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--bg-tertiary)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${s.scoreContribution}%`,
                  backgroundColor: statusColor(s.status as ZoneStatus),
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function Dashboard() {
  const { orgScore, latestAlerts } = useEngineData();
  const { acknowledgeAlert } = useAlertActions();

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <h1 className="font-rajdhani text-xl font-bold text-[var(--text-primary)]">
        Dashboard
      </h1>

      <div className="grid grid-cols-3 gap-4">
        <GuardianScoreCard orgScore={orgScore} />
        <PlantStatusCard orgScore={orgScore} />
        <Card>
          <SectionLabel>Worker Deployment</SectionLabel>
          <p className="font-mono text-[var(--text-mono)]">—</p>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">No data yet</p>
        </Card>
      </div>

      <div className="grid grid-cols-[60%_1fr] gap-4">
        <Card className="min-h-[200px] overflow-hidden p-0">
          <div className="px-4 pt-2">
            <SectionLabel>Live Topology View</SectionLabel>
          </div>
          <div className="h-[300px] w-full">
            <MiniFloorMap />
          </div>
        </Card>
        <ActiveIncidentsPanel alerts={latestAlerts} onAcknowledge={acknowledgeAlert} />
      </div>

      <div className="grid grid-cols-[70%_1fr] gap-4">
        <CriticalSensorsRow orgScore={orgScore} />
        <Card>
          <SectionLabel>Safety Forecast</SectionLabel>
          <p className="font-mono text-sm text-[var(--text-secondary)]">No forecast data</p>
        </Card>
      </div>

      <Card>
        <SectionLabel>Safety Trend Chart</SectionLabel>
        <p className="font-mono text-sm text-[var(--text-secondary)]">Chart will render here</p>
      </Card>
    </div>
  );
}
