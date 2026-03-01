import type { MapFloor } from '../floor-map-types';

interface FloorSelectorProps {
  floors: MapFloor[];
  selectedFloorId: string | null;
  onSelect: (floorId: string) => void;
}

export function FloorSelector({ floors, selectedFloorId, onSelect }: FloorSelectorProps) {
  if (floors.length === 0) return null;
  return (
    <div className="flex gap-1 font-mono">
      {floors.map((floor) => (
        <button
          key={floor.id}
          type="button"
          onClick={() => onSelect(floor.id)}
          className={`rounded border px-3 py-1.5 text-sm transition-colors ${
            selectedFloorId === floor.id
              ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]'
              : 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
          }`}
        >
          {floor.name}
        </button>
      ))}
    </div>
  );
}
