import { useState, useEffect, useCallback } from 'react';
import type { EngineZoneScore } from '@/types';

const REFRESH_MS = 5 * 60 * 1000;

export function useSensorHistory(zoneId: string | null, hours = 24): EngineZoneScore[] {
  const [history, setHistory] = useState<EngineZoneScore[]>([]);

  const fetchHistory = useCallback(() => {
    if (!zoneId || !window.advancesafe?.engine) return;
    window.advancesafe.engine.getZoneHistory(zoneId, hours).then((data) => {
      if (Array.isArray(data)) setHistory(data as EngineZoneScore[]);
    });
  }, [zoneId, hours]);

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchHistory]);

  return history;
}
