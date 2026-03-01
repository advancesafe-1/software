import { useState, useEffect, useMemo } from 'react';
import { useEngineData } from '@/hooks/useEngineData';
import type { MapFloor, MapZone, MapZoneStatus } from './floor-map-types';

interface FloorRow {
  id: string;
  name: string;
  floor_number: number;
  floor_plan_image_path: string | null;
  width_meters: number | null;
  length_meters: number | null;
  zone_id: string | null;
  zone_name: string | null;
  zone_type: string | null;
  coordinates_json: string | null;
  risk_level_default: string | null;
  sensor_id: string | null;
  sensor_name: string | null;
  sensor_type: string | null;
  position_x: number | null;
  position_y: number | null;
  unit: string | null;
  camera_id: string | null;
  camera_name: string | null;
  cam_x: number | null;
  cam_y: number | null;
  angle_degrees: number | null;
  is_active: number | null;
  last_seen_at: string | null;
}

function parseCoordinates(json: string | null): number[][] {
  if (!json || typeof json !== 'string') return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((p) => (Array.isArray(p) ? [Number(p[0]) ?? 0, Number(p[1]) ?? 0] : [0, 0]));
    }
    return [];
  } catch {
    return [];
  }
}

function transformFloorRows(rows: FloorRow[], floorId: string): MapFloor | null {
  if (rows.length === 0) return null;
  const first = rows[0];
  const zonesByKey = new Map<string, MapZone>();
  for (const row of rows) {
    if (!row.zone_id) continue;
    let zone = zonesByKey.get(row.zone_id);
    if (!zone) {
      zone = {
        id: row.zone_id,
        name: row.zone_name ?? 'Zone',
        zoneType: row.zone_type ?? 'other',
        riskLevel: row.risk_level_default ?? 'low',
        status: 'safe',
        score: 100,
        coordinates: parseCoordinates(row.coordinates_json),
        sensors: [],
        cameras: [],
        activeAlerts: 0,
      };
      zonesByKey.set(row.zone_id, zone);
    }
    if (row.sensor_id) {
      const existing = zone.sensors.find((s) => s.id === row.sensor_id);
      if (!existing) {
        zone.sensors.push({
          id: row.sensor_id,
          name: row.sensor_name ?? 'Sensor',
          sensorType: row.sensor_type ?? 'unknown',
          positionX: row.position_x ?? 50,
          positionY: row.position_y ?? 50,
          value: 0,
          unit: row.unit ?? '',
          status: 'safe',
        });
      }
    }
    if (row.camera_id) {
      const existing = zone.cameras.find((c) => c.id === row.camera_id);
      if (!existing) {
        zone.cameras.push({
          id: row.camera_id,
          name: row.camera_name ?? 'Camera',
          positionX: row.cam_x ?? 50,
          positionY: row.cam_y ?? 50,
          angleDegrees: row.angle_degrees ?? 0,
          isActive: row.is_active === 1,
          lastSeenAt: row.last_seen_at ?? '',
        });
      }
    }
  }
  const zones = Array.from(zonesByKey.values());
  return {
    id: floorId,
    name: first.name,
    floorNumber: first.floor_number,
    floorPlanImagePath: first.floor_plan_image_path,
    widthMeters: first.width_meters ?? 10,
    lengthMeters: first.length_meters ?? 10,
    zones,
  };
}

export async function loadFloorsList(): Promise<MapFloor[]> {
  const api = window.advancesafe?.database;
  if (!api) return [];
  try {
    const rows = (await api.query(
      'floors',
      `SELECT f.id, f.name, f.floor_number, f.floor_plan_image_path, f.width_meters, f.length_meters
       FROM floors f
       WHERE f.organization_id = (SELECT id FROM organizations WHERE is_active = 1 LIMIT 1)
       ORDER BY f.floor_number`,
      []
    )) as { id: string; name: string; floor_number: number; floor_plan_image_path: string | null; width_meters: number | null; length_meters: number | null }[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      floorNumber: r.floor_number,
      floorPlanImagePath: r.floor_plan_image_path,
      widthMeters: r.width_meters ?? 10,
      lengthMeters: r.length_meters ?? 10,
      zones: [],
    }));
  } catch {
    return [];
  }
}

export async function loadFloorData(floorId: string): Promise<MapFloor | null> {
  const api = window.advancesafe?.database;
  if (!api) return null;
  try {
    const rows = (await api.query(
      'floor',
      `SELECT f.id, f.name, f.floor_number, f.floor_plan_image_path, f.width_meters, f.length_meters,
       z.id as zone_id, z.name as zone_name, z.zone_type, z.coordinates_json, z.risk_level_default,
       s.id as sensor_id, s.name as sensor_name, s.sensor_type, s.position_x, s.position_y, s.unit,
       c.id as camera_id, c.name as camera_name, c.position_x as cam_x, c.position_y as cam_y,
       c.angle_degrees, c.is_active, c.last_seen_at
       FROM floors f
       LEFT JOIN zones z ON z.floor_id = f.id
       LEFT JOIN sensors s ON s.floor_id = f.id
       LEFT JOIN cameras c ON c.floor_id = f.id
       WHERE f.id = ?`,
      [floorId]
    )) as FloorRow[];
    return transformFloorRows(rows, floorId);
  } catch {
    return null;
  }
}

export function useFloorMapData(floorId: string | null): {
  floor: MapFloor | null;
  isLoading: boolean;
} {
  const [floor, setFloor] = useState<MapFloor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { orgScore } = useEngineData();

  useEffect(() => {
    if (!floorId) {
      setFloor(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    loadFloorData(floorId)
      .then((data) => {
        setFloor(data);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [floorId]);

  const floorWithLiveData = useMemo((): MapFloor | null => {
    if (!floor || !orgScore) return floor;
    const liveFloor = orgScore.floors.find((f) => f.floorId === floorId);
    if (!liveFloor) return floor;
    return {
      ...floor,
      zones: floor.zones.map((zone): MapZone => {
        const liveZone = liveFloor.zones.find((z) => z.zoneId === zone.id);
        if (!liveZone) return zone;
        return {
          ...zone,
          status: liveZone.status as MapZoneStatus,
          score: liveZone.score,
          activeAlerts: liveZone.score < 65 ? 1 : 0,
        };
      }),
    };
  }, [floor, orgScore, floorId]);

  return {
    floor: floorWithLiveData,
    isLoading,
  };
}
