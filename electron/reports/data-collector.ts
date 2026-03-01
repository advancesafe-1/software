import type Database from 'better-sqlite3';

export interface OrgData {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  industry_type: string | null;
  total_workers: number;
}

export interface ScoreHistoryRow {
  date: string;
  zone_id: string | null;
  zone_name: string | null;
  avg_score: number;
  min_score: number;
  max_score: number;
  status: string;
}

export interface IncidentRow {
  id: string;
  zone_id: string | null;
  zone_name: string | null;
  floor_name: string | null;
  incident_type: string;
  severity: string;
  title: string;
  triggered_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  sensor_name: string | null;
}

export interface IncidentCountData {
  total: number;
  critical: number;
  danger: number;
  warning: number;
  byType: Record<string, number>;
}

export interface ResponseTimeRow {
  severity: string;
  count: number;
  avgAckMinutes: number;
  avgResolutionMinutes: number;
}

export interface SensorSummaryRow {
  sensor_id: string;
  sensor_name: string;
  zone_name: string | null;
  sensor_type: string;
  readings_count: number;
  min_value: number;
  max_value: number;
  avg_value: number;
  breach_count: number;
}

export interface SensorBreachRow {
  recorded_at: string;
  sensor_id: string;
  sensor_name: string;
  zone_name: string | null;
  value: number;
  unit: string | null;
  status: string;
}

export interface ZoneRiskRow {
  zone_id: string;
  zone_name: string;
  floor_name: string | null;
  incident_count: number;
  critical: number;
  danger: number;
  warning: number;
  risk_rating: number;
}

export interface WorkerStatsData {
  total: number;
  active: number;
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  performed_at: string;
  new_value_json: string | null;
}

export interface AlertDeliveryRow {
  created_at: string;
  incident_id: string;
  channel: string;
  status: string;
  attempts: number;
}

export interface FloorZoneSummaryRow {
  floor_id: string;
  floor_name: string;
  zone_id: string;
  zone_name: string;
  sensor_count: number;
}

export interface SensorInventoryRow {
  id: string;
  name: string;
  zone_name: string | null;
  floor_name: string | null;
  sensor_type: string;
  protocol: string;
  status: string;
  last_reading_at: string | null;
  safe_max: number | null;
  warning_max: number | null;
  danger_max: number | null;
  critical_max: number | null;
}

export interface ReportFilters {
  zoneIds?: string[];
  floorIds?: string[];
  severities?: string[];
  includeResolved?: boolean;
}

export class DataCollector {
  constructor(private db: Database.Database) {}

  getOrganization(organizationId: string): OrgData | null {
    const row = this.db
      .prepare(
        'SELECT id, name, address, city, state, industry_type, total_workers FROM organizations WHERE id = ? AND is_active = 1'
      )
      .get(organizationId) as OrgData | undefined;
    return row ?? null;
  }

  getGuardianScoreHistory(from: string, to: string, zoneIds?: string[]): ScoreHistoryRow[] {
    let sql = `
      SELECT date(calculated_at) as date, g.zone_id, z.name as zone_name,
        AVG(g.score) as avg_score, MIN(g.score) as min_score, MAX(g.score) as max_score,
        MAX(g.status) as status
      FROM guardian_scores g
      LEFT JOIN zones z ON z.id = g.zone_id
      WHERE g.calculated_at >= ? AND g.calculated_at <= ?
    `;
    const params: (string | number)[] = [from, to];
    if (zoneIds && zoneIds.length > 0) {
      sql += ' AND g.zone_id IN (' + zoneIds.map(() => '?').join(',') + ')';
      params.push(...zoneIds);
    }
    sql += ' GROUP BY date(g.calculated_at), g.zone_id ORDER BY date, zone_name';
    return this.db.prepare(sql).all(...params) as ScoreHistoryRow[];
  }

