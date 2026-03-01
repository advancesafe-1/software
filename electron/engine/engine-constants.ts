export const SCORE_WEIGHTS = {
  sensor: 0.4,
  ppe: 0.25,
  incident: 0.15,
  worker: 0.1,
  responseTime: 0.1,
} as const;

export const SCORE_BOUNDARIES = {
  safe: { min: 85, max: 100 },
  warning: { min: 65, max: 84 },
  danger: { min: 40, max: 64 },
  critical: { min: 0, max: 39 },
} as const;

export const SCORE_INTERVAL_MS = 30_000;

export const SIMULATION_INTERVAL_MS = 5_000;

export const WORST_SENSOR_WEIGHT = 0.3;
export const AVERAGE_SENSOR_WEIGHT = 0.7;

export const DEFAULT_PPE_SCORE = 85;

export const INCIDENT_DECAY_HOURS = 24;

export const IPC_EVENTS = {
  SCORE_UPDATE: 'engine:score-update',
  ALERT_FIRED: 'engine:alert-fired',
  ALERT_ESCALATED: 'engine:alert-escalated',
  SENSOR_READING: 'engine:sensor-reading',
  ENGINE_STATUS: 'engine:status',
  INCIDENT_RESOLVED: 'engine:incident-resolved',
  ACKNOWLEDGE_ALERT: 'engine:acknowledge-alert',
  RESOLVE_INCIDENT: 'engine:resolve-incident',
  GET_ENGINE_STATE: 'engine:get-state',
  GET_ZONE_HISTORY: 'engine:get-zone-history',
  SET_SIMULATION_MODE: 'engine:set-simulation-mode',
} as const;

export const SENSOR_STATUS_SCORES = {
  safe: 100,
  warning: 65,
  danger: 35,
  critical: 0,
} as const;

export const INCIDENT_SEVERITY_DEDUCTION = {
  warning: 5,
  danger: 15,
  critical: 30,
} as const;

export const LOW_BAD_SENSOR_TYPES = ['oxygen_level', 'Oxygen Level', 'O2'];
