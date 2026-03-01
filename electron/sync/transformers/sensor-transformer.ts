export interface SensorReadingRow {
  id: string;
  sensor_id: string;
  value: number;
  unit: string | null;
  status: string;
  recorded_at: string;
}

export function transformReading(row: SensorReadingRow): Record<string, unknown> {
  return {
    id: row.id,
    sensorId: row.sensor_id,
    value: row.value,
    unit: row.unit ?? null,
    status: row.status,
    recordedAt: row.recorded_at,
  };
}

export interface SensorConfigRow {
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
  position_x: number | null;
  position_y: number | null;
  is_active: number;
}

export function transformSensorConfig(row: SensorConfigRow): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    sensorType: row.sensor_type,
    zoneId: row.zone_id ?? null,
    floorId: row.floor_id ?? null,
    unit: row.unit ?? null,
    safeMin: row.safe_min ?? null,
    safeMax: row.safe_max ?? null,
    warningMin: row.warning_min ?? null,
    warningMax: row.warning_max ?? null,
    dangerMin: row.danger_min ?? null,
    dangerMax: row.danger_max ?? null,
    criticalMin: row.critical_min ?? null,
    criticalMax: row.critical_max ?? null,
    positionX: row.position_x ?? null,
    positionY: row.position_y ?? null,
    isActive: Boolean(row.is_active),
  };
}
