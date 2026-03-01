interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function MapControls({ onZoomIn, onZoomOut, onReset }: MapControlsProps) {
  return (
    <div className="flex gap-1 rounded border border-[var(--border-default)] bg-[var(--bg-secondary)]/90 p-1 font-mono">
      <button type="button" onClick={onZoomIn} className="rounded px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]" title="Zoom in">+</button>
      <button type="button" onClick={onZoomOut} className="rounded px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]" title="Zoom out">−</button>
      <button type="button" onClick={onReset} className="rounded px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]" title="Reset view">Reset</button>
    </div>
  );
}
