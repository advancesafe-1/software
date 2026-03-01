export type SensorStatus = 'safe' | 'warning' | 'danger' | 'critical';

export type ZoneStatus = 'safe' | 'warning' | 'danger' | 'critical';

export interface SensorThreshold {
  safeMin: number;
  safeMax: number;
  warningMin: number;
  warningMax: number;
  dangerMin: number;
  dangerMax: number;
  criticalMin: number;
  criticalMax: number;
}

export interface SensorReading {
  sensorId: string;
  sensorName: string;
  sensorType: string;
  value: number;
  unit: string;
  status: SensorStatus;
  threshold: SensorThreshold;
  scoreContribution: number;
  recordedAt: string;
}

export interface ZoneScore {
  zoneId: string;
  zoneName: string;
  floorId: string;
  score: number;
  status: ZoneStatus;
  components: {
    sensorScore: number;
    ppeScore: number;
    incidentScore: number;
    workerScore: number;
    responseTimeScore: number;
  };
  sensorReadings: SensorReading[];
  worstSensor: SensorReading | null;
  calculatedAt: string;
}

export interface FloorScore {
  floorId: string;
  floorName: string;
  score: number;
  status: ZoneStatus;
  zones: ZoneScore[];
  calculatedAt: string;
}

export interface OrganizationScore {
  organizationId: string;
  overallScore: number;
  status: ZoneStatus;
  floors: FloorScore[];
  activeAlerts: number;
  criticalZones: number;
  calculatedAt: string;
}

export type AlertType = 'sensor_breach' | 'critical_score' | 'sensor_offline' | 'manual';

export type AlertSeverity = 'warning' | 'danger' | 'critical';

export interface AlertEvent {
  alertId: string;
  incidentId: string;
  zoneId: string;
  zoneName: string;
  floorName: string;
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  sensorId?: string;
  sensorName?: string;
  sensorValue?: number;
  sensorUnit?: string;
  threshold?: number;
  triggeredAt: string;
  requiresAcknowledgment: boolean;
}

export interface EscalationTimer {
  incidentId: string;
  currentLevel: number;
  maxLevel: number;
  nextEscalationAt: number;
  timerId: ReturnType<typeof setTimeout>;
}

export interface EngineState {
  isRunning: boolean;
  organizationId: string | null;
  lastCalculatedAt: string | null;
  activeIncidents: number;
  sensorsMonitored: number;
  zonesMonitored: number;
  simulationMode: boolean;
  overallScore: number | null;
  overallStatus: string | null;
}

export interface RawSensorReading {
  sensorId: string;
  value: number;
  unit: string;
  timestamp: string;
}
