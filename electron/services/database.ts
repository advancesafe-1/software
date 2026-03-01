import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let db: Database.Database | null = null;

function getDbPath(): string {
  const userData = app.getPath('userData');
  const dbDir = path.join(userData, 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return path.join(dbDir, 'advancesafe.db');
}

export function deriveEncryptionKey(hardwareId: string): Buffer {
  const salt = 'ADVANCESAFE_SALT_2024';
  return createHash('sha256').update(hardwareId + salt).digest();
}

export function initDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const dbPath = getDbPath();
      db = new Database(dbPath);
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
      runSchema();
      resolve();
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

function runSchema(): void {
  if (!db) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      license_key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      city TEXT,
      state TEXT,
      industry_type TEXT,
      total_workers INTEGER DEFAULT 0,
      gst_number TEXT,
      primary_contact_name TEXT,
      primary_contact_phone TEXT,
      primary_contact_email TEXT,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      activated_at TEXT,
      last_sync_at TEXT
    );

    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      is_active INTEGER DEFAULT 1,
      failed_attempts INTEGER DEFAULT 0,
      locked_until TEXT,
      last_login_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      created_by TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_username_org ON app_users(username, organization_id);

    CREATE TABLE IF NOT EXISTS floors (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      name TEXT NOT NULL,
      floor_number INTEGER NOT NULL,
      description TEXT,
      floor_plan_image_path TEXT,
      floor_plan_processed_path TEXT,
      width_meters REAL,
      length_meters REAL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS zones (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      floor_id TEXT NOT NULL REFERENCES floors(id),
      name TEXT NOT NULL,
      zone_type TEXT NOT NULL,
      coordinates_json TEXT,
      ppe_rules_json TEXT,
      risk_level_default TEXT DEFAULT 'low',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sensors (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      zone_id TEXT REFERENCES zones(id),
      floor_id TEXT REFERENCES floors(id),
      name TEXT NOT NULL,
      sensor_type TEXT NOT NULL,
      protocol TEXT NOT NULL,
      connection_config_encrypted TEXT,
      unit TEXT,
      safe_min REAL, safe_max REAL,
      warning_min REAL, warning_max REAL,
      danger_min REAL, danger_max REAL,
      critical_min REAL, critical_max REAL,
      position_x REAL, position_y REAL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cameras (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      floor_id TEXT NOT NULL REFERENCES floors(id),
      zone_id TEXT REFERENCES zones(id),
      name TEXT NOT NULL,
      ip_address TEXT,
      rtsp_url TEXT,
      connection_config_encrypted TEXT,
      position_x REAL,
      position_y REAL,
      angle_degrees REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      last_seen_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sensor_readings (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      sensor_id TEXT NOT NULL REFERENCES sensors(id),
      value REAL NOT NULL,
      unit TEXT,
      status TEXT NOT NULL,
      recorded_at TEXT DEFAULT (datetime('now')),
      synced_to_cloud INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS guardian_scores (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      zone_id TEXT REFERENCES zones(id),
      score REAL NOT NULL,
      sensor_score REAL,
      ppe_score REAL,
      incident_score REAL,
      worker_score REAL,
      response_time_score REAL,
      status TEXT NOT NULL,
      calculated_at TEXT DEFAULT (datetime('now')),
      synced_to_cloud INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      zone_id TEXT REFERENCES zones(id),
      incident_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      sensor_id TEXT REFERENCES sensors(id),
      triggered_at TEXT DEFAULT (datetime('now')),
      acknowledged_at TEXT,
      acknowledged_by TEXT,
      resolved_at TEXT,
      resolved_by TEXT,
      resolution_notes TEXT,
      synced_to_cloud INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS alert_hierarchy (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      level INTEGER NOT NULL,
      role_name TEXT NOT NULL,
      escalation_delay_seconds INTEGER DEFAULT 180,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alert_contacts (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      hierarchy_level_id TEXT NOT NULL REFERENCES alert_hierarchy(id),
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      whatsapp TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workers (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      employee_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT,
      department TEXT,
      phone TEXT,
      is_contract_worker INTEGER DEFAULT 0,
      contractor_company TEXT,
      qr_code TEXT,
      language_preference TEXT DEFAULT 'en',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS worker_checkins (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      worker_id TEXT NOT NULL REFERENCES workers(id),
      zone_id TEXT NOT NULL REFERENCES zones(id),
      checked_in_at TEXT DEFAULT (datetime('now')),
      checked_out_at TEXT,
      checkin_method TEXT DEFAULT 'manual',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      old_value_json TEXT,
      new_value_json TEXT,
      performed_at TEXT DEFAULT (datetime('now')),
      synced_to_cloud INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS system_config (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      key TEXT UNIQUE NOT NULL,
      value_encrypted TEXT,
      last_updated_at TEXT DEFAULT (datetime('now')),
      source TEXT DEFAULT 'local'
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      priority TEXT DEFAULT 'normal',
      attempts INTEGER DEFAULT 0,
      last_attempt_at TEXT,
      synced_at TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sync_queue_status_priority ON sync_queue(status, priority);

    CREATE TABLE IF NOT EXISTS alert_delivery_queue (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      incident_id TEXT NOT NULL REFERENCES incidents(id),
      hierarchy_level INTEGER NOT NULL,
      contact_id TEXT NOT NULL REFERENCES alert_contacts(id),
      channel TEXT NOT NULL,
      message_body TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      last_attempt_at TEXT,
      delivered_at TEXT,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alert_log (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      delivery_queue_id TEXT REFERENCES alert_delivery_queue(id),
      incident_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      contact_id TEXT,
      status TEXT NOT NULL,
      attempted_at TEXT DEFAULT (datetime('now')),
      delivered_at TEXT,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_id ON sensor_readings(sensor_id, recorded_at DESC);
    CREATE INDEX IF NOT EXISTS idx_incidents_zone_id ON incidents(zone_id, triggered_at DESC);
    CREATE INDEX IF NOT EXISTS idx_guardian_scores_zone_id ON guardian_scores(zone_id, calculated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_worker_checkins_worker_id ON worker_checkins(worker_id, checked_in_at DESC);
    CREATE INDEX IF NOT EXISTS idx_delivery_queue_status ON alert_delivery_queue(status, created_at);
  `);
  migrateSchema();
}

function migrateSchema(): void {
  if (!db) return;
  const alter = (sql: string) => {
    try {
      db!.exec(sql);
    } catch {
      // column/table may already exist
    }
  };
  alter('ALTER TABLE organizations ADD COLUMN emergency_contact_name TEXT');
  alter('ALTER TABLE organizations ADD COLUMN emergency_contact_phone TEXT');
  alter('ALTER TABLE zones ADD COLUMN is_active INTEGER DEFAULT 1');
  alter('ALTER TABLE cameras ADD COLUMN rtsp_url TEXT');
  alter('ALTER TABLE cameras ADD COLUMN connection_config_encrypted TEXT');
}

export function getDb(): Database.Database | null {
  return db;
}

export function getDbPathForInfo(): string {
  return getDbPath();
}

export function getDbPathPublic(): string {
  return getDbPath();
}

export function closeDatabase(): Promise<void> {
  return new Promise((resolve) => {
    if (db) {
      db.close();
      db = null;
    }
    resolve();
  });
}
