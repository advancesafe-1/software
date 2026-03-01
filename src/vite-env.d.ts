/// <reference types="vite/client" />

interface AdvanceSafeAPI {
  features: {
    incidents: {
      getAll: (params?: { status?: string; zoneId?: string; severity?: string; limit?: number; offset?: number }) => Promise<unknown>;
      getById: (id: string) => Promise<unknown>;
      getCounts: () => Promise<unknown>;
      addNote: (incidentId: string, note: string, userId: string) => Promise<unknown>;
    };
    sensors: {
      getAll: (params?: { floorId?: string; zoneId?: string; status?: string }) => Promise<unknown>;
      getHistory: (sensorId: string, hours: number) => Promise<unknown>;
      updateThresholds: (params: Record<string, unknown>) => Promise<unknown>;
    };
    analytics: {
      getSafetyTrend: (days: number) => Promise<unknown>;
      getIncidentDistribution: (days: number) => Promise<unknown>;
      getRiskMatrix: (days: number) => Promise<unknown>;
      getKpis: () => Promise<unknown>;
    };
    zones: { list: () => Promise<unknown> };
    workers: {
      getAll: (params?: { search?: string; isContractWorker?: boolean; department?: string; limit?: number; offset?: number }) => Promise<unknown>;
      getCounts: () => Promise<unknown>;
      getById: (id: string) => Promise<unknown>;
      checkin: (workerId: string, zoneId: string, method: string) => Promise<unknown>;
      checkout: (workerId: string) => Promise<unknown>;
      update: (params: Record<string, unknown>) => Promise<unknown>;
    };
  };
  sync: {
    getStats: () => Promise<{ totalPending: number; totalSynced: number; totalFailed: number; lastSyncAt: string | null; isOnline: boolean; isSyncing: boolean }>;
    retryFailed: () => Promise<void>;
    forceFullSync: () => Promise<void>;
    updateConfig: (config: { projectId: string; serviceAccountJson?: string }) => Promise<{ success: boolean; error?: string }>;
    onOnline: (cb: () => void) => () => void;
    onOffline: (cb: () => void) => () => void;
  };
  settings: {
    saveCredentials: (creds: Record<string, string>) => Promise<{ success: boolean; error?: string }>;
    testSMS: (phone: string) => Promise<{ success: boolean; error?: string }>;
    testWhatsApp: (phone: string) => Promise<{ success: boolean; error?: string }>;
    hasCredentials: () => Promise<boolean>;
    getDeliveryStats: (hours: number) => Promise<{ channel: string; status: string; count: number }[]>;
    getQueueStatus: () => Promise<{ pending: number; sending: number; failed: number }>;
    retryFailed: () => Promise<void>;
  };
  database: {
    query: (channel: string, ...args: unknown[]) => Promise<unknown>;
    execute: (channel: string, ...args: unknown[]) => Promise<unknown>;
    transaction: (channel: string, ...args: unknown[]) => Promise<unknown>;
  };
  system: {
    getHardwareId: () => Promise<string>;
    getPlatform: () => Promise<string>;
    getVersion: () => Promise<string>;
  };
  alerts: {
    send: (payload: unknown) => Promise<unknown>;
    onAlert: (callback: (payload: unknown) => void) => () => void;
    removeAlertListener: () => void;
  };
  sensors: {
    onReading: (callback: (payload: unknown) => void) => () => void;
    removeSensorListener: () => void;
  };
  engine: {
    acknowledgeAlert: (incidentId: string, userId: string) => Promise<void>;
    resolveIncident: (incidentId: string, userId: string, notes: string) => Promise<void>;
    getState: () => Promise<unknown>;
    getZoneHistory: (zoneId: string, hours?: number) => Promise<unknown>;
    setSimulationMode: (enabled: boolean) => Promise<void>;
    onScoreUpdate: (cb: (data: unknown) => void) => () => void;
    onAlertFired: (cb: (data: unknown) => void) => () => void;
    onAlertEscalated: (cb: (data: unknown) => void) => () => void;
    onSensorReading: (cb: (data: unknown) => void) => () => void;
    onEngineStatus: (cb: (data: unknown) => void) => () => void;
    onIncidentResolved: (cb: (data: unknown) => void) => () => void;
  };
  events: {
    on: (channel: string, callback: (payload: unknown) => void) => () => void;
    off: (channel: string) => void;
    emit: (channel: string, payload?: unknown) => void;
  };
  admin?: {
    org: { updateProfile: (p: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>; getProfile: () => Promise<Record<string, unknown> | null> };
    users: {
      getAll: (orgId: string) => Promise<Record<string, unknown>[]>;
      create: (p: Record<string, unknown>) => Promise<{ success: boolean; error?: string; id?: string }>;
      updateRole: (p: { userId: string; newRole: string; updatedBy: string }) => Promise<{ success: boolean; error?: string }>;
      deactivate: (p: { userId: string; deactivatedBy: string }) => Promise<{ success: boolean; error?: string }>;
      activate: (p: { userId: string; activatedBy: string }) => Promise<{ success: boolean }>;
      changePassword: (p: { userId: string; currentPassword: string; newPassword: string; changedBy: string }) => Promise<{ success: boolean; error?: string }>;
      verifyPassword: (p: { userId: string; password: string }) => Promise<{ valid: boolean }>;
      hasUsers: () => Promise<boolean>;
      defaultAdminCreated: () => Promise<boolean>;
      ensureDefaultAdmin: () => void;
    };
    login: (p: { username: string; password: string }) => Promise<{ success: boolean; error?: string; user?: { id: string; username: string; fullName: string; role: string } }>;
    floors: { getAll: () => Promise<Record<string, unknown>[]>; update: (p: Record<string, unknown>) => Promise<unknown> };
    zones: { getAll: (floorId?: string) => Promise<Record<string, unknown>[]>; create: (p: Record<string, unknown>) => Promise<unknown>; update: (p: Record<string, unknown>) => Promise<unknown>; delete: (p: { id: string; userId: string }) => Promise<{ success: boolean; error?: string }> };
    sensors: { create: (p: Record<string, unknown>) => Promise<unknown>; update: (p: Record<string, unknown>) => Promise<unknown>; delete: (p: { id: string; userId: string }) => Promise<{ success: boolean; error?: string }>; testConnection: (id: string) => Promise<unknown> };
    cameras: { create: (p: Record<string, unknown>) => Promise<unknown>; update: (p: Record<string, unknown>) => Promise<unknown>; delete: (p: { id: string; userId: string }) => Promise<{ success: boolean; error?: string }>; testConnection: (id: string) => Promise<unknown> };
    ppeRules: { update: (p: { zoneId: string; rules: string; userId: string }) => Promise<{ success: boolean; error?: string }> };
    hierarchy: { get: () => Promise<{ levels: unknown[]; contacts: unknown[] }>; updateLevel: (p: Record<string, unknown>) => Promise<unknown>; addContact: (p: Record<string, unknown>) => Promise<unknown>; removeContact: (p: { contactId: string; userId: string }) => Promise<unknown> };
    system: { getInfo: () => Promise<Record<string, unknown> | null>; exportDatabase: () => Promise<{ success: boolean; path?: string; error?: string }>; clearOldData: (p: Record<string, unknown>) => Promise<unknown> };
    auditLog: { get: (p: Record<string, unknown>) => Promise<Record<string, unknown>[]> };
  };
  updater?: {
    onUpdateAvailable: (cb: (info: unknown) => void) => (() => void) | undefined;
    onUpdateDownloaded: (cb: (info: unknown) => void) => (() => void) | undefined;
    onDownloadProgress: (cb: (info: unknown) => void) => (() => void) | undefined;
    installUpdate: () => Promise<void>;
  };
  reports?: {
    generate: (config: Record<string, unknown>) => Promise<{ id: string; status: string; progress: number; outputPath: string | null; errorMessage: string | null; fileSizeBytes: number | null }>;
    getList: () => Promise<{ name: string; path: string; size: number; createdAt: string }[]>;
    open: (filePath: string) => Promise<void>;
    delete: (filePath: string) => Promise<void>;
    openFolder: () => Promise<void>;
    onProgress: (cb: (job: unknown) => void) => () => void;
  };
}

declare global {
  interface Window {
    advancesafe?: AdvanceSafeAPI;
  }
}

export {};
