import { useAppStore } from '@/store/app-store';
import { useEngineData } from '@/hooks/useEngineData';

const BUILD_ID = 'dev-build';

export function BottomBar() {
  const networkLatency = useAppStore((s) => s.networkLatency);
  const { engineState } = useEngineData();

  const dataStreamOk = engineState?.isRunning ?? false;
  const isSimulationMode = engineState?.simulationMode ?? false;

  return (
    <footer
      className="flex shrink-0 items-center justify-between border-t border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 font-mono"
      style={{ height: '28px', fontSize: '10px', color: 'var(--text-secondary)' }}
    >
      <div className="flex items-center gap-6">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-1 w-1 rounded-full"
            style={{
              backgroundColor: dataStreamOk ? 'var(--status-safe)' : 'var(--status-critical)',
            }}
          />
          DATA STREAM: {dataStreamOk ? 'OK' : 'ERROR'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-1 w-1 rounded-full"
            style={{
              backgroundColor: isSimulationMode ? 'var(--status-warning)' : 'var(--status-safe)',
            }}
          />
          AI AGENT: {isSimulationMode ? 'SIMULATION' : 'ACTIVE'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-1 w-1 rounded-full"
            style={{ backgroundColor: 'var(--accent-cyan)' }}
          />
          NETWORK LATENCY: {networkLatency}ms
        </span>
      </div>
      <div>
        ADVANCESAFE v1.0.0 // BUILD_ID: {BUILD_ID}
      </div>
    </footer>
  );
}
