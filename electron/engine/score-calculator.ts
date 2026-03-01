import type { SensorStatus, ZoneStatus, SensorReading, ZoneScore, FloorScore, OrganizationScore } from './engine-types';
import type Database from 'better-sqlite3';

type Db = InstanceType<typeof Database>;
import {
  SCORE_BOUNDARIES,
  SCORE_WEIGHTS,
  WORST_SENSOR_WEIGHT,
  AVERAGE_SENSOR_WEIGHT,
  DEFAULT_PPE_SCORE,
  INCIDENT_DECAY_HOURS,
  INCIDENT_SEVERITY_DEDUCTION,
  LOW_BAD_SENSOR_TYPES,
} from './engine-constants';
import type { SensorThreshold } from './engine-types';

export function calculateSensorStatus(
  value: number,
  threshold: SensorThreshold,
  sensorType: string
): SensorStatus {
  const isLowBad = LOW_BAD_SENSOR_TYPES.some(
    (t) => sensorType.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase() === sensorType.toLowerCase()
  );
  if (isLowBad) {
    if (value >= threshold.safeMin && value <= threshold.safeMax) return 'safe';
    if (value >= threshold.warningMin) return 'warning';
    if (value >= threshold.dangerMin) return 'danger';
    return 'critical';
  }
  if (value >= threshold.safeMin && value <= threshold.safeMax) return 'safe';
  if (value <= threshold.warningMax) return 'warning';
  if (value <= threshold.dangerMax) return 'danger';
  return 'critical';
}

function interpolate(score: number, min: number, max: number): number {
  const range = max - min;
  if (range <= 0) return min;
  return Math.max(min, Math.min(max, min + (score / 100) * range));
}

export function calculateSensorScore(
  value: number,
  threshold: SensorThreshold,
  sensorType: string
): number {
  const status = calculateSensorStatus(value, threshold, sensorType);
  const base = { safe: 92.5, warning: 74.5, danger: 49.5, critical: 17 }[status];
  const spread = { safe: 15, warning: 19, danger: 29, critical: 17 }[status];
  const min = base - spread / 2;
  const max = base + spread / 2;
  let t = 0.5;
  const isLowBad = LOW_BAD_SENSOR_TYPES.some(
    (t) => sensorType.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase() === sensorType.toLowerCase()
  );
  if (isLowBad) {
    if (status === 'safe') t = (value - threshold.safeMin) / (threshold.safeMax - threshold.safeMin + 1e-9);
    else if (status === 'warning') t = (value - threshold.warningMin) / (threshold.warningMax - threshold.warningMin + 1e-9);
    else if (status === 'danger') t = (value - threshold.dangerMin) / (threshold.dangerMax - threshold.dangerMin + 1e-9);
    else t = value / (threshold.criticalMax + 1e-9);
  } else {
    if (status === 'safe') t = (value - threshold.safeMin) / (threshold.safeMax - threshold.safeMin + 1e-9);
    else if (status === 'warning') t = (value - threshold.warningMin) / (threshold.warningMax - threshold.warningMin + 1e-9);
    else if (status === 'danger') t = (value - threshold.dangerMin) / (threshold.dangerMax - threshold.dangerMin + 1e-9);
    else t = (value - threshold.criticalMin) / (threshold.criticalMax - threshold.criticalMin + 1e-9);
  }
  t = Math.max(0, Math.min(1, t));
  return Math.round(interpolate(t * 100, min, max));
}

export function calculateZoneSensorScore(readings: SensorReading[]): number {
  if (readings.length === 0) return 100;
  const scores = readings.map((r) => r.scoreContribution);
  const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const worstScore = Math.min(...scores);
  return Math.round(averageScore * AVERAGE_SENSOR_WEIGHT + worstScore * WORST_SENSOR_WEIGHT);
}

export function scoreToStatus(score: number): ZoneStatus {
  if (score >= SCORE_BOUNDARIES.safe.min) return 'safe';
  if (score >= SCORE_BOUNDARIES.warning.min) return 'warning';
  if (score >= SCORE_BOUNDARIES.danger.min) return 'danger';
  return 'critical';
}

