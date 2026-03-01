import type { SensorReading, AlertEvent } from './engine-types';
import type Database from 'better-sqlite3';

type Db = InstanceType<typeof Database>;
import { startEscalation, cancelEscalation } from './alert-escalation';
import { IPC_EVENTS } from './engine-constants';
import { queueAlert, cancelForIncident } from '../alerts/alert-delivery';
import { syncEngine } from '../sync/sync-engine';
import type { IncidentRow } from '../sync/transformers/incident-transformer';

export interface ZoneInfo {
  zoneId: string;
  zoneName: string;
  floorId: string;
  floorName: string;
}

type SendToRendererFn = (channel: string, data: unknown) => void;

function getHierarchy(db: Db, organizationId: string): { id: string; level: number; role_name: string; escalation_delay_seconds: number }[] {
  const rows = db.prepare(
    'SELECT id, level, role_name, escalation_delay_seconds FROM alert_hierarchy WHERE organization_id = ? ORDER BY level'
  ).all(organizationId) as { id: string; level: number; role_name: string; escalation_delay_seconds: number }[];
  return rows;
}

function getContactsByLevel(db: Db, hierarchy: { id: string; level: number }[]): Map<number, { id: string; name: string; phone: string | null; email: string | null; whatsapp: string | null }[]> {
  const map = new Map<number, { id: string; name: string; phone: string | null; email: string | null; whatsapp: string | null }[]>();
  for (const h of hierarchy) {
    const contacts = db.prepare(
      'SELECT id, name, phone, email, whatsapp FROM alert_contacts WHERE hierarchy_level_id = ? AND is_active = 1'
    ).all(h.id) as { id: string; name: string; phone: string | null; email: string | null; whatsapp: string | null }[];
    map.set(h.level, contacts);
  }
  return map;
}

function getIncidentRowForSync(db: Db, incidentId: string): IncidentRow | null {
  const row = db.prepare(
    `SELECT i.id, i.zone_id, i.incident_type, i.severity, i.title, i.description, i.sensor_id, i.triggered_at,
      i.acknowledged_at, i.acknowledged_by, i.resolved_at, i.resolved_by, i.resolution_notes,
      z.name as zone_name, f.name as floor_name, s.name as sensor_name
     FROM incidents i
     LEFT JOIN zones z ON z.id = i.zone_id
     LEFT JOIN floors f ON f.id = z.floor_id
     LEFT JOIN sensors s ON s.id = i.sensor_id
     WHERE i.id = ?`
  ).get(incidentId) as IncidentRow | undefined;
  return row ?? null;
}