  getIncidents(from: string, to: string, filters?: ReportFilters): IncidentRow[] {
    let sql = `
      SELECT i.id, i.zone_id, z.name as zone_name, f.name as floor_name,
        i.incident_type, i.severity, i.title, i.triggered_at,
        i.acknowledged_at, i.resolved_at, i.resolved_by, s.name as sensor_name
      FROM incidents i
      LEFT JOIN zones z ON z.id = i.zone_id
      LEFT JOIN floors f ON f.id = z.floor_id
      LEFT JOIN sensors s ON s.id = i.sensor_id
      WHERE i.triggered_at >= ? AND i.triggered_at <= ?
    `;
    const params: (string | number)[] = [from, to];
    if (filters?.zoneIds?.length) {
      sql += ' AND i.zone_id IN (' + filters.zoneIds.map(() => '?').join(',') + ')';
      params.push(...filters.zoneIds);
    }
    if (filters?.floorIds?.length) {
      sql += ' AND z.floor_id IN (' + filters.floorIds.map(() => '?').join(',') + ')';
      params.push(...filters.floorIds);
    }
    if (filters?.severities?.length) {
      sql += ' AND i.severity IN (' + filters.severities.map(() => '?').join(',') + ')';
      params.push(...filters.severities);
    }
    if (filters?.includeResolved === false) {
      sql += ' AND i.resolved_at IS NULL';
    }
    sql += ' ORDER BY i.triggered_at DESC';
    return this.db.prepare(sql).all(...params) as IncidentRow[];
  }

  getIncidentCounts(from: string, to: string): IncidentCountData {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM incidents WHERE triggered_at >= ? AND triggered_at <= ?').get(from, to) as { c: number }).c;
    const critical = (this.db.prepare('SELECT COUNT(*) as c FROM incidents WHERE triggered_at >= ? AND triggered_at <= ? AND severity = ?').get(from, to, 'critical') as { c: number }).c;
    const danger = (this.db.prepare('SELECT COUNT(*) as c FROM incidents WHERE triggered_at >= ? AND triggered_at <= ? AND severity = ?').get(from, to, 'danger') as { c: number }).c;
    const warning = (this.db.prepare('SELECT COUNT(*) as c FROM incidents WHERE triggered_at >= ? AND triggered_at <= ? AND severity = ?').get(from, to, 'warning') as { c: number }).c;
    const byTypeRows = this.db.prepare('SELECT incident_type, COUNT(*) as count FROM incidents WHERE triggered_at >= ? AND triggered_at <= ? GROUP BY incident_type').all(from, to) as { incident_type: string; count: number }[];
    const byType: Record<string, number> = {};
    for (const r of byTypeRows) byType[r.incident_type] = r.count;
    return { total, critical, danger, warning, byType };
  }

  getResponseTimeStats(from: string, to: string): ResponseTimeRow[] {
    const rows = this.db
      .prepare(
        `SELECT severity,
          COUNT(*) as count,
          AVG(CASE WHEN acknowledged_at IS NOT NULL THEN (julianday(acknowledged_at) - julianday(triggered_at)) * 24 * 60 ELSE NULL END) as avg_ack_min,
          AVG(CASE WHEN resolved_at IS NOT NULL THEN (julianday(resolved_at) - julianday(triggered_at)) * 24 * 60 ELSE NULL END) as avg_res_min
         FROM incidents WHERE triggered_at >= ? AND triggered_at <= ?
         GROUP BY severity`
      )
      .all(from, to) as { severity: string; count: number; avg_ack_min: number | null; avg_res_min: number | null }[];
    return rows.map((r) => ({
      severity: r.severity,
      count: r.count,
      avgAckMinutes: r.avg_ack_min ?? 0,
      avgResolutionMinutes: r.avg_res_min ?? 0,
    }));
  }

  getSensorReadingsSummary(from: string, to: string): SensorSummaryRow[] {
    const rows = this.db
      .prepare(
        `SELECT r.sensor_id, s.name as sensor_name, z.name as zone_name, s.sensor_type,
          COUNT(*) as readings_count,
          MIN(r.value) as min_value, MAX(r.value) as max_value, AVG(r.value) as avg_value,
          SUM(CASE WHEN r.status != 'safe' AND r.status != 'optimal' THEN 1 ELSE 0 END) as breach_count
         FROM sensor_readings r
         JOIN sensors s ON s.id = r.sensor_id
         LEFT JOIN zones z ON z.id = s.zone_id
         WHERE r.recorded_at >= ? AND r.recorded_at <= ? AND s.is_active = 1
         GROUP BY r.sensor_id`
      )
      .all(from, to) as SensorSummaryRow[];
    return rows;
  }

  getSensorBreaches(from: string, to: string): SensorBreachRow[] {
    const rows = this.db
      .prepare(
        `SELECT r.recorded_at, r.sensor_id, s.name as sensor_name, z.name as zone_name,
          r.value, r.unit, r.status
         FROM sensor_readings r
         JOIN sensors s ON s.id = r.sensor_id
         LEFT JOIN zones z ON z.id = s.zone_id
         WHERE r.recorded_at >= ? AND r.recorded_at <= ?
         AND r.status IN ('warning','danger','critical')
         ORDER BY r.recorded_at DESC
         LIMIT 500`
      )
      .all(from, to) as SensorBreachRow[];
    return rows;
  }