export function calculateIncidentScore(zoneId: string, db: Db): number {
  try {
    let score = 100;
    const unresolved = db
      .prepare(
        `SELECT severity FROM incidents WHERE zone_id = ? AND resolved_at IS NULL`
      )
      .all(zoneId) as { severity: string }[];
    for (const row of unresolved) {
      const ded = INCIDENT_SEVERITY_DEDUCTION[row.severity as keyof typeof INCIDENT_SEVERITY_DEDUCTION] ?? 10;
      score -= ded;
    }
    const resolved = db
      .prepare(
        `SELECT severity, resolved_at FROM incidents WHERE zone_id = ? AND resolved_at IS NOT NULL AND datetime(resolved_at) >= datetime('now', ?)`
      )
      .all(zoneId, `-${INCIDENT_DECAY_HOURS} hours`) as { severity: string; resolved_at: string }[];
    const now = Date.now();
    for (const row of resolved) {
      const hoursAgo = (now - new Date(row.resolved_at).getTime()) / (1000 * 60 * 60);
      const decay = 1 - hoursAgo / INCIDENT_DECAY_HOURS;
      const ded = (INCIDENT_SEVERITY_DEDUCTION[row.severity as keyof typeof INCIDENT_SEVERITY_DEDUCTION] ?? 10) * decay;
      score -= ded;
    }
    return Math.max(0, Math.min(100, Math.round(score)));
  } catch {
    return 100;
  }
}

export function calculateZoneScore(
  zoneId: string,
  zoneName: string,
  floorId: string,
  readings: SensorReading[],
  db: Db
): ZoneScore {
  const sensorScore = calculateZoneSensorScore(readings);
  const ppeScore = DEFAULT_PPE_SCORE;
  const incidentScore = calculateIncidentScore(zoneId, db);
  const workerScore = 100;
  const responseTimeScore = calculateResponseTimeScore(zoneId, db);
  const finalScore =
    sensorScore * SCORE_WEIGHTS.sensor +
    ppeScore * SCORE_WEIGHTS.ppe +
    incidentScore * SCORE_WEIGHTS.incident +
    workerScore * SCORE_WEIGHTS.worker +
    responseTimeScore * SCORE_WEIGHTS.responseTime;
  const status = scoreToStatus(finalScore);
  const worstSensor = readings.length === 0 ? null : readings.reduce((worst, r) => (r.scoreContribution < (worst?.scoreContribution ?? 101) ? r : worst));
  return {
    zoneId,
    zoneName,
    floorId,
    score: Math.round(finalScore * 10) / 10,
    status,
    components: { sensorScore, ppeScore, incidentScore, workerScore, responseTimeScore },
    sensorReadings: readings,
    worstSensor,
    calculatedAt: new Date().toISOString(),
  };
}

export function calculateResponseTimeScore(zoneId: string, db: Db): number {
  try {
    const rows = db
      .prepare(
        `SELECT acknowledged_at, triggered_at FROM incidents WHERE zone_id = ? AND acknowledged_at IS NOT NULL ORDER BY triggered_at DESC LIMIT 10`
      )
      .all(zoneId) as { acknowledged_at: string; triggered_at: string }[];
    if (rows.length === 0) return 100;
    let totalMinutes = 0;
    for (const row of rows) {
      const ack = new Date(row.acknowledged_at).getTime();
      const trig = new Date(row.triggered_at).getTime();
      totalMinutes += (ack - trig) / (1000 * 60);
    }
    const avgMinutes = totalMinutes / rows.length;
    if (avgMinutes <= 2) return 100;
    if (avgMinutes <= 5) return 90;
    if (avgMinutes <= 10) return 75;
    if (avgMinutes <= 30) return 60;
    return Math.max(0, 60 - Math.floor(avgMinutes / 10));
  } catch {
    return 100;
  }
}

export function calculateFloorScore(
  floor: { floorId: string; floorName: string },
  zoneScores: ZoneScore[]
): FloorScore {
  const score = zoneScores.length === 0 ? 100 : zoneScores.reduce((s, z) => s + z.score, 0) / zoneScores.length;
  const statusOrder: ZoneStatus[] = ['safe', 'warning', 'danger', 'critical'];
  const worstStatus = zoneScores.reduce<ZoneStatus>((worst, z) => {
    return statusOrder.indexOf(z.status) > statusOrder.indexOf(worst) ? z.status : worst;
  }, 'safe');
  return {
    floorId: floor.floorId,
    floorName: floor.floorName,
    score: Math.round(score * 10) / 10,
    status: zoneScores.length === 0 ? 'safe' : worstStatus,
    zones: zoneScores,
    calculatedAt: new Date().toISOString(),
  };
}

export function calculateOrgScore(
  organizationId: string,
  floors: FloorScore[],
  activeAlerts: number,
  criticalZones: number
): OrganizationScore {
  const score = floors.length === 0 ? 100 : floors.reduce((s, f) => s + f.score, 0) / floors.length;
  const statusOrder: ZoneStatus[] = ['safe', 'warning', 'danger', 'critical'];
  const worstStatus = floors.reduce<ZoneStatus>((worst, f) => {
    return statusOrder.indexOf(f.status) > statusOrder.indexOf(worst) ? f.status : worst;
  }, 'safe');
  return {
    organizationId,
    overallScore: Math.round(score * 10) / 10,
    status: floors.length === 0 ? 'safe' : worstStatus,
    floors,
    activeAlerts,
    criticalZones,
    calculatedAt: new Date().toISOString(),
  };
}
