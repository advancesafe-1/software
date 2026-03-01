import { useState, useEffect, useMemo } from 'react';
import type { EngineSensorReading } from '@/types';

export interface SensorRow {
  id: string;
  zone_id: string | null;
  floor_id: string | null;
  name: string;
  sensor_type: string;
  unit: string | null;
  zone_name: string | null;
  floor_name: string | null;
  latest_value: number | null;
  latest_status: string | null;
  latest_reading_at: string | null;
  safe_min: number | null;
  safe_max: number | null;
  warning_min: number | null;
  warning_max: number | null;
  danger_min: number | null;
  danger_max: number | null;
  critical_min: number | null;
  critical_max: number | null;
}

const valueCache = new Map<string, { value: number; unit: string; status: string; at: string }>();

export function useSensorsData(
  floorId: string | null,
  categoryFilter: Set<string>,
  searchQuery: string
) {
  const [list, setList] = useState<SensorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveUpdates, setLiveUpdates] = useState(0);

  useEffect(() => {
    const api = window.advancesafe?.features?.sensors;
    if (!api) return;
    setError(null);
    api
      .getAll(floorId != null && floorId !== '' ? { floorId } : {})
      .then((rows: unknown) => {
        const arr = Array.isArray(rows) ? (rows as SensorRow[]) : [];
        arr.forEach((r) => {
          if (r.latest_value != null && r.latest_reading_at != null) {
            valueCache.set(r.id, {
              value: r.latest_value,
              unit: r.unit ?? '',
              status: r.latest_status ?? 'safe',
              at: r.latest_reading_at,
            });
          }
        });
        setList(arr);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [floorId]);

  useEffect(() => {
    const api = window.advancesafe?.engine;
    if (!api) return () => {};
    return api.onSensorReading((data: unknown) => {
      const r = data as EngineSensorReading;
      const prev = valueCache.get(r.sensorId);
      valueCache.set(r.sensorId, {
        value: r.value,
        unit: r.unit,
        status: r.status,
        at: r.recordedAt,
      });
      if (prev?.status !== r.status) setLiveUpdates((n) => n + 1);
    });
  }, []);

  const listWithLive = useMemo(() => {
    return list.map((s) => {
      const cached = valueCache.get(s.id);
      if (!cached) return s;
      return {
        ...s,
        latest_value: cached.value,
        latest_status: cached.status,
        latest_reading_at: cached.at,
        unit: cached.unit || s.unit,
      };
    });
  }, [list, liveUpdates]);

  const categoryGroups: Record<string, string[]> = {
    'Air Quality': ['co_gas', 'h2s_gas', 'oxygen_level', 'co2'],
    Temperature: ['temperature'],
    Vibration: ['vibration'],
    'Noise Levels': ['noise_level'],
    Pressure: ['pressure'],
    Other: [],
  };

  const filteredList = useMemo(() => {
    let out = listWithLive;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.sensor_type.toLowerCase().includes(q) ||
          (s.zone_name != null && s.zone_name.toLowerCase().includes(q))
      );
    }
    if (categoryFilter.size > 0) {
      const allowed = new Set<string>();
      categoryFilter.forEach((label) => {
        const types = categoryGroups[label];
        if (types) types.forEach((t) => allowed.add(t));
      });
      if (allowed.size > 0) {
        out = out.filter((s) => allowed.has(s.sensor_type));
      }
    }
    return out;
  }, [listWithLive, searchQuery, categoryFilter]);

  return { list: filteredList, loading, error };
}

export function getSensorHistory(
  sensorId: string,
  hours: number
): Promise<{ value: number; status: string; recorded_at: string }[]> {
  const api = window.advancesafe?.features?.sensors;
  if (!api) return Promise.resolve([]);
  return api.getHistory(sensorId, hours) as Promise<
    { value: number; status: string; recorded_at: string }[]
  >;
}
