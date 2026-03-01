import type { EscalationTimer, AlertEvent } from './engine-types';
import type Database from 'better-sqlite3';
import { queueAlert } from '../alerts/alert-delivery';

type Db = InstanceType<typeof Database>;

const ACK_RESUME_ESCALATION_MS = 30 * 60 * 1000;

interface HierarchyLevel {
  id: string;
  level: number;
  role_name: string;
  escalation_delay_seconds: number;
}

interface HierarchyContact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
}

type SendAlertFn = (event: AlertEvent) => void;

const activeTimers = new Map<string, EscalationTimer>();

function runEscalationStep(
  incidentId: string,
  nextLevel: number,
  hierarchy: HierarchyLevel[],
  contactsByLevel: Map<number, HierarchyContact[]>,
  db: Db,
  sendAlert: SendAlertFn,
  getIncident: (id: string) => { acknowledged_at: string | null; resolved_at: string | null } | null
): void {
  const incident = getIncident(incidentId);
  if (!incident) {
    activeTimers.delete(incidentId);
    return;
  }
  if (incident.resolved_at) {
    activeTimers.delete(incidentId);
    return;
  }
  if (incident.acknowledged_at) {
    const ackTime = new Date(incident.acknowledged_at).getTime();
    if (Date.now() - ackTime < ACK_RESUME_ESCALATION_MS) {
      const t = activeTimers.get(incidentId);
      const currentLevel = t?.currentLevel ?? 1;
      const timerId = setTimeout(() => runEscalationStep(incidentId, currentLevel + 1, hierarchy, contactsByLevel, db, sendAlert, getIncident), ACK_RESUME_ESCALATION_MS);
      activeTimers.set(incidentId, { incidentId, currentLevel, maxLevel: hierarchy.length, nextEscalationAt: Date.now() + ACK_RESUME_ESCALATION_MS, timerId });
      return;
    }
  }

  if (nextLevel > hierarchy.length) {
    activeTimers.delete(incidentId);
    return;
  }

  const levelConfig = hierarchy.find((l) => l.level === nextLevel);
  if (!levelConfig) {
    activeTimers.delete(incidentId);
    return;
  }

  const incidentRow = db.prepare('SELECT id, zone_id, title, severity, triggered_at FROM incidents WHERE id = ?').get(incidentId) as { id: string; zone_id: string; title: string; severity: string; triggered_at: string } | undefined;
  if (!incidentRow) {
    activeTimers.delete(incidentId);
    return;
  }
  const zoneRow = db.prepare('SELECT name, floor_id FROM zones WHERE id = ?').get(incidentRow.zone_id) as { name: string; floor_id: string } | undefined;
  const floorRow = zoneRow ? (db.prepare('SELECT name, organization_id FROM floors WHERE id = ?').get(zoneRow.floor_id) as { name: string; organization_id: string } | undefined) : undefined;
  const orgRow = floorRow ? (db.prepare('SELECT id, name FROM organizations WHERE id = ?').get(floorRow.organization_id) as { id: string; name: string } | undefined) : undefined;

  const alertEvent: AlertEvent = {
    alertId: `esc-${incidentId}-${nextLevel}`,
    incidentId,
    zoneId: incidentRow.zone_id,
    zoneName: zoneRow?.name ?? 'Unknown',
    floorName: floorRow?.name ?? 'Unknown',
    alertType: 'sensor_breach',
    severity: (incidentRow.severity === 'critical' ? 'critical' : incidentRow.severity === 'danger' ? 'danger' : 'warning') as AlertEvent['severity'],
    title: `Escalation L${nextLevel}: ${incidentRow.title}`,
    description: `Incident escalated to ${levelConfig.role_name}.`,
    triggeredAt: new Date().toISOString(),
    requiresAcknowledgment: true,
  };
  sendAlert(alertEvent);

  const levelContacts = contactsByLevel.get(nextLevel) ?? [];
  if (orgRow && zoneRow && floorRow && levelContacts.length > 0) {
    queueAlert({
      incident: {
        id: incidentId,
        zone_id: incidentRow.zone_id,
        title: alertEvent.title,
        severity: incidentRow.severity,
        triggered_at: incidentRow.triggered_at,
        sensor_id: null,
      },
      hierarchyLevel: nextLevel,
      contacts: levelContacts,
      organization: orgRow,
      zoneName: zoneRow.name,
      floorName: floorRow.name,
      sensor: undefined,
    }).catch(() => {});
  }

  try {
    db.prepare(
      `INSERT INTO audit_log (id, action, entity_type, entity_id, new_value_json, performed_at, synced_to_cloud)
       VALUES (lower(hex(randomblob(16))), 'alert_escalated', 'incidents', ?, ?, datetime('now'), 0)`
    ).run(incidentId, JSON.stringify({ level: nextLevel, role: levelConfig.role_name }));
  } catch {
    // ignore
  }

  const nextDelayMs = (levelConfig.escalation_delay_seconds ?? 180) * 1000;
  const nextTimerId = setTimeout(() => {
    runEscalationStep(incidentId, nextLevel + 1, hierarchy, contactsByLevel, db, sendAlert, getIncident);
  }, nextDelayMs);

  activeTimers.set(incidentId, {
    incidentId,
    currentLevel: nextLevel,
    maxLevel: hierarchy.length,
    nextEscalationAt: Date.now() + nextDelayMs,
    timerId: nextTimerId,
  });
}

export function startEscalation(
  incidentId: string,
  hierarchy: HierarchyLevel[],
  contactsByLevel: Map<number, HierarchyContact[]>,
  db: Db,
  sendAlert: SendAlertFn,
  getIncident: (id: string) => { acknowledged_at: string | null; resolved_at: string | null } | null
): void {
  if (hierarchy.length === 0) return;
  const level1 = hierarchy[0];
  const delayMs = (level1.escalation_delay_seconds ?? 180) * 1000;

  const timerId = setTimeout(() => {
    runEscalationStep(incidentId, 2, hierarchy, contactsByLevel, db, sendAlert, getIncident);
  }, delayMs);

  activeTimers.set(incidentId, {
    incidentId,
    currentLevel: 1,
    maxLevel: hierarchy.length,
    nextEscalationAt: Date.now() + delayMs,
    timerId,
  });
}

export function cancelEscalation(incidentId: string): void {
  const t = activeTimers.get(incidentId);
  if (t) {
    clearTimeout(t.timerId);
    activeTimers.delete(incidentId);
  }
}

export function getActiveEscalations(): Map<string, EscalationTimer> {
  return new Map(activeTimers);
}
