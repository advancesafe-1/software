import { ipcMain } from 'electron';
import { getDb } from './database';

function sanitizeNote(note: unknown): string {
  if (typeof note !== 'string') return '';
  return note.slice(0, 2000).replace(/[\0-\x1F\x7F]/g, '');
}

function sanitizeSearch(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s.replace(/[%_\\]/g, '').trim().slice(0, 200);
}

export function registerFeatureIpcHandlers(): void {
  ipcMain.handle('incidents:get-all', async (_event, params: {
    status?: 'active' | 'acknowledged' | 'resolved' | 'all';
    zoneId?: string;
    severity?: string;
    limit?: number;
    offset?: number;
  }) => {
    const db = getDb();
    if (!db) return [];
    const limit = Math.min(500, Math.max(1, Number(params?.limit) || 50));
    const offset = Math.max(0, Number(params?.offset) || 0);
    const conditions: string[] = ['1=1'];
    const values: unknown[] = [];
    if (params?.status && params.status !== 'all') {
      if (params.status === 'active') {
        conditions.push('i.resolved_at IS NULL AND i.acknowledged_at IS NULL');
      } else if (params.status === 'acknowledged') {
        conditions.push('i.resolved_at IS NULL AND i.acknowledged_at IS NOT NULL');
      } else if (params.status === 'resolved') {
        conditions.push('i.resolved_at IS NOT NULL');
      }
    }
    if (params?.zoneId) {
      conditions.push('i.zone_id = ?');
      values.push(params.zoneId);
    }
    if (params?.severity) {
      conditions.push('i.severity = ?');
      values.push(params.severity);
    }
    values.push(limit, offset);
    const sql = `SELECT i.*, z.name as zone_name, f.name as floor_name, s.name as sensor_name, s.sensor_type
      FROM incidents i
      LEFT JOIN zones z ON z.id = i.zone_id
      LEFT JOIN floors f ON f.id = z.floor_id
      LEFT JOIN sensors s ON s.id = i.sensor_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY i.triggered_at DESC LIMIT ? OFFSET ?`;
    return db.prepare(sql).all(...values);
  });

  ipcMain.handle('incidents:get-by-id', async (_event, id: string) => {
    const db = getDb();
    if (!db || typeof id !== 'string' || !id) return null;
    const row = db.prepare(`SELECT i.*, z.name as zone_name, f.name as floor_name, s.name as sensor_name, s.sensor_type
      FROM incidents i
      LEFT JOIN zones z ON z.id = i.zone_id
      LEFT JOIN floors f ON f.id = z.floor_id
      LEFT JOIN sensors s ON s.id = i.sensor_id
      WHERE i.id = ?`).get(id);
    return row ?? null;
  });

  ipcMain.handle('incidents:get-counts', async () => {
    const db = getDb();
    if (!db) {
      return { total: 0, active: 0, acknowledged: 0, resolved: 0, critical: 0, danger: 0, warning: 0, todayCount: 0, weekCount: 0 };
    }
    const total = (db.prepare('SELECT COUNT(*) as c FROM incidents').get() as { c: number }).c;
    const active = (db.prepare('SELECT COUNT(*) as c FROM incidents WHERE resolved_at IS NULL AND acknowledged_at IS NULL').get() as { c: number }).c;
    const acknowledged = (db.prepare('SELECT COUNT(*) as c FROM incidents WHERE resolved_at IS NULL AND acknowledged_at IS NOT NULL').get() as { c: number }).c;
    const resolved = (db.prepare('SELECT COUNT(*) as c FROM incidents WHERE resolved_at IS NOT NULL').get() as { c: number }).c;
    const critical = (db.prepare('SELECT COUNT(*) as c FROM incidents WHERE severity = ? AND resolved_at IS NULL').get('critical') as { c: number }).c;
    const danger = (db.prepare('SELECT COUNT(*) as c FROM incidents WHERE severity = ? AND resolved_at IS NULL').get('danger') as { c: number }).c;
    const warning = (db.prepare('SELECT COUNT(*) as c FROM incidents WHERE severity = ? AND resolved_at IS NULL').get('warning') as { c: number }).c;
    const todayCount = (db.prepare("SELECT COUNT(*) as c FROM incidents WHERE date(triggered_at) = date('now')").get() as { c: number }).c;
    const weekCount = (db.prepare("SELECT COUNT(*) as c FROM incidents WHERE triggered_at > datetime('now', '-7 days')").get() as { c: number }).c;
    return { total, active, acknowledged, resolved, critical, danger, warning, todayCount, weekCount };
  });

  ipcMain.handle('incidents:add-note', async (_event, incidentId: string, note: string, userId: string) => {
    const db = getDb();
    if (!db || typeof incidentId !== 'string' || !incidentId) return;
    const safeNote = sanitizeNote(note);
    const existing = db.prepare('SELECT resolution_notes FROM incidents WHERE id = ?').get(incidentId) as { resolution_notes: string | null } | undefined;
    const newNotes = existing ? `${existing.resolution_notes || ''}\n[${new Date().toISOString()}] ${safeNote}` : safeNote;
    db.prepare('UPDATE incidents SET resolution_notes = ? WHERE id = ?').run(newNotes.slice(0, 5000), incidentId);
    db.prepare(`INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, new_value_json, performed_at, synced_to_cloud)
      VALUES (lower(hex(randomblob(16))), ?, 'incident_add_note', 'incidents', ?, ?, datetime('now'), 0)`).run(userId, incidentId, JSON.stringify({ note: safeNote.slice(0, 500) }));
  });

  ipcMain.handle('sensors:get-all', async (_event, params: { floorId?: string; zoneId?: string; status?: string }) => {
    const db = getDb();
    if (!db) return [];
    const conditions: string[] = ['s.is_active = 1'];
    const values: unknown[] = [];
    if (params?.floorId) {
      conditions.push('s.floor_id = ?');
      values.push(params.floorId);
    }
    if (params?.zoneId) {
      conditions.push('s.zone_id = ?');
      values.push(params.zoneId);
    }
    const sql = `SELECT s.*, z.name as zone_name, f.name as floor_name,
      r.value as latest_value, r.status as latest_status, r.recorded_at as latest_reading_at
      FROM sensors s
      LEFT JOIN zones z ON z.id = s.zone_id
      LEFT JOIN floors f ON f.id = s.floor_id
      LEFT JOIN sensor_readings r ON r.id = (
        SELECT id FROM sensor_readings WHERE sensor_id = s.id ORDER BY recorded_at DESC LIMIT 1
      )
      WHERE ${conditions.join(' AND ')}`;
    const rows = db.prepare(sql).all(...values) as Record<string, unknown>[];
    if (params?.status) {
      return rows.filter((r) => r.latest_status === params.status);
    }
    return rows;
  });

  ipcMain.handle('sensors:get-history', async (_event, sensorId: string, hours: number) => {
    const db = getDb();
    if (!db || typeof sensorId !== 'string' || !sensorId) return [];
    const h = Math.min(168, Math.max(1, Number(hours) || 24));
    return db.prepare(`SELECT value, status, recorded_at FROM sensor_readings
      WHERE sensor_id = ? AND recorded_at > datetime('now', '-' || ? || ' hours')
      ORDER BY recorded_at ASC LIMIT 500`).all(sensorId, h);
  });

  ipcMain.handle('sensors:update-thresholds', async (_event, params: {
    sensorId: string;
    safeMin: number; safeMax: number;
    warningMin: number; warningMax: number;
    dangerMin: number; dangerMax: number;
    criticalMin: number; criticalMax: number;
    userId: string;
  }) => {
    const db = getDb();
    if (!db || !params?.sensorId || typeof params.sensorId !== 'string') return;
    const id = params.sensorId;
    const safeMin = Number(params.safeMin);
    const safeMax = Number(params.safeMax);
    const warningMin = Number(params.warningMin);
    const warningMax = Number(params.warningMax);
    const dangerMin = Number(params.dangerMin);
    const dangerMax = Number(params.dangerMax);
    const criticalMin = Number(params.criticalMin);
    const criticalMax = Number(params.criticalMax);
    db.prepare(`UPDATE sensors SET safe_min=?, safe_max=?, warning_min=?, warning_max=?,
      danger_min=?, danger_max=?, critical_min=?, critical_max=? WHERE id=?`).run(
      safeMin, safeMax, warningMin, warningMax, dangerMin, dangerMax, criticalMin, criticalMax, id
    );
    db.prepare(`INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, new_value_json, performed_at, synced_to_cloud)
      VALUES (lower(hex(randomblob(16))), ?, 'sensor_update_thresholds', 'sensors', ?, ?, datetime('now'), 0)`).run(
      params.userId || 'system', id, JSON.stringify({ safeMin, safeMax, warningMin, warningMax, dangerMin, dangerMax, criticalMin, criticalMax })
    );
  });

  ipcMain.handle('analytics:get-safety-trend', async (_event, days: number) => {
    const db = getDb();
    if (!db) return [];
    const d = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;
    return db.prepare(`SELECT date(calculated_at) as date, AVG(score) as avg_score, MIN(score) as min_score, COUNT(*) as readings
      FROM guardian_scores WHERE calculated_at > datetime('now', '-' || ? || ' days')
      GROUP BY date(calculated_at) ORDER BY date ASC`).all(d);
  });

  ipcMain.handle('analytics:get-incident-distribution', async (_event, days: number) => {
    const db = getDb();
    if (!db) return [];
    const d = Math.min(365, Math.max(1, Number(days) || 30));
    return db.prepare(`SELECT incident_type, severity, COUNT(*) as count FROM incidents
      WHERE triggered_at > datetime('now', '-' || ? || ' days')
      GROUP BY incident_type, severity`).all(d);
  });

  ipcMain.handle('analytics:get-risk-matrix', async (_event, days: number) => {
    const db = getDb();
    if (!db) return [];
    const d = Math.min(365, Math.max(1, Number(days) || 30));
    return db.prepare(`SELECT z.name as zone_name, strftime('%H', i.triggered_at) as hour_bucket,
      COUNT(*) as incident_count,
      AVG(CASE i.severity WHEN 'critical' THEN 3 WHEN 'danger' THEN 2 WHEN 'warning' THEN 1 ELSE 0 END) as risk_score
      FROM incidents i JOIN zones z ON z.id = i.zone_id
      WHERE i.triggered_at > datetime('now', '-' || ? || ' days')
      GROUP BY z.name, hour_bucket ORDER BY z.name, hour_bucket`).all(d);
  });

  ipcMain.handle('analytics:get-kpis', async () => {
    const db = getDb();
    if (!db) return { totalIncidents: 0, totalIncidentsChange: 0, avgGuardianScore: 0, avgGuardianScoreChange: 0, activeAlerts: 0, systemUptime: 0, resolvedToday: 0, avgResponseTimeMinutes: 0 };
    const totalIncidents = (db.prepare('SELECT COUNT(*) as c FROM incidents').get() as { c: number }).c;
    const prevPeriod = (db.prepare("SELECT COUNT(*) as c FROM incidents WHERE triggered_at > datetime('now', '-60 days') AND triggered_at <= datetime('now', '-30 days')").get() as { c: number }).c;
    const currentPeriod = (db.prepare("SELECT COUNT(*) as c FROM incidents WHERE triggered_at > datetime('now', '-30 days')").get() as { c: number }).c;
    const totalIncidentsChange = prevPeriod > 0 ? ((currentPeriod - prevPeriod) / prevPeriod) * 100 : 0;
    const avgRow = db.prepare(`SELECT AVG(score) as avg_score FROM guardian_scores WHERE calculated_at > datetime('now', '-7 days')`).get() as { avg_score: number | null };
    const avgGuardianScore = avgRow?.avg_score ?? 0;
    const activeAlerts = (db.prepare('SELECT COUNT(*) as c FROM incidents WHERE resolved_at IS NULL').get() as { c: number }).c;
    const resolvedToday = (db.prepare("SELECT COUNT(*) as c FROM incidents WHERE resolved_at IS NOT NULL AND date(resolved_at) = date('now')").get() as { c: number }).c;
    const ackRows = db.prepare(`SELECT acknowledged_at, triggered_at FROM incidents WHERE acknowledged_at IS NOT NULL AND triggered_at > datetime('now', '-30 days') LIMIT 100`).all() as { acknowledged_at: string; triggered_at: string }[];
    let totalMins = 0;
    let count = 0;
    for (const r of ackRows) {
      totalMins += (new Date(r.acknowledged_at).getTime() - new Date(r.triggered_at).getTime()) / 60000;
      count++;
    }
    const avgResponseTimeMinutes = count > 0 ? totalMins / count : 0;
    return {
      totalIncidents,
      totalIncidentsChange,
      avgGuardianScore: Math.round(avgGuardianScore * 10) / 10,
      avgGuardianScoreChange: 0,
      activeAlerts,
      systemUptime: 99.9,
      resolvedToday,
      avgResponseTimeMinutes: Math.round(avgResponseTimeMinutes * 10) / 10,
    };
  });

  ipcMain.handle('zones:list', async () => {
    const db = getDb();
    if (!db) return [];
    return db.prepare('SELECT id, name, floor_id FROM zones ORDER BY name').all();
  });

  ipcMain.handle('workers:get-all', async (_event, params: {
    search?: string;
    isContractWorker?: boolean;
    department?: string;
    limit?: number;
    offset?: number;
  }) => {
    const db = getDb();
    if (!db) return [];
    const limit = Math.min(500, Math.max(1, Number(params?.limit) || 100));
    const offset = Math.max(0, Number(params?.offset) || 0);
    const conditions: string[] = ['w.is_active = 1'];
    const values: unknown[] = [];
    const search = sanitizeSearch(params?.search);
    if (search) {
      conditions.push('(w.name LIKE ? OR w.employee_id LIKE ?)');
      values.push(`%${search}%`, `%${search}%`);
    }
    if (params?.isContractWorker !== undefined) {
      conditions.push('w.is_contract_worker = ?');
      values.push(params.isContractWorker ? 1 : 0);
    }
    if (params?.department) {
      conditions.push('w.department = ?');
      values.push(params.department);
    }
    values.push(limit, offset);
    const sql = `SELECT w.*,
      wc.zone_id as current_zone_id, z.name as current_zone_name
      FROM workers w
      LEFT JOIN worker_checkins wc ON wc.id = (
        SELECT id FROM worker_checkins WHERE worker_id = w.id AND checked_out_at IS NULL
        ORDER BY checked_in_at DESC LIMIT 1
      )
      LEFT JOIN zones z ON z.id = wc.zone_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY w.name ASC LIMIT ? OFFSET ?`;
    return db.prepare(sql).all(...values);
  });

  ipcMain.handle('workers:get-counts', async () => {
    const db = getDb();
    if (!db) return { total: 0, activeNow: 0, contractWorkers: 0, permanentWorkers: 0 };
    const total = (db.prepare('SELECT COUNT(*) as c FROM workers WHERE is_active = 1').get() as { c: number }).c;
    const activeNow = (db.prepare('SELECT COUNT(DISTINCT worker_id) as c FROM worker_checkins WHERE checked_out_at IS NULL').get() as { c: number }).c;
    const contractWorkers = (db.prepare('SELECT COUNT(*) as c FROM workers WHERE is_active = 1 AND is_contract_worker = 1').get() as { c: number }).c;
    const permanentWorkers = total - contractWorkers;
    return { total, activeNow, contractWorkers, permanentWorkers };
  });

  ipcMain.handle('workers:get-by-id', async (_event, id: string) => {
    const db = getDb();
    if (!db || typeof id !== 'string' || !id) return null;
    const worker = db.prepare('SELECT * FROM workers WHERE id = ?').get(id);
    if (!worker) return null;
    const checkins = db.prepare('SELECT * FROM worker_checkins WHERE worker_id = ? ORDER BY checked_in_at DESC LIMIT 20').all(id);
    return { ...worker as object, checkins };
  });

  ipcMain.handle('workers:checkin', async (_event, workerId: string, zoneId: string, method: string) => {
    const db = getDb();
    if (!db || typeof workerId !== 'string' || typeof zoneId !== 'string') return;
    db.prepare(`INSERT INTO worker_checkins (id, worker_id, zone_id, checkin_method) VALUES (lower(hex(randomblob(16))), ?, ?, ?)`).run(workerId, zoneId, typeof method === 'string' ? method.slice(0, 50) : 'manual');
    db.prepare(`INSERT INTO audit_log (id, action, entity_type, entity_id, new_value_json, performed_at, synced_to_cloud) VALUES (lower(hex(randomblob(16))), 'worker_checkin', 'worker_checkins', ?, ?, datetime('now'), 0)`).run(workerId, JSON.stringify({ zoneId, method: method || 'manual' }));
  });

  ipcMain.handle('workers:checkout', async (_event, workerId: string) => {
    const db = getDb();
    if (!db || typeof workerId !== 'string') return;
    db.prepare(`UPDATE worker_checkins SET checked_out_at = datetime('now') WHERE worker_id = ? AND checked_out_at IS NULL`).run(workerId);
    db.prepare(`INSERT INTO audit_log (id, action, entity_type, entity_id, performed_at, synced_to_cloud) VALUES (lower(hex(randomblob(16))), 'worker_checkout', 'worker_checkins', ?, datetime('now'), 0)`).run(workerId);
  });

  ipcMain.handle('workers:update', async (_event, params: { id: string; name?: string; employee_id?: string; role?: string; department?: string; phone?: string; is_contract_worker?: number; contractor_company?: string; language_preference?: string }) => {
    const db = getDb();
    if (!db || !params?.id || typeof params.id !== 'string') return;
    const id = params.id;
    const allowed = ['name', 'employee_id', 'role', 'department', 'phone', 'is_contract_worker', 'contractor_company', 'language_preference'];
    const updates: string[] = [];
    const values: unknown[] = [];
    for (const key of allowed) {
      const v = (params as Record<string, unknown>)[key];
      if (v !== undefined) {
        updates.push(`${key} = ?`);
        values.push(typeof v === 'string' ? v.slice(0, 500) : v);
      }
    }
    if (updates.length === 0) return;
    values.push(id);
    db.prepare(`UPDATE workers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    db.prepare(`INSERT INTO audit_log (id, action, entity_type, entity_id, new_value_json, performed_at, synced_to_cloud) VALUES (lower(hex(randomblob(16))), 'worker_update', 'workers', ?, ?, datetime('now'), 0)`).run(id, JSON.stringify(params));
  });
}
