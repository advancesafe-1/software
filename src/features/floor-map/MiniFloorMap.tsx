import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloorMapRenderer } from './FloorMapRenderer';
import { useFloorMapData } from './useFloorMapData';
import { loadFloorsList } from './useFloorMapData';
import type { MapZone, MapSensor } from './floor-map-types';

const MINI_HEIGHT = 300;

export function MiniFloorMap() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [firstFloorId, setFirstFloorId] = useState<string | null>(null);
  const [width, setWidth] = useState(400);

  useEffect(() => {
    loadFloorsList().then((list) => {
      if (list.length > 0) setFirstFloorId(list[0].id);
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { floor } = useFloorMapData(firstFloorId);

  if (!firstFloorId || !floor) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded border border-[var(--border-default)] bg-[var(--bg-secondary)]">
        <p className="font-mono text-sm text-[var(--text-muted)]">Loading map…</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-[300px] w-full overflow-hidden rounded border border-[var(--border-default)]">
      <FloorMapRenderer
        floor={floor}
        width={width}
        height={MINI_HEIGHT}
        onZoneSelect={(_z: MapZone | null) => {}}
        onSensorHover={(_s: MapSensor | null, _x: number, _y: number) => {}}
        interactive={false}
      />
      <button
        type="button"
        onClick={() => navigate('/plant-map')}
        className="absolute bottom-2 right-2 rounded bg-[var(--accent-cyan)] px-2 py-1 font-mono text-xs text-[var(--bg-primary)] hover:opacity-90"
      >
        VIEW FULL MAP
      </button>
    </div>
  );
}
