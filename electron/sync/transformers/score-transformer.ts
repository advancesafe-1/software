export interface GuardianScoreRow {
  id: string;
  zone_id: string | null;
  score: number;
  sensor_score: number | null;
  ppe_score: number | null;
  incident_score: number | null;
  worker_score: number | null;
  response_time_score: number | null;
  status: string;
  calculated_at: string;
}

export function transformScore(row: GuardianScoreRow): Record<string, unknown> {
  return {
    id: row.id,
    zoneId: row.zone_id ?? null,
    score: row.score,
    sensorScore: row.sensor_score ?? null,
    ppeScore: row.ppe_score ?? null,
    incidentScore: row.incident_score ?? null,
    workerScore: row.worker_score ?? null,
    responseTimeScore: row.response_time_score ?? null,
    status: row.status,
    calculatedAt: row.calculated_at,
  };
}
