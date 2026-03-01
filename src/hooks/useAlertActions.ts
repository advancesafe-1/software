import { useCallback } from 'react';
import { useAppStore } from '@/store/app-store';

export function useAlertActions(): {
  acknowledgeAlert: (incidentId: string) => Promise<void>;
  resolveIncident: (incidentId: string, notes: string) => Promise<void>;
} {
  const currentUser = useAppStore((s) => s.currentUser);

  const userId = currentUser?.id ?? 'system';

  const acknowledgeAlert = useCallback(
    async (incidentId: string) => {
      await window.advancesafe?.engine?.acknowledgeAlert(incidentId, userId);
    },
    [userId]
  );

  const resolveIncident = useCallback(
    async (incidentId: string, notes: string) => {
      await window.advancesafe?.engine?.resolveIncident(incidentId, userId, notes);
    },
    [userId]
  );

  return { acknowledgeAlert, resolveIncident };
}
