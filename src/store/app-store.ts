import { create } from 'zustand';
import type {
  Organization,
  Incident,
  CurrentUser,
  SystemStatus,
  AppState,
} from '@/types';

interface AppStore extends AppState {
  onboardingComplete: boolean;
  setOrganization: (org: Organization | null) => void;
  setCurrentUser: (user: CurrentUser | null) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setOnlineStatus: (online: boolean) => void;
  setOfflineMode: (offline: boolean) => void;
  addIncident: (incident: Incident) => void;
  resolveIncident: (incidentId: string) => void;
  setSystemStatus: (status: SystemStatus) => void;
  setNetworkLatency: (ms: number) => void;
  setDataStreamOk: (ok: boolean) => void;
  setAiAgentActive: (active: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  organization: null,
  currentUser: null,
  onboardingComplete: false,
  isOnline: true,
  isOfflineMode: false,
  activeIncidents: [],
  systemStatus: 'nominal',
  networkLatency: 0,
  dataStreamOk: true,
  aiAgentActive: true,

  setOrganization: (organization) => set({ organization }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  setOnboardingComplete: (onboardingComplete) => set({ onboardingComplete }),
  setOnlineStatus: (isOnline) => set({ isOnline }),
  setOfflineMode: (isOfflineMode) => set({ isOfflineMode }),
  addIncident: (incident) =>
    set((state) => ({
      activeIncidents: [...state.activeIncidents, incident],
    })),
  resolveIncident: (incidentId) =>
    set((state) => ({
      activeIncidents: state.activeIncidents.filter((i) => i.id !== incidentId),
    })),
  setSystemStatus: (systemStatus) => set({ systemStatus }),
  setNetworkLatency: (networkLatency) => set({ networkLatency }),
  setDataStreamOk: (dataStreamOk) => set({ dataStreamOk }),
  setAiAgentActive: (aiAgentActive) => set({ aiAgentActive }),
}));
