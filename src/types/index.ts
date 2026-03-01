export type SensorStatus = 'safe' | 'warning' | 'danger' | 'critical';

export type ZoneType =
  | 'chemical'
  | 'assembly'
  | 'boiler'
  | 'office'
  | 'storage'
  | 'warehouse'
  | 'other';

export type IncidentType =
  | 'sensor_breach'
  | 'ppe_violation'
  | 'worker_sos'
  | 'manual';

export type AlertChannel = 'sms' | 'whatsapp' | 'push' | 'local' | 'email';

export interface Organization {
  id: string;
  license_key: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  industry_type: string | null;
  total_workers: number;
  gst_number: string | null;
  primary_contact_name: string | null;
  primary_contact_phone: string | null;
  primary_contact_email: string | null;
  is_active: number;
  created_at: string;
  activated_at: string | null;
  last_sync_at: string | null;
}

export interface Floor {
  id: string;
  organization_id: string;
  name: string;
  floor_number: number;
  description: string | null;
  floor_plan_image_path: string | null;
  floor_plan_processed_path: string | null;
  width_meters: number | null;
  length_meters: number | null;
  created_at: string;
}

export interface Zone {
  id: string;
  floor_id: string;
  name: string;
  zone_type: ZoneType;
  coordinates_json: string | null;
  ppe_rules_json: string | null;
  risk_level_default: string;
  created_at: string;
}

export interface Sensor {
  id: string;
  zone_id: string | null;
  floor_id: string | null;
  name: string;
  sensor_type: string;
  protocol: string;
  connection_config_encrypted: string | null;
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
  created_at: string;
}

export interface SensorReading {
  id: string;
  sensor_id: string;
  value: number;
  unit: string | null;
  status: SensorStatus;
  recorded_at: string;
  synced_to_cloud: number;
}

export interface GuardianScore {
  id: string;
  zone_id: string | null;
  score: number;
  sensor_score: number | null;
  ppe_score: number | null;
  incident_score: number | null;
  worker_score: number | null;
  response_time_score: number | null;
  status: SensorStatus;
  calculated_at: string;
  synced_to_cloud: number;
}

export interface Incident {
  id: string;
  zone_id: string | null;
  incident_type: IncidentType;
  severity: string;
  title: string;
  description: string | null;
  sensor_id: string | null;
  triggered_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  synced_to_cloud: number;
}

export interface AlertHierarchy {
  id: string;
  organization_id: string;
  level: number;
  role_name: string;
  escalation_delay_seconds: number;
  created_at: string;
}

export interface AlertContact {
  id: string;
  hierarchy_level_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  is_active: number;
  created_at: string;
}

export interface Worker {
  id: string;
  organization_id: string;
  employee_id: string;
  name: string;
  role: string | null;
  department: string | null;
  phone: string | null;
  is_contract_worker: number;
  contractor_company: string | null;
  qr_code: string | null;
  language_preference: string;
  is_active: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_value_json: string | null;
  new_value_json: string | null;
  performed_at: string;
  synced_to_cloud: number;
}

export interface SystemConfig {
  id: string;
  key: string;
  value_encrypted: string | null;
  last_updated_at: string;
  source: string;
}

export type AppRole = 'super_admin' | 'admin' | 'plant_head' | 'manager' | 'supervisor' | 'view_only';

export interface CurrentUser {
  id: string;
  username?: string;
  name: string;
  fullName?: string;
  role: string;
}

export type SystemStatus = 'nominal' | 'warning' | 'critical';

export interface AppState {
  organization: Organization | null;
  currentUser: CurrentUser | null;
  onboardingComplete: boolean;
  isOnline: boolean;
  isOfflineMode: boolean;
  activeIncidents: Incident[];
  systemStatus: SystemStatus;
  networkLatency: number;
  dataStreamOk: boolean;
  aiAgentActive: boolean;
}

// Engine IPC types (mirror electron/engine/engine-types for renderer)
export type ZoneStatus = 'safe' | 'warning' | 'danger' | 'critical';

export interface EngineSensorThreshold {
  safeMin: number;
  safeMax: number;
  warningMin: number;
  warningMax: number;
  dangerMin: number;
  dangerMax: number;
  criticalMin: number;
  criticalMax: number;
}

export interface EngineSensorReading {
  sensorId: string;
  sensorName: string;
  sensorType: string;
  value: number;
  unit: string;
  status: SensorStatus;
  threshold: EngineSensorThreshold;
  scoreContribution: number;
  recordedAt: string;
}

export interface EngineZoneScore {
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
  sensorReadings: EngineSensorReading[];
  worstSensor: EngineSensorReading | null;
  calculatedAt: string;
}

export interface EngineFloorScore {
  floorId: string;
  floorName: string;
  score: number;
  status: ZoneStatus;
  zones: EngineZoneScore[];
  calculatedAt: string;
}

export interface EngineOrganizationScore {
  organizationId: string;
  overallScore: number;
  status: ZoneStatus;
  floors: EngineFloorScore[];
  activeAlerts: number;
  criticalZones: number;
  calculatedAt: string;
}

export type EngineAlertType = 'sensor_breach' | 'critical_score' | 'sensor_offline' | 'manual';
export type EngineAlertSeverity = 'warning' | 'danger' | 'critical';

export interface EngineAlertEvent {
  alertId: string;
  incidentId: string;
  zoneId: string;
  zoneName: string;
  floorName: string;
  alertType: EngineAlertType;
  severity: EngineAlertSeverity;
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

export interface EngineState {
  isRunning: boolean;
  organizationId: string | null;
  lastCalculatedAt: string | null;
  activeIncidents: number;
  sensorsMonitored: number;
  zonesMonitored: number;
  simulationMode: boolean;
}
