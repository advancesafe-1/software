export interface IncidentRow {
  id: string;
  zone_id: string | null;
  zone_name?: string | null;
  floor_name?: string | null;
  incident_type: string;
  severity: string;
  title: string;
  description: string | null;
  sensor_id: string | null;
  sensor_name?: string | null;
  triggered_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
}

export function transformIncident(row: IncidentRow): Record<string, unknown> {
  const status = row.resolved_at ? 'resolved' : row.acknowledged_at ? 'acknowledged' : 'active';
  return {
    id: row.id,
    zoneId: row.zone_id ?? null,
    zoneName: row.zone_name ?? null,
    floorName: row.floor_name ?? null,
    incidentType: row.incident_type,
    severity: row.severity,
    title: row.title,
    description: row.description ?? null,
    sensorId: row.sensor_id ?? null,
    sensorName: row.sensor_name ?? null,
    triggeredAt: row.triggered_at,
    acknowledgedAt: row.acknowledged_at ?? null,
    acknowledgedBy: row.acknowledged_by ?? null,
    resolvedAt: row.resolved_at ?? null,
    resolvedBy: row.resolved_by ?? null,
    resolutionNotes: row.resolution_notes ?? null,
    status,
  };
}