  getZoneRiskMatrix(from: string, to: string): ZoneRiskRow[] {
    const rows = this.db
      .prepare(
        `SELECT i.zone_id, z.name as zone_name, f.name as floor_name,
          COUNT(*) as incident_count,
          SUM(CASE WHEN i.severity = 'critical' THEN 1 ELSE 0 END) as critical,
          SUM(CASE WHEN i.severity = 'danger' THEN 1 ELSE 0 END) as danger,
          SUM(CASE WHEN i.severity = 'warning' THEN 1 ELSE 0 END) as warning
         FROM incidents i
         JOIN zones z ON z.id = i.zone_id
         LEFT JOIN floors f ON f.id = z.floor_id
         WHERE i.triggered_at >= ? AND i.triggered_at <= ?
         GROUP BY i.zone_id`
      )
      .all(from, to) as (ZoneRiskRow & { critical: number; danger: number; warning: number })[];
    return rows.map((r) => {
      const total = r.incident_count;
      const risk = total > 0 ? ((r.critical * 3 + r.danger * 2 + r.warning) / total) * 10 : 0;
      return { ...r, risk_rating: Math.round(risk * 10) / 10 } as ZoneRiskRow;
    });
  }

  getWorkerStats(): WorkerStatsData {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM workers WHERE is_active = 1').get() as { c: number }).c;
    const active = (this.db.prepare('SELECT COUNT(DISTINCT worker_id) as c FROM worker_checkins WHERE checked_out_at IS NULL').get() as { c: number }).c;
    return { total, active };
  }

  getAuditLog(from: string, to: string): AuditLogRow[] {
    return this.db
      .prepare(
        'SELECT id, user_id, action, entity_type, entity_id, performed_at, new_value_json FROM audit_log WHERE performed_at >= ? AND performed_at <= ? ORDER BY performed_at DESC LIMIT 2000'
      )
      .all(from, to) as AuditLogRow[];
  }

  getAlertDeliveryStats(from: string, to: string): AlertDeliveryRow[] {
    return this.db
      .prepare(
        `SELECT created_at, incident_id, channel, status, attempts FROM alert_delivery_queue WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC LIMIT 500`
      )
      .all(from, to) as AlertDeliveryRow[];
  }

  getFloorZoneSummary(): FloorZoneSummaryRow[] {
    return this.db
      .prepare(
        `SELECT f.id as floor_id, f.name as floor_name, z.id as zone_id, z.name as zone_name,
          (SELECT COUNT(*) FROM sensors s WHERE s.zone_id = z.id AND s.is_active = 1) as sensor_count
         FROM floors f
         JOIN zones z ON z.floor_id = f.id AND z.is_active = 1
         ORDER BY f.floor_number, z.name`
      )
      .all() as FloorZoneSummaryRow[];
  }

  getSensorInventory(): SensorInventoryRow[] {
    return this.db
      .prepare(
        `SELECT s.id, s.name, z.name as zone_name, f.name as floor_name, s.sensor_type, s.protocol,
          CASE WHEN s.is_active = 1 THEN 'active' ELSE 'inactive' END as status,
          (SELECT MAX(recorded_at) FROM sensor_readings WHERE sensor_id = s.id) as last_reading_at,
          s.safe_max, s.warning_max, s.danger_max, s.critical_max
         FROM sensors s
         LEFT JOIN zones z ON z.id = s.zone_id
         LEFT JOIN floors f ON f.id = s.floor_id
         ORDER BY z.name, s.name`
      )
      .all() as SensorInventoryRow[];
  }

  getDailyIncidentTrend(from: string, to: string): { date: string; count: number }[] {
    return this.db
      .prepare(
        `SELECT date(triggered_at) as date, COUNT(*) as count FROM incidents WHERE triggered_at >= ? AND triggered_at <= ? GROUP BY date(triggered_at) ORDER BY date`
      )
      .all(from, to) as { date: string; count: number }[];
  }

  getAvgGuardianScore(from: string, to: string): number {
    const row = this.db.prepare('SELECT AVG(score) as avg FROM guardian_scores WHERE calculated_at >= ? AND calculated_at <= ?').get(from, to) as { avg: number | null };
    return row?.avg ?? 0;
  }
}
