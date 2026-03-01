import { ipcMain, app } from 'electron';
import { randomBytes, pbkdf2Sync } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { getDb, getDbPathPublic } from './database';
import { syncEngine } from '../sync/sync-engine';
import type Database from 'better-sqlite3';

type Db = Database.Database;

const ROLES_ORDER: Record<string, number> = {
  super_admin: 0,
  admin: 1,
  plant_head: 2,
  manager: 3,
  supervisor: 4,
  view_only: 5,
};

const VALID_ROLES = new Set<string>(Object.keys(ROLES_ORDER));

function roleLevel(role: string): number {
  return ROLES_ORDER[role] ?? 99;
}

function canElevate(actorRole: string, targetRole: string): boolean {
  return roleLevel(actorRole) <= roleLevel(targetRole);
}

function auditLog(db: Db, userId: string | null, action: string, entityType: string | null, entityId: string | null, newValueJson: string | null): void {
  try {
    db.prepare(
      `INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, new_value_json, performed_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, datetime('now'))`
    ).run(userId, action, entityType, entityId, newValueJson);
  } catch {
    // ignore
  }
}

function hashPassword(password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, 100000, 64, 'sha512');
}

function verifyPassword(password: string, salt: string, hash: string): boolean {
  const saltBuf = Buffer.from(salt, 'hex');
  const derived = hashPassword(password, saltBuf);
  return derived.toString('hex') === hash;
}

function validatePassword(password: string): { ok: boolean; error?: string } {
  if (password.length < 8) return { ok: false, error: 'Min 8 characters' };
  if (!/[A-Z]/.test(password)) return { ok: false, error: 'Need 1 uppercase' };
  if (!/[0-9]/.test(password)) return { ok: false, error: 'Need 1 number' };
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return { ok: false, error: 'Need 1 special character' };
  return { ok: true };
}

function validateUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(username) && username.length >= 2 && username.length <= 50;
}

function ensureDefaultAdmin(db: Db): void {
  const org = db.prepare('SELECT id FROM organizations WHERE is_active = 1 LIMIT 1').get() as { id: string } | undefined;
  if (!org) return;
  const existing = db.prepare('SELECT id FROM app_users WHERE organization_id = ? LIMIT 1').get(org.id) as { id: string } | undefined;
  if (existing) return;
  const salt = randomBytes(32);
  const hash = hashPassword('AdvanceSafe@123', salt);
  const id = 'user_' + Date.now();
  db.prepare(
    `INSERT INTO app_users (id, organization_id, username, password_hash, salt, full_name, role, is_active) VALUES (?, ?, 'admin', ?, ?, 'Administrator', 'admin', 1)`
  ).run(id, org.id, hash.toString('hex'), salt.toString('hex'));
}

