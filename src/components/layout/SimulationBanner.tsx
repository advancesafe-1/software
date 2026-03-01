export function SimulationBanner({ onDisable }: { onDisable: () => void }) {
  return (
    <div
      className="flex items-center justify-between border-b px-4 py-2 font-mono text-[11px]"
      style={{
        background: 'rgba(255,183,0,0.08)',
        borderColor: 'rgba(255,183,0,0.3)',
        color: 'var(--status-warning)',
      }}
    >
      <span>
        ⚡ SIMULATION MODE ACTIVE — Engine running with simulated sensor data. Connect real sensors to disable.
      </span>
      <button
        type="button"
        className="rounded border border-[var(--status-warning)] px-2 py-1 hover:bg-[var(--status-warning)] hover:bg-opacity-20"
        onClick={onDisable}
      >
        DISABLE SIMULATION
      </button>
    </div>
  );
}
