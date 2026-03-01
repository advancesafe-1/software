import { useRef, useEffect } from 'react';
import { FloorMapEngine } from './floor-map-engine';
import type { MapFloor, MapZone, MapSensor } from './floor-map-types';

export interface FloorMapControlsApi {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

interface FloorMapRendererProps {
  floor: MapFloor;
  width: number;
  height: number;
  onZoneSelect: (zone: MapZone | null) => void;
  onSensorHover: (sensor: MapSensor | null, x: number, y: number) => void;
  onControlsReady?: (api: FloorMapControlsApi) => void;
  interactive?: boolean;
}

export function FloorMapRenderer({
  floor,
  width,
  height,
  onZoneSelect,
  onSensorHover,
  onControlsReady,
  interactive = true,
}: FloorMapRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FloorMapEngine | null>(null);
  const prevFloorIdRef = useRef<string | null>(null);
  const onZoneSelectRef = useRef(onZoneSelect);
  const onSensorHoverRef = useRef(onSensorHover);
  onZoneSelectRef.current = onZoneSelect;
  onSensorHoverRef.current = onSensorHover;

  useEffect(() => {
    if (!canvasRef.current || width <= 0 || height <= 0) return;
    const engine = new FloorMapEngine();
    engine.initialize(canvasRef.current, width, height, (zone) => {
      onZoneSelectRef.current(zone);
    }, (sensor, x, y) => {
      onSensorHoverRef.current(sensor, x, y);
    }, interactive);
    engineRef.current = engine;
    if (interactive) {
      onControlsReady?.({
        zoomIn: () => engine.handleZoom(1, width / 2, height / 2),
        zoomOut: () => engine.handleZoom(-1, width / 2, height / 2),
        resetView: () => engine.resetView(),
      });
    }
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (engineRef.current && width > 0 && height > 0) {
      engineRef.current.resize(width, height);
    }
  }, [width, height]);

  useEffect(() => {
    if (!engineRef.current) return;
    if (floor.id !== prevFloorIdRef.current) {
      prevFloorIdRef.current = floor.id;
      engineRef.current.loadFloor(floor);
    }
  }, [floor.id, floor]);

  useEffect(() => {
    if (!engineRef.current) return;
    floor.zones.forEach((zone) => {
      engineRef.current?.updateZoneStatus(zone.id, zone.status, zone.score);
    });
  }, [floor.zones]);

  useEffect(() => {
    const api = window.advancesafe?.engine;
    if (!api?.onSensorReading) return;
    const unsub = api.onSensorReading((data: unknown) => {
      const r = data as { sensorId: string; value: number; unit: string; status: string };
      if (r?.sensorId != null) {
        engineRef.current?.updateSensorStatus(r.sensorId, r.value ?? 0, r.unit ?? '', r.status as 'safe' | 'warning' | 'danger' | 'critical');
      }
    });
    return unsub;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
