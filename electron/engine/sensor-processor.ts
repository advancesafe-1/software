import type { SensorReading, SensorThreshold, RawSensorReading } from './engine-types';
import type Database from 'better-sqlite3';

type Db = InstanceType<typeof Database>;
import { calculateSensorStatus, calculateSensorScore } from './score-calculator';
import { syncEngine } from '../sync/sync-engine';

const SENSOR_TYPE_NORMALIZED: Record<string, string> = {
  'Gas — H2S': 'h2s_gas',
  'Gas — CO': 'co_gas',
  'Oxygen Level': 'oxygen_level',
  Temperature: 'temperature',
  'Noise Level': 'noise_level',
};

function getSensorTypeKey(sensorType: string): string {
  return SENSOR_TYPE_NORMALIZED[sensorType] ?? sensorType.toLowerCase().replace(/\s+/g, '_');
}

function parseTimestamp(ts: string): number {
  const d = new Date(ts);
  return d.getTime();
}

function isValidTimestamp(ts: string): boolean {
  const n = parseTimestamp(ts);
  return !Number.isNaN(n) && n > 0 && n <= Date.now() + 60000;
}

export interface SensorConfig {
  id: string;
  name: string;
  sensor_type: string;
  zone_id: string | null;
  floor_id: string | null;
  unit: string | null;
  safe_min: number | null;
  safe_max: number | null;
  warning_min: number | null;
  warning_max: number | null;
  danger_min: number | null;
  danger_max: number | null;
  critical_min: number | null;
  critical_max: number | null;
}

function buildThreshold(row: SensorConfig): SensorThreshold {
  return {
    safeMin: row.safe_min ?? 0,
    safeMax: row.safe_max ?? 100,
    warningMin: row.warning_min ?? 0,
    warningMax: row.warning_max ?? 100,
    dangerMin: row.danger_min ?? 0,
    dangerMax: row.danger_max ?? 100,
    criticalMin: row.critical_min ?? 0,
    criticalMax: row.critical_max ?? 100,
  };
}

export interface ProcessSensorReadingResult {
  reading: SensorReading | null;
  shouldAlert: boolean;
}

export function processSensorReading(
  db: Db,
  raw: RawSensorReading,
  onReading: (reading: SensorReading) => void,
  onAlert: (reading: SensorReading) => void
): ProcessSensorReadingResult | null {
  try {
    if (
      typeof raw.sensorId !== 'string' ||
      raw.sensorId.trim() === '' ||
      typeof raw.value !== 'number' ||
      !Number.isFinite(raw.value) ||
      Number.isNaN(raw.value) ||
      raw.value === Infinity ||
      raw.value === -Infinity
    ) {
      return null;
    }
    if (typeof raw.unit !== 'string') raw.unit = '';
    if (typeof raw.timestamp !== 'string' || !isValidTimestamp(raw.timestamp)) {
      raw.timestamp = new Date().toISOString();
    }

    const row = db.prepare(
      `SELECT id, name, sensor_type, zone_id, floor_id, unit,
       safe_min, safe_max, warning_min, warning_max,
       danger_min, danger_max, critical_min, critical_max
       FROM sensors WHERE id = ? AND is_active = 1`
    ).get(raw.sensorId) as SensorConfig | undefined;

    if (!row) return null;

    const threshold = buildThreshold(row);
    const sensorTypeKey = getSensorTypeKey(row.sensor_type);
    const status = calculateSensorStatus(raw.value, threshold, sensorTypeKey);
    const scoreContribution = calculateSensorScore(raw.value, threshold, sensorTypeKey);

    const reading: SensorReading = {
      sensorId: row.id,
      sensorName: row.name,
      sensorType: row.sensor_type,
      value: raw.value,
      unit: raw.unit || row.unit || '',
      status,
      threshold,
      scoreContribution,
      recordedAt: raw.timestamp,
    };

    const readingId = 'sr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
    db.prepare(
      `INSERT INTO sensor_readings (id, sensor_id, value, unit, status, recorded_at, synced_to_cloud)
       VALUES (?, ?, ?, ?, ?, ?, 0)`
    ).run(readingId, raw.sensorId, raw.value, raw.unit || null, status, raw.timestamp);

    syncEngine.onSensorReading({
      id: readingId,
      sensor_id: raw.sensorId,
      value: raw.value,
      unit: raw.unit || null,
      status,
      recorded_at: raw.timestamp,
    });

    try {
      db.prepare(
        `INSERT INTO audit_log (id, action, entity_type, entity_id, new_value_json, performed_at, synced_to_cloud)
         VALUES (lower(hex(randomblob(16))), 'sensor_reading', 'sensor_readings', ?, ?, datetime('now'), 0)`
      ).run(raw.sensorId, JSON.stringify({ value: raw.value, status }));
    } catch {
      // ignore audit failure
    }

    onReading(reading);

    const shouldAlert = status === 'warning' || status === 'danger' || status === 'critical';
    if (shouldAlert) {
      onAlert(reading);
    }

    return { reading, shouldAlert };
  } catch {
    return null;
  }
}