export function registerSettingsIpcHandlers(): void {
  const db = getDb();
  if (!db) return;
  ensureDefaultAdmin(db);

  ipcMain.handle('org:update-profile', async (_event, params: Record<string, unknown>) => {
    const database = getDb();
    if (!database) return { success: false, error: 'Database not available' };
    const userId = params.userId as string;
    try {
      database.prepare(
        `UPDATE organizations SET name = ?, address = ?, city = ?, state = ?, industry_type = ?, total_workers = ?, gst_number = ?, primary_contact_name = ?, primary_contact_phone = ?, primary_contact_email = ?, emergency_contact_name = ?, emergency_contact_phone = ? WHERE is_active = 1`
      ).run(
        params.name ?? '',
        params.address ?? null,
        params.city ?? null,
        params.state ?? null,
        params.industryType ?? null,
        params.totalWorkers ?? 0,
        params.gstNumber ?? null,
        params.primaryContactName ?? null,
        params.primaryContactPhone ?? null,
        params.primaryContactEmail ?? null,
        params.emergencyContactName ?? null,
        params.emergencyContactPhone ?? null
      );
      auditLog(database, userId, 'org_profile_updated', 'organizations', null, JSON.stringify({ updatedBy: userId }));
      syncEngine.forceFullSync().catch(() => {});
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('org:get-profile', async () => {
    const database = getDb();
    if (!database) return null;
    const row = database.prepare('SELECT * FROM organizations WHERE is_active = 1 LIMIT 1').get() as Record<string, unknown> | undefined;
    return row ?? null;
  });

  ipcMain.handle('users:get-all', async (_event, organizationId: string) => {
    const database = getDb();
    if (!database) return [];
    return database.prepare(
      'SELECT id, username, full_name, role, email, phone, is_active, last_login_at, created_at FROM app_users WHERE organization_id = ? ORDER BY full_name ASC'
    ).all(organizationId) as Record<string, unknown>[];
  });

  ipcMain.handle('users:create', async (_event, params: Record<string, unknown>) => {
    const database = getDb();
    if (!database) return { success: false, error: 'Database not available' };
    const username = String(params.username ?? '').trim();
    const fullName = String(params.fullName ?? '').trim();
    const role = String(params.role ?? 'view_only');
    const email = params.email != null ? String(params.email).trim() : '';
    const phone = params.phone != null ? String(params.phone).trim() : '';
    const password = params.password as string;
    const createdBy = params.createdBy as string;
    const organizationId = params.organizationId as string;
    if (!organizationId) return { success: false, error: 'Organization required' };
    if (!validateUsername(username)) return { success: false, error: 'Username: alphanumeric and underscore only, 2-50 chars' };
    if (!VALID_ROLES.has(role)) return { success: false, error: 'Invalid role' };
    const pv = validatePassword(password ?? '');
    if (!pv.ok) return { success: false, error: pv.error };
    const existing = database.prepare('SELECT id FROM app_users WHERE organization_id = ? AND username = ?').get(organizationId, username) as { id: string } | undefined;
    if (existing) return { success: false, error: 'Username already exists' };
    try {
      const salt = randomBytes(32);
      const hash = hashPassword(password, salt);
      const id = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      database.prepare(
        `INSERT INTO app_users (id, organization_id, username, password_hash, salt, full_name, role, email, phone, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, organizationId, username, hash.toString('hex'), salt.toString('hex'), fullName, role, email || null, phone || null, createdBy);
      auditLog(database, createdBy, 'user_created', 'app_users', id, JSON.stringify({ username, role }));
      return { success: true, id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('users:update-role', async (_event, params: { userId: string; newRole: string; updatedBy: string }) => {
    const database = getDb();
    if (!database) return { success: false, error: 'Database not available' };
    if (params.updatedBy === params.userId) return { success: false, error: 'Cannot change own role' };
    if (!VALID_ROLES.has(params.newRole)) return { success: false, error: 'Invalid role' };
    const updater = database.prepare('SELECT role FROM app_users WHERE id = ?').get(params.updatedBy) as { role: string } | undefined;
    const target = database.prepare('SELECT role FROM app_users WHERE id = ?').get(params.userId) as { role: string } | undefined;
    if (!updater || !target) return { success: false, error: 'User not found' };
    if (!canElevate(updater.role, params.newRole)) return { success: false, error: 'Cannot assign role higher than your own' };
    try {
      database.prepare('UPDATE app_users SET role = ? WHERE id = ?').run(params.newRole, params.userId);
      auditLog(database, params.updatedBy, 'user_role_updated', 'app_users', params.userId, JSON.stringify({ newRole: params.newRole }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('users:deactivate', async (_event, params: { userId: string; deactivatedBy: string }) => {
    const database = getDb();
    if (!database) return { success: false, error: 'Database not available' };
    if (params.deactivatedBy === params.userId) return { success: false, error: 'Cannot deactivate own account' };
    try {
      database.prepare('UPDATE app_users SET is_active = 0 WHERE id = ?').run(params.userId);
      auditLog(database, params.deactivatedBy, 'user_deactivated', 'app_users', params.userId, null);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('users:activate', async (_event, params: { userId: string; activatedBy: string }) => {
    const database = getDb();
    if (!database) return { success: true };
    database.prepare('UPDATE app_users SET is_active = 1, failed_attempts = 0, locked_until = NULL WHERE id = ?').run(params.userId);
    auditLog(database, params.activatedBy, 'user_activated', 'app_users', params.userId, null);
    return { success: true };
  });

  ipcMain.handle('users:change-password', async (_event, params: { userId: string; currentPassword: string; newPassword: string; changedBy: string }) => {
    const database = getDb();
    if (!database) return { success: false, error: 'Database not available' };
    const row = database.prepare('SELECT salt, password_hash FROM app_users WHERE id = ?').get(params.userId) as { salt: string; password_hash: string } | undefined;
    if (!row || !verifyPassword(params.currentPassword, row.salt, row.password_hash)) return { success: false, error: 'Current password incorrect' };
    const pv = validatePassword(params.newPassword);
    if (!pv.ok) return { success: false, error: pv.error };
    try {
      const salt = randomBytes(32);
      const hash = hashPassword(params.newPassword, salt);
      database.prepare('UPDATE app_users SET password_hash = ?, salt = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?').run(hash.toString('hex'), salt.toString('hex'), params.userId);
      auditLog(database, params.changedBy, 'password_changed', 'app_users', params.userId, null);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('users:login', async (_event, params: { username: string; password: string }) => {
    const database = getDb();
    if (!database) return { success: false, error: 'System error' };
    const org = database.prepare('SELECT id FROM organizations WHERE is_active = 1 LIMIT 1').get() as { id: string } | undefined;
    if (!org) return { success: false, error: 'Invalid credentials' };
    const user = database.prepare('SELECT id, username, password_hash, salt, full_name, role, is_active, failed_attempts, locked_until FROM app_users WHERE organization_id = ? AND username = ?').get(org.id, params.username) as { id: string; username: string; password_hash: string; salt: string; full_name: string; role: string; is_active: number; failed_attempts: number; locked_until: string | null } | undefined;
    if (!user) return { success: false, error: 'Invalid credentials' };
    if (user.is_active !== 1) return { success: false, error: 'Account disabled' };
    if (user.locked_until) {
      const lockEnd = new Date(user.locked_until).getTime();
      if (Date.now() < lockEnd) return { success: false, error: 'Account locked. Try again later.' };
      database.prepare('UPDATE app_users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
    }
    if (!verifyPassword(params.password, user.salt, user.password_hash)) {
      const attempts = (user.failed_attempts ?? 0) + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
      database.prepare('UPDATE app_users SET failed_attempts = ?, locked_until = ? WHERE id = ?').run(attempts, lockedUntil, user.id);
      return { success: false, error: 'Invalid credentials' };
    }
    database.prepare('UPDATE app_users SET last_login_at = datetime(\'now\'), failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
    auditLog(database, user.id, 'user_login', 'app_users', user.id, null);
    return { success: true, user: { id: user.id, username: user.username, fullName: user.full_name, role: user.role } };
  });

  ipcMain.handle('users:verify-password', async (_event, params: { userId: string; password: string }) => {
    const database = getDb();
    if (!database) return { valid: false };
    const row = database.prepare('SELECT salt, password_hash FROM app_users WHERE id = ?').get(params.userId) as { salt: string; password_hash: string } | undefined;
    if (!row) return { valid: false };
    return { valid: verifyPassword(params.password, row.salt, row.password_hash) };
  });

  ipcMain.handle('users:has-users', async () => {
    const database = getDb();
    if (!database) return false;
    const org = database.prepare('SELECT id FROM organizations WHERE is_active = 1 LIMIT 1').get() as { id: string } | undefined;
    if (!org) return false;
    const r = database.prepare('SELECT 1 FROM app_users WHERE organization_id = ? LIMIT 1').get(org.id) as { '1': number } | undefined;
    return Boolean(r);
  });

  ipcMain.handle('users:ensure-default-admin', () => {
    const database = getDb();
    if (database) ensureDefaultAdmin(database);
  });

  ipcMain.handle('users:default-admin-created', async () => {
    const database = getDb();
    if (!database) return false;
    const org = database.prepare('SELECT id FROM organizations WHERE is_active = 1 LIMIT 1').get() as { id: string } | undefined;
    if (!org) return false;
    const admin = database.prepare('SELECT id FROM app_users WHERE organization_id = ? AND username = ? AND full_name = ?').get(org.id, 'admin', 'Administrator') as { id: string } | undefined;
    return Boolean(admin);
  });

  ipcMain.handle('floors:get-all', async () => {
    const database = getDb();
    if (!database) return [];
    return database.prepare('SELECT * FROM floors ORDER BY floor_number').all() as Record<string, unknown>[];
  });

  ipcMain.handle('zones:get-all', async (_event, floorId?: string) => {
    const database = getDb();
    if (!database) return [];
    if (floorId) {
      return database.prepare('SELECT z.*, (SELECT COUNT(*) FROM sensors s WHERE s.zone_id = z.id AND s.is_active = 1) as sensor_count FROM zones z WHERE z.floor_id = ? AND z.is_active = 1 ORDER BY z.name').all(floorId) as Record<string, unknown>[];
    }
    return database.prepare('SELECT z.*, (SELECT COUNT(*) FROM sensors s WHERE s.zone_id = z.id AND s.is_active = 1) as sensor_count FROM zones z WHERE z.is_active = 1 ORDER BY z.floor_id, z.name').all() as Record<string, unknown>[];
  });

  ipcMain.handle('floors:update', async (_event, params: { id: string; name?: string; description?: string; userId: string }) => {
    const database = getDb();
    if (!database) return { success: false, error: 'Database not available' };
    try {
      database.prepare('UPDATE floors SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?').run(params.name ?? null, params.description ?? null, params.id);
      auditLog(database, params.userId, 'floor_updated', 'floors', params.id, JSON.stringify({ name: params.name, description: params.description }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('zones:create', async (_event, params: { floorId: string; name: string; zoneType: string; riskLevel?: string; coordinates?: string; userId: string }) => {
    const database = getDb();
    if (!database) return { success: false, error: 'Database not available' };
    try {
      const id = 'zone_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      database.prepare('INSERT INTO zones (id, floor_id, name, zone_type, risk_level_default, coordinates_json) VALUES (?, ?, ?, ?, ?, ?)').run(id, params.floorId, params.name, params.zoneType, params.riskLevel ?? 'low', params.coordinates ?? null);
      auditLog(database, params.userId, 'zone_created', 'zones', id, JSON.stringify({ name: params.name }));
      return { success: true, id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('zones:update', async (_event, params: { id: string; name?: string; zoneType?: string; riskLevel?: string; userId: string }) => {
    const database = getDb();
    if (!database) return { success: false, error: 'Database not available' };
    try {
      database.prepare('UPDATE zones SET name = COALESCE(?, name), zone_type = COALESCE(?, zone_type), risk_level_default = COALESCE(?, risk_level_default) WHERE id = ?').run(params.name ?? null, params.zoneType ?? null, params.riskLevel ?? null, params.id);
      auditLog(database, params.userId, 'zone_updated', 'zones', params.id, null);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('zones:delete', async (_event, params: { id: string; userId: string }) => {
    const database = getDb();
    if (!database) return { success: false, error: 'Database not available' };
    const sensors = database.prepare('SELECT id FROM sensors WHERE zone_id = ? AND is_active = 1 LIMIT 1').get(params.id) as { id: string } | undefined;
    if (sensors) return { success: false, error: 'Zone has active sensors. Remove or deactivate them first.' };
    const incidents = database.prepare('SELECT id FROM incidents WHERE zone_id = ? AND resolved_at IS NULL LIMIT 1').get(params.id) as { id: string } | undefined;
    if (incidents) return { success: false, error: 'Zone has active incidents. Resolve them first.' };
    try {
      database.prepare('UPDATE zones SET is_active = 0 WHERE id = ?').run(params.id);
      auditLog(database, params.userId, 'zone_deleted', 'zones', params.id, null);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('sensors:create', async (_event, params: Record<string, unknown>) => {
    const database = getDb();
    if (!database) return { success: false, error: 'Database not available' };
    try {
      const id = 'sensor_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      const connEnc = params.connectionConfig ? Buffer.from(JSON.stringify(params.connectionConfig)).toString('base64') : null;
      database.prepare(
        `INSERT INTO sensors (id, zone_id, floor_id, name, sensor_type, protocol, connection_config_encrypted, unit, safe_min, safe_max, warning_min, warning_max, danger_min, danger_max, critical_min, critical_max, position_x, position_y) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id, params.zoneId ?? null, params.floorId ?? null, params.name, params.sensorType, params.protocol ?? 'manual', connEnc, params.unit ?? null,
        params.safeMin ?? 0, params.safeMax ?? 100, params.warningMin ?? 0, params.warningMax ?? 100, params.dangerMin ?? 0, params.dangerMax ?? 100, params.criticalMin ?? 0, params.criticalMax ?? 100,
        params.positionX ?? null, params.positionY ?? null
      );
      auditLog(database, (params.userId as string) ?? null, 'sensor_created', 'sensors', id, JSON.stringify({ name: params.name }));
      return { success: true, id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('sensors:update', async (_event, params: { id: string; name?: string; zoneId?: string; positionX?: number; positionY?: number; userId: string }) => {
    const database = getDb();
    if (!database) return { success: false, error: 'Database not available' };
    try {
      database.prepare('UPDATE sensors SET name = COALESCE(?, name), zone_id = COALESCE(?, zone_id), position_x = COALESCE(?, position_x), position_y = COALESCE(?, position_y) WHERE id = ?').run(params.name ?? null, params.zoneId ?? null, params.positionX ?? null, params.positionY ?? null, params.id);
      auditLog(database, params.userId, 'sensor_updated', 'sensors', params.id, null);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('sensors:delete', async (_event, params: { id: string; userId: string }) => {
    const database = getDb();
    if (!database) return { success: false, error: 'Database not available' };
    try {
      database.prepare('UPDATE sensors SET is_active = 0 WHERE id = ?').run(params.id);
      auditLog(database, params.userId, 'sensor_deleted', 'sensors', params.id, null);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('sensors:test-connection', async (_event, sensorId: string) => {
    return { success: false, error: 'Not implemented for this protocol' };
  });

  ipcMain.handle('cameras:create', async (_event, params: Record<string, unknown>) => {
    const database = getDb();
    if (!database) return { success: false, error: 'Database not available' };
    try {
      const id = 'cam_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      const connEnc = (params.username != null || params.password != null) ? Buffer.from(JSON.stringify({ username: params.username, password: params.password })).toString('base64') : null;
      database.prepare(
        'INSERT INTO cameras (id, floor_id, zone_id, name, ip_address, rtsp_url, connection_config_encrypted, position_x, position_y, angle_degrees) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(id, params.floorId, params.zoneId ?? null, params.name, params.ipAddress ?? null, params.rtspUrl ?? null, connEnc, params.positionX ?? null, params.positionY ?? null, params.angleDegrees ?? 0);
      auditLog(database, (params.userId as string) ?? null, 'camera_created', 'cameras', id, JSON.stringify({ name: params.name }));
      return { success: true, id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('cameras:update', async (_event, params: { id: string; name?: string; zoneId?: string; positionX?: number; positionY?: number; angleDegrees?: number; userId: string }) => {
    const database = getDb();
    if (!database) return { success: false, error: 'Database not available' };
    try {
      database.prepare('UPDATE cameras SET name = COALESCE(?, name), zone_id = COALESCE(?, zone_id), position_x = COALESCE(?, position_x), position_y = COALESCE(?, position_y), angle_degrees = COALESCE(?, angle_degrees) WHERE id = ?').run(params.name ?? null, params.zoneId ?? null, params.positionX ?? null, params.positionY ?? null, params.angleDegrees ?? null, params.id);
      auditLog(database, params.userId, 'camera_updated', 'cameras', params.id, null);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('cameras:delete', async (_event, params: { id: string; userId: string }) => {
    const database = getDb();
    if (!database) return { success: false, error: 'Database not available' };
    try {
      database.prepare('UPDATE cameras SET is_active = 0 WHERE id = ?').run(params.id);
      auditLog(database, params.userId, 'camera_deleted', 'cameras', params.id, null);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('cameras:test-connection', async (_event, cameraId: string) => {
    return { success: false, error: 'Not implemented' };
  });

  ipcMain.handle('ppe-rules:update', async (_event, params: { zoneId: string; rules: string; userId: string }) => {
    const database = getDb();
    if (!database) return { success: false, error: 'Database not available' };
    try {
      database.prepare('UPDATE zones SET ppe_rules_json = ? WHERE id = ?').run(params.rules ?? null, params.zoneId);
      auditLog(database, params.userId, 'ppe_rules_updated', 'zones', params.zoneId, null);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('hierarchy:get', async () => {
    const database = getDb();
    if (!database) return { levels: [], contacts: [] };
    const org = database.prepare('SELECT id FROM organizations WHERE is_active = 1 LIMIT 1').get() as { id: string } | undefined;
    if (!org) return { levels: [], contacts: [] };
    const levels = database.prepare('SELECT * FROM alert_hierarchy WHERE organization_id = ? ORDER BY level').all(org.id) as Record<string, unknown>[];
    const contacts: Record<string, unknown>[] = [];
    for (const l of levels) {
      const c = database.prepare('SELECT * FROM alert_contacts WHERE hierarchy_level_id = ? AND is_active = 1').all((l as { id: string }).id) as Record<string, unknown>[];
      contacts.push(...c);
    }
    return { levels, contacts };
  });

  ipcMain.handle('hierarchy:update-level', async (_event, params: { levelId: string; roleName: string; escalationDelaySeconds: number; userId: string }) => {
    const database = getDb();
    if (!database) return { success: false, error: 'Database not available' };
    try {
      database.prepare('UPDATE alert_hierarchy SET role_name = ?, escalation_delay_seconds = ? WHERE id = ?').run(params.roleName, params.escalationDelaySeconds, params.levelId);
      auditLog(database, params.userId, 'hierarchy_updated', 'alert_hierarchy', params.levelId, null);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('hierarchy:add-contact', async (_event, params: { levelId: string; name: string; phone?: string; email?: string; whatsapp?: string; userId: string }) => {
    const database = getDb();
    if (!database) return { success: false, error: 'Database not available' };
    try {
      const id = 'ac_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      database.prepare('INSERT INTO alert_contacts (id, hierarchy_level_id, name, phone, email, whatsapp) VALUES (?, ?, ?, ?, ?, ?)').run(id, params.levelId, params.name, params.phone ?? null, params.email ?? null, params.whatsapp ?? null);
      auditLog(database, params.userId, 'contact_added', 'alert_contacts', id, null);
      return { success: true, id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('hierarchy:remove-contact', async (_event, params: { contactId: string; userId: string }) => {
    const database = getDb();
    if (!database) return { success: false, error: 'Database not available' };
    try {
      database.prepare('UPDATE alert_contacts SET is_active = 0 WHERE id = ?').run(params.contactId);
      auditLog(database, params.userId, 'contact_removed', 'alert_contacts', params.contactId, null);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('system:get-info', async () => {
    const database = getDb();
    if (!database) return null;
    const dbPath = getDbPathPublic();
    let dbSizeBytes = 0;
    try {
      const stat = fs.statSync(dbPath);
      dbSizeBytes = stat.size;
    } catch {
      // ignore
    }
    const incidents = (database.prepare('SELECT COUNT(*) as c FROM incidents').get() as { c: number }).c;
    const sensorReadings = (database.prepare('SELECT COUNT(*) as c FROM sensor_readings').get() as { c: number }).c;
    const auditLogCount = (database.prepare('SELECT COUNT(*) as c FROM audit_log').get() as { c: number }).c;
    const engineState = (await import('../engine/safety-engine')).safetyEngine.getState();
    return {
      appVersion: app.getVersion(),
      nodeVersion: process.version,
      platform: process.platform,
      dbPath,
      dbSizeBytes,
      totalRecords: { incidents, sensorReadings, auditLog: auditLogCount },
      engineStatus: engineState,
    };
  });

  ipcMain.handle('system:clear-old-data', async (_event, params: { olderThanDays: number; tables: string[]; userId: string }) => {
    return { success: false, error: 'Verify password first via users:verify-password' };
  });

  ipcMain.handle('system:export-database', async () => {
    const database = getDb();
    if (!database) return { success: false, path: '', error: 'Database not available' };
    const src = getDbPathPublic();
    const date = new Date().toISOString().slice(0, 10);
    const destDir = app.getPath('downloads');
    const dest = path.join(destDir, 'advancesafe-backup-' + date + '.db');
    try {
      fs.copyFileSync(src, dest);
      return { success: true, path: dest };
    } catch (err) {
      return { success: false, path: '', error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('audit-log:get', async (_event, params: { limit?: number; offset?: number; action?: string; from?: string; to?: string }) => {
    const database = getDb();
    if (!database) return [];
    const limit = Math.min(100, Math.max(1, params?.limit ?? 100));
    const offset = Math.max(0, params?.offset ?? 0);
    let sql = 'SELECT * FROM audit_log WHERE 1=1';
    const values: unknown[] = [];
    if (params?.action) {
      sql += ' AND action LIKE ?';
      values.push('%' + String(params.action).replace(/[%_]/g, '') + '%');
    }
    if (params?.from) {
      sql += ' AND performed_at >= ?';
      values.push(params.from);
    }
    if (params?.to) {
      sql += ' AND performed_at <= ?';
      values.push(params.to);
    }
    sql += ' ORDER BY performed_at DESC LIMIT ? OFFSET ?';
    values.push(limit, offset);
    return database.prepare(sql).all(...values) as Record<string, unknown>[];
  });
}