export function checkAndFireAlert(
  db: Db,
  reading: SensorReading,
  zone: ZoneInfo,
  organizationId: string,
  sendToRenderer: SendToRendererFn
): void {
  try {
    const existing = db.prepare(
      'SELECT id, severity FROM incidents WHERE sensor_id = ? AND zone_id = ? AND resolved_at IS NULL ORDER BY triggered_at DESC LIMIT 1'
    ).get(reading.sensorId, zone.zoneId) as { id: string; severity: string } | undefined;

    const severity = reading.status === 'critical' ? 'critical' : reading.status === 'danger' ? 'danger' : 'warning';
    const severityOrder = { warning: 1, danger: 2, critical: 3 };

    if (existing) {
      const existingOrder = severityOrder[existing.severity as keyof typeof severityOrder] ?? 1;
      const newOrder = severityOrder[severity as keyof typeof severityOrder];
      if (newOrder <= existingOrder) return;
      db.prepare(
        'UPDATE incidents SET severity = ?, title = ?, description = ? WHERE id = ?'
      ).run(severity, `${reading.sensorName} — ${reading.status} Level Detected`, buildDescription(reading, zone), existing.id);
      const incidentRow = getIncidentRowForSync(db, existing.id);
      if (incidentRow) syncEngine.onNewIncident(incidentRow);
      const alertEvent = buildAlertEvent(existing.id, reading, zone, severity);
      sendToRenderer(IPC_EVENTS.ALERT_FIRED, alertEvent);
      return;
    }

    const newIncidentId = `inc_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    db.prepare(
      `INSERT INTO incidents (id, zone_id, incident_type, severity, title, description, sensor_id, triggered_at, synced_to_cloud)
       VALUES (?, ?, 'sensor_breach', ?, ?, ?, ?, datetime('now'), 0)`
    ).run(newIncidentId, zone.zoneId, severity, `${reading.sensorName} — ${reading.status} Level Detected`, buildDescription(reading, zone), reading.sensorId);

    const incidentRow = getIncidentRowForSync(db, newIncidentId);
    if (incidentRow) syncEngine.onNewIncident(incidentRow);

    try {
      db.prepare(
        `INSERT INTO audit_log (id, action, entity_type, entity_id, new_value_json, performed_at, synced_to_cloud)
         VALUES (lower(hex(randomblob(16))), 'incident_created', 'incidents', ?, ?, datetime('now'), 0)`
      ).run(newIncidentId, JSON.stringify({ severity, sensorId: reading.sensorId }));
    } catch {
      // ignore
    }

    const alertEvent = buildAlertEvent(newIncidentId, reading, zone, severity);
    sendToRenderer(IPC_EVENTS.ALERT_FIRED, alertEvent);

    const hierarchy = getHierarchy(db, organizationId);
    const contactsByLevel = getContactsByLevel(db, hierarchy);
    const level1Contacts = hierarchy.length > 0 ? contactsByLevel.get(hierarchy[0].level) ?? [] : [];
    const orgRow = db.prepare('SELECT id, name FROM organizations WHERE id = ?').get(organizationId) as { id: string; name: string } | undefined;
    if (orgRow && level1Contacts.length > 0) {
      queueAlert({
        incident: {
          id: newIncidentId,
          zone_id: zone.zoneId,
          title: `${reading.sensorName} — ${severity} Level Detected`,
          severity,
          triggered_at: new Date().toISOString(),
          sensor_id: reading.sensorId,
        },
        hierarchyLevel: 1,
        contacts: level1Contacts,
        organization: orgRow,
        zoneName: zone.zoneName,
        floorName: zone.floorName,
        sensor: {
          name: reading.sensorName,
          value: reading.value,
          unit: reading.unit,
          threshold: reading.status === 'critical' ? reading.threshold.criticalMax : reading.status === 'danger' ? reading.threshold.dangerMax : reading.threshold.warningMax,
        },
      }).catch(() => {});
    }
    if (hierarchy.length > 0) {
      const getIncident = (id: string) => {
        const r = db.prepare('SELECT acknowledged_at, resolved_at FROM incidents WHERE id = ?').get(id) as { acknowledged_at: string | null; resolved_at: string | null } | undefined;
        return r ?? null;
      };
      startEscalation(newIncidentId, hierarchy, contactsByLevel, db, (event) => sendToRenderer(IPC_EVENTS.ALERT_ESCALATED, event), getIncident);
    }
  } catch {
    // ignore
  }
}

function buildDescription(reading: SensorReading, zone: ZoneInfo): string {
  const threshold = reading.status === 'critical' ? reading.threshold.criticalMax : reading.status === 'danger' ? reading.threshold.dangerMax : reading.threshold.warningMax;
  return `${reading.sensorName} reading ${reading.value}${reading.unit}. Threshold: ${threshold}${reading.unit}. Zone: ${zone.zoneName}, Floor: ${zone.floorName}. Immediate attention required.`;
}

function buildAlertEvent(incidentId: string, reading: SensorReading, zone: ZoneInfo, severity: string): AlertEvent {
  const threshold = reading.status === 'critical' ? reading.threshold.criticalMax : reading.status === 'danger' ? reading.threshold.dangerMax : reading.threshold.warningMax;
  return {
    alertId: `alert-${incidentId}`,
    incidentId,
    zoneId: zone.zoneId,
    zoneName: zone.zoneName,
    floorName: zone.floorName,
    alertType: 'sensor_breach',
    severity: severity as AlertEvent['severity'],
    title: `${reading.sensorName} — ${reading.status} Level Detected`,
    description: buildDescription(reading, zone),
    sensorId: reading.sensorId,
    sensorName: reading.sensorName,
    sensorValue: reading.value,
    sensorUnit: reading.unit,
    threshold,
    triggeredAt: new Date().toISOString(),
    requiresAcknowledgment: true,
  };
}

export function resolveAlert(
  db: Db,
  incidentId: string,
  resolvedBy: string,
  notes: string,
  sendToRenderer: SendToRendererFn
): void {
  try {
    db.prepare(
      'UPDATE incidents SET resolved_at = datetime(\'now\'), resolved_by = ?, resolution_notes = ? WHERE id = ?'
    ).run(resolvedBy, notes, incidentId);
    const incidentRow = getIncidentRowForSync(db, incidentId);
    if (incidentRow) syncEngine.onNewIncident(incidentRow);
    cancelEscalation(incidentId);
    cancelForIncident(incidentId);
    db.prepare(
      `INSERT INTO audit_log (id, action, entity_type, entity_id, new_value_json, performed_at, synced_to_cloud)
       VALUES (lower(hex(randomblob(16))), 'incident_resolved', 'incidents', ?, ?, datetime('now'), 0)`
    ).run(incidentId, JSON.stringify({ resolvedBy, notes }));
    sendToRenderer(IPC_EVENTS.INCIDENT_RESOLVED, { incidentId });
  } catch {
    // ignore
  }
}

export function acknowledgeAlert(
  db: Db,
  incidentId: string,
  acknowledgedBy: string,
  sendToRenderer: SendToRendererFn
): void {
  try {
    db.prepare('UPDATE incidents SET acknowledged_at = datetime(\'now\'), acknowledged_by = ? WHERE id = ?').run(acknowledgedBy, incidentId);
    const incidentRow = getIncidentRowForSync(db, incidentId);
    if (incidentRow) syncEngine.onNewIncident(incidentRow);
    db.prepare(
      `INSERT INTO audit_log (id, action, entity_type, entity_id, new_value_json, performed_at, synced_to_cloud)
       VALUES (lower(hex(randomblob(16))), 'incident_acknowledged', 'incidents', ?, ?, datetime('now'), 0)`
    ).run(incidentId, JSON.stringify({ acknowledgedBy }));
  } catch {
    // ignore
  }
}
