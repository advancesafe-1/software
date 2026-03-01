import { useState, useEffect } from 'react';
import type {
  EngineOrganizationScore,
  EngineAlertEvent,
  EngineState,
} from '@/types';

const MAX_ALERTS = 50;

export function useEngineData(): {
  orgScore: EngineOrganizationScore | null;
  latestAlerts: EngineAlertEvent[];
  engineState: EngineState | null;
  isSimulationMode: boolean;
} {
  const [orgScore, setOrgScore] = useState<EngineOrganizationScore | null>(null);
  const [latestAlerts, setLatestAlerts] = useState<EngineAlertEvent[]>([]);
  const [engineState, setEngineState] = useState<EngineState | null>(null);

  useEffect(() => {
    const api = window.advancesafe?.engine;
    if (!api) return () => {};

    let cancelled = false;
    api.getState().then((state) => {
      if (!cancelled && state) setEngineState(state as EngineState);
    });

    const unsubScore = api.onScoreUpdate((data) => {
      if (!cancelled && data) setOrgScore(data as EngineOrganizationScore);
    });
    const unsubAlert = api.onAlertFired((data) => {
      if (!cancelled && data) {
        setLatestAlerts((prev) => {
          const next = [data as EngineAlertEvent, ...prev];
          return next.slice(0, MAX_ALERTS);
        });
      }
    });
    const unsubEscalated = api.onAlertEscalated?.((data) => {
      if (!cancelled && data) {
        setLatestAlerts((prev) => {
          const next = [data as EngineAlertEvent, ...prev];
          return next.slice(0, MAX_ALERTS);
        });
      }
    });
    const unsubStatus = api.onEngineStatus((data) => {
      if (!cancelled && data) setEngineState(data as EngineState);
    });

    return () => {
      cancelled = true;
      unsubScore();
      unsubAlert();
      if (unsubEscalated) unsubEscalated();
      unsubStatus();
    };
  }, []);

  const isSimulationMode = engineState?.simulationMode ?? false;

  return { orgScore, latestAlerts, engineState, isSimulationMode };
}
