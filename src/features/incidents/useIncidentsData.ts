import { useState, useEffect, useMemo } from 'react';
import type { EngineAlertEvent } from '@/types';
import type { IncidentRow, IncidentCounts, IncidentStatusFilter } from './incidents-types';

const REFRESH_MS = 60_000;
const LIST_LIMIT = 100;

function alertToRow(ev: EngineAlertEvent): IncidentRow {
  return {
    id: ev.incidentId,
    zone_id: ev.zoneId,
    incident_type: ev.alertType,
    severity: ev.severity,
    title: ev.title,
    description: ev.description,
    sensor_id: ev.sensorId ?? null,
    triggered_at: ev.triggeredAt,
    acknowledged_at: null,
    acknowledged_by: null,
    resolved_at: null,
    resolved_by: null,
    resolution_notes: null,
    zone_name: ev.zoneName,
    floor_name: ev.floorName,
    sensor_name: ev.sensorName ?? null,
    sensor_type: null,
  };
}

export function useIncidentsData(searchQuery: string) {
  const [list, setList] = useState<IncidentRow[]>([]);
  const [counts, setCounts] = useState<IncidentCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = (status?: IncidentStatusFilter) => {
    const api = window.advancesafe?.features?.incidents;
    if (!api) return;
    setError(null);
    api
      .getAll({ status: status === 'all' ? undefined : status, limit: LIST_LIMIT, offset: 0 })
      .then((rows: unknown) => setList(Array.isArray(rows) ? (rows as IncidentRow[]) : []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  };

  const fetchCounts = () => {
    const api = window.advancesafe?.features?.incidents;
    if (!api) return;
    api.getCounts().then((c: unknown) => setCounts(c as IncidentCounts)).catch(() => {});
  };

  useEffect(() => {
    setLoading(true);
    fetchList('all');
    fetchCounts();
    const t = setInterval(() => {
      fetchList('all');
      fetchCounts();
    }, REFRESH_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const api = window.advancesafe?.engine;
    if (!api) return () => {};
    const unsubAlert = api.onAlertFired((data: unknown) => {
      const ev = data as EngineAlertEvent;
      setList((prev) => [alertToRow(ev), ...prev.filter((r) => r.id !== ev.incidentId)]);
      fetchCounts();
    });
    const unsubResolved = api.onIncidentResolved((data: unknown) => {
      const payload = data as { incidentId?: string };
      const id = payload?.incidentId;
      if (id) {
        setList((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, resolved_at: new Date().toISOString(), resolved_by: 'system' } : r
          )
        );
        fetchCounts();
      }
    });
    return () => {
      unsubAlert();
      unsubResolved();
    };
  }, []);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        (r.zone_name?.toLowerCase().includes(q)) ||
        (r.sensor_name?.toLowerCase().includes(q)) ||
        (r.incident_type?.toLowerCase().includes(q)) ||
        (r.title?.toLowerCase().includes(q)) ||
        (r.floor_name?.toLowerCase().includes(q))
    );
  }, [list, searchQuery]);

  return {
    list: filteredList,
    counts,
    loading,
    error,
    refetch: () => {
      setLoading(true);
      fetchList('all');
      fetchCounts();
    },
  };
}
