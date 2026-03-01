import type { SyncPriority } from './sync-types';

export const SYNC_INTERVALS = {
  liveStatus: 15_000,
  incidents: 15_000,
  guardianScores: 60_000,
  sensorReadings: 60_000,
  workers: 300_000,
  historical: 300_000,
} as const;

export const SYNC_BATCH_SIZE = 50;

export const SENSOR_READINGS_RETENTION_DAYS = 7;

export const CONNECTIVITY_CHECK_URL = 'https://www.google.com';
export const CONNECTIVITY_TIMEOUT_MS = 3000;

export const MAX_SYNC_RETRIES = 5;

export const TABLE_PRIORITIES: Record<string, SyncPriority> = {
  incidents: 'critical',
  alert_log: 'high',
  guardian_scores: 'high',
  sensor_readings: 'normal',
  workers: 'normal',
  worker_checkins: 'low',
  audit_log: 'low',
};
