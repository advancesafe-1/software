import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloorMapRenderer, type FloorMapControlsApi } from './FloorMapRenderer';
import { useFloorMapData, loadFloorsList } from './useFloorMapData';
import { FloorSelector } from './components/FloorSelector';
import { MapLegend } from './components/MapLegend';
import { ZoneInfoPanel } from './components/ZoneInfoPanel';
import { SensorTooltip } from './components/SensorTooltip';
import { MapControls } from './components/MapControls';
import type { MapFloor, MapZone, MapSensor } from './floor-map-types';
import { useEngineData } from '@/hooks/useEngineData';

export function FloorMapPage() {
  const navigate = useNavigate();
  const [floors, setFloors] = useState<MapFloor[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<MapZone | null>(null);
  const [hoveredSensor, setHoveredSensor] = useState<MapSensor | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [legendVisible, setLegendVisible] = useState(true);
  const [controlsApi, setControlsApi] = useState<FloorMapControlsApi | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const { orgScore } = useEngineData();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    loadFloorsList().then((list) => {
      setFloors(list);
      if (list.length > 0 && !selectedFloorId) setSelectedFloorId(list[0].id);
    });
  }, []);

  const { floor, isLoading } = useFloorMapData(selectedFloorId);
  const lastUpdated = orgScore?.calculatedAt ?? null;

  const handleSensorHover = useCallback((sensor: MapSensor | null, x: number, y: number) => {
    setHoveredSensor(sensor);
    setTooltipPos({ x, y });
  }, []);

  if (floors.length === 0 && !isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <p className="font-mono text-[var(--text-secondary)]">Complete onboarding to activate Plant Map</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded bg-[var(--accent-cyan)] px-4 py-2 font-mono text-sm text-[var(--bg-primary)]"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-2">
        <div>
          <h1 className="font-rajdhani text-xl font-bold text-[var(--text-primary)]">PLANT MAP</h1>
          <p className="font-mono text-[10px] text-[var(--text-secondary)]">LIVE TOPOLOGY VIEW</p>
          {lastUpdated && (
            <p className="font-mono text-[10px] text-[var(--accent-cyan)]">
              UPDATED: {new Date(lastUpdated).toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <FloorSelector floors={floors} selectedFloorId={selectedFloorId} onSelect={setSelectedFloorId} />
          <MapControls
            onZoomIn={() => controlsApi?.zoomIn()}
            onZoomOut={() => controlsApi?.zoomOut()}
            onReset={() => controlsApi?.resetView()}
          />
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
        <div ref={containerRef} className="relative min-h-0 flex-1">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-primary)]">
              <p className="font-mono text-[var(--text-secondary)]">Loading floor…</p>
            </div>
          )}
          {!isLoading && floor && (
            <FloorMapRenderer
              floor={floor}
              width={size.width}
              height={size.height}
              onZoneSelect={setSelectedZone}
              onSensorHover={handleSensorHover}
              onControlsReady={setControlsApi}
            />
          )}
          {!isLoading && floor && floor.zones.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <p className="font-mono text-[var(--text-secondary)]">No zones configured</p>
              <p className="font-mono text-xs text-[var(--text-muted)]">Add zones during setup or in Settings</p>
            </div>
          )}
          {!isLoading && floor && !floor.floorPlanImagePath && (
            <div className="absolute left-0 right-0 top-0 border-b border-[var(--status-warning)]/30 bg-[var(--status-warning)]/10 px-4 py-2 font-mono text-[11px] text-[var(--status-warning)]">
              No floor plan uploaded for this floor. Zones shown without background. Upload floor plan in Settings → Floor Plans
            </div>
          )}
          <MapLegend visible={legendVisible} onToggle={() => setLegendVisible((v) => !v)} />
          <SensorTooltip sensor={hoveredSensor} x={tooltipPos.x} y={tooltipPos.y} />
        </div>
        <ZoneInfoPanel zone={selectedZone} />
      </div>
    </div>
  );
}
