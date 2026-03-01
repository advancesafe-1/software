import { useState, useEffect } from 'react';

export interface SafetyTrendPoint {
  date: string;
  avg_score: number;
  min_score: number;
  readings: number;
}

export interface IncidentDistributionRow {
  incident_type: string;
  severity: string;
  count: number;
}

export interface RiskMatrixRow {
  zone_name: string;
  hour_bucket: string;
  incident_count: number;
  risk_score: number;
}

export interface AnalyticsKpis {
  totalIncidents: number;
  totalIncidentsChange: number;
  avgGuardianScore: number;
  avgGuardianScoreChange: number;
  activeAlerts: number;
  systemUptime: number;
  resolvedToday: number;
  avgResponseTimeMinutes: number;
}

const REFRESH_MS = 5 * 60 * 1000;

export function useAnalyticsData(periodDays: number) {
  const [safetyTrend, setSafetyTrend] = useState<SafetyTrendPoint[]>([]);
  const [incidentDist, setIncidentDist] = useState<IncidentDistributionRow[]>([]);
  const [riskMatrix, setRiskMatrix] = useState<RiskMatrixRow[]>([]);
  const [kpis, setKpis] = useState<AnalyticsKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const api = window.advancesafe?.features?.analytics;
    if (!api) return;
    setError(null);
    setLoading(true);
    Promise.all([
      api.getSafetyTrend(periodDays) as Promise<SafetyTrendPoint[]>,
      api.getIncidentDistribution(periodDays) as Promise<IncidentDistributionRow[]>,
      api.getRiskMatrix(periodDays) as Promise<RiskMatrixRow[]>,
      api.getKpis() as Promise<AnalyticsKpis>,
    ])
      .then(([trend, dist, matrix, k]) => {
        setSafetyTrend(Array.isArray(trend) ? trend : []);
        setIncidentDist(Array.isArray(dist) ? dist : []);
        setRiskMatrix(Array.isArray(matrix) ? matrix : []);
        setKpis(k != null ? k : null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [periodDays]);

  useEffect(() => {
    const t = setInterval(() => {
      const api = window.advancesafe?.features?.analytics;
      if (!api) return;
      api.getSafetyTrend(periodDays).then((d: unknown) => setSafetyTrend(Array.isArray(d) ? d : []));
      api.getIncidentDistribution(periodDays).then((d: unknown) => setIncidentDist(Array.isArray(d) ? d : []));
      api.getRiskMatrix(periodDays).then((d: unknown) => setRiskMatrix(Array.isArray(d) ? d : []));
      api.getKpis().then((k: unknown) => setKpis(k != null ? (k as AnalyticsKpis) : null));
    }, REFRESH_MS);
    return () => clearInterval(t);
  }, [periodDays]);

  return { safetyTrend, incidentDist, riskMatrix, kpis, loading, error };
}
