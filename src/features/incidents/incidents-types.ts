export type IncidentStatusFilter = 'all' | 'active' | 'acknowledged' | 'resolved';

export interface IncidentRow {
  id: string;
  zone_id: string | null;
  incident_type: string;
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
  zone_name: string | null;
  floor_name: string | null;
  sensor_name: string | null;
  sensor_type: string | null;
}

export interface IncidentCounts {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  critical: number;
  danger: number;
  warning: number;
  todayCount: number;
  weekCount: number;
}
