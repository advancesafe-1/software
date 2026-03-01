import { contextBridge, ipcRenderer } from 'electron';

const ENGINE_SCORE_UPDATE = 'engine:score-update';
const ENGINE_ALERT_FIRED = 'engine:alert-fired';
const ENGINE_ALERT_ESCALATED = 'engine:alert-escalated';
const ENGINE_SENSOR_READING = 'engine:sensor-reading';
const ENGINE_STATUS = 'engine:status';
const ENGINE_INCIDENT_RESOLVED = 'engine:incident-resolved';

contextBridge.exposeInMainWorld('advancesafe', {
  database: {
    query: (channel: string, ...args: unknown[]) => ipcRenderer.invoke('db:query', channel, ...args),
    execute: (channel: string, ...args: unknown[]) => ipcRenderer.invoke('db:execute', channel, ...args),
    transaction: (channel: string, ...args: unknown[]) => ipcRenderer.invoke('db:transaction', channel, ...args),
  },
  system: {
    getHardwareId: () => ipcRenderer.invoke('system:getHardwareId'),
    getPlatform: () => ipcRenderer.invoke('system:getPlatform'),
    getVersion: () => ipcRenderer.invoke('system:getVersion'),
  },
  alerts: {
    send: (payload: unknown) => ipcRenderer.invoke('alerts:send', payload),
    onAlert: (callback: (payload: unknown) => void) => {
      const subscription = (_: unknown, payload: unknown) => callback(payload);
      ipcRenderer.on('alerts:on', subscription);
      return () => ipcRenderer.removeListener('alerts:on', subscription);
    },
    removeAlertListener: () => ipcRenderer.removeAllListeners('alerts:on'),
  },
  sensors: {
    onReading: (callback: (payload: unknown) => void) => {
      const subscription = (_: unknown, payload: unknown) => callback(payload);
      ipcRenderer.on('sensors:reading', subscription);
      return () => ipcRenderer.removeListener('sensors:reading', subscription);
    },
    removeSensorListener: () => ipcRenderer.removeAllListeners('sensors:reading'),
  },
  features: {
    incidents: {
      getAll: (params?: { status?: string; zoneId?: string; severity?: string; limit?: number; offset?: number }) =>
        ipcRenderer.invoke('incidents:get-all', params ?? {}),
      getById: (id: string) => ipcRenderer.invoke('incidents:get-by-id', id),
      getCounts: () => ipcRenderer.invoke('incidents:get-counts'),
      addNote: (incidentId: string, note: string, userId: string) =>
        ipcRenderer.invoke('incidents:add-note', incidentId, note, userId),
    },
    sensors: {
      getAll: (params?: { floorId?: string; zoneId?: string; status?: string }) =>
        ipcRenderer.invoke('sensors:get-all', params ?? {}),
      getHistory: (sensorId: string, hours: number) =>
        ipcRenderer.invoke('sensors:get-history', sensorId, hours),
      updateThresholds: (params: {
        sensorId: string;
        safeMin: number; safeMax: number;
        warningMin: number; warningMax: number;
        dangerMin: number; dangerMax: number;
        criticalMin: number; criticalMax: number;
        userId: string;
      }) => ipcRenderer.invoke('sensors:update-thresholds', params),
    },
    analytics: {
      getSafetyTrend: (days: number) => ipcRenderer.invoke('analytics:get-safety-trend', days),
      getIncidentDistribution: (days: number) => ipcRenderer.invoke('analytics:get-incident-distribution', days),
      getRiskMatrix: (days: number) => ipcRenderer.invoke('analytics:get-risk-matrix', days),
      getKpis: () => ipcRenderer.invoke('analytics:get-kpis'),
    },
    zones: {
      list: () => ipcRenderer.invoke('zones:list'),
    },
    workers: {
      getAll: (params?: { search?: string; isContractWorker?: boolean; department?: string; limit?: number; offset?: number }) =>
        ipcRenderer.invoke('workers:get-all', params ?? {}),
      getCounts: () => ipcRenderer.invoke('workers:get-counts'),
      getById: (id: string) => ipcRenderer.invoke('workers:get-by-id', id),
      checkin: (workerId: string, zoneId: string, method: string) =>
        ipcRenderer.invoke('workers:checkin', workerId, zoneId, method),
      checkout: (workerId: string) => ipcRenderer.invoke('workers:checkout', workerId),
      update: (params: { id: string; name?: string; employee_id?: string; role?: string; department?: string; phone?: string; is_contract_worker?: number; contractor_company?: string; language_preference?: string }) =>
        ipcRenderer.invoke('workers:update', params),
    },
  },
  sync: {
    getStats: () => ipcRenderer.invoke('sync:get-stats'),
    retryFailed: () => ipcRenderer.invoke('sync:retry-failed'),
    forceFullSync: () => ipcRenderer.invoke('sync:force-full-sync'),
    updateConfig: (config: { projectId: string; serviceAccountJson?: string }) => ipcRenderer.invoke('sync:update-firebase-config', config),
    onOnline: (cb: () => void) => {
      ipcRenderer.on('sync:online', cb);
      return () => ipcRenderer.removeListener('sync:online', cb);
    },
    onOffline: (cb: () => void) => {
      ipcRenderer.on('sync:offline', cb);
      return () => ipcRenderer.removeListener('sync:offline', cb);
    },
  },
  admin: {
    org: {
      updateProfile: (params: Record<string, unknown>) => ipcRenderer.invoke('org:update-profile', params),
      getProfile: () => ipcRenderer.invoke('org:get-profile'),
    },
    users: {
      getAll: (organizationId: string) => ipcRenderer.invoke('users:get-all', organizationId),
      create: (params: Record<string, unknown>) => ipcRenderer.invoke('users:create', params),
      updateRole: (params: { userId: string; newRole: string; updatedBy: string }) => ipcRenderer.invoke('users:update-role', params),
      deactivate: (params: { userId: string; deactivatedBy: string }) => ipcRenderer.invoke('users:deactivate', params),
      activate: (params: { userId: string; activatedBy: string }) => ipcRenderer.invoke('users:activate', params),
      changePassword: (params: { userId: string; currentPassword: string; newPassword: string; changedBy: string }) => ipcRenderer.invoke('users:change-password', params),
      verifyPassword: (params: { userId: string; password: string }) => ipcRenderer.invoke('users:verify-password', params),
      hasUsers: () => ipcRenderer.invoke('users:has-users'),
      defaultAdminCreated: () => ipcRenderer.invoke('users:default-admin-created'),
      ensureDefaultAdmin: () => ipcRenderer.invoke('users:ensure-default-admin'),
    },
    login: (params: { username: string; password: string }) => ipcRenderer.invoke('users:login', params),
    floors: {
      getAll: () => ipcRenderer.invoke('floors:get-all'),
      update: (params: Record<string, unknown>) => ipcRenderer.invoke('floors:update', params),
    },
    zones: {
      getAll: (floorId?: string) => ipcRenderer.invoke('zones:get-all', floorId),
      create: (params: Record<string, unknown>) => ipcRenderer.invoke('zones:create', params),
      update: (params: Record<string, unknown>) => ipcRenderer.invoke('zones:update', params),
      delete: (params: { id: string; userId: string }) => ipcRenderer.invoke('zones:delete', params),
    },
    sensors: {
      create: (params: Record<string, unknown>) => ipcRenderer.invoke('sensors:create', params),
      update: (params: Record<string, unknown>) => ipcRenderer.invoke('sensors:update', params),
      delete: (params: { id: string; userId: string }) => ipcRenderer.invoke('sensors:delete', params),
      testConnection: (sensorId: string) => ipcRenderer.invoke('sensors:test-connection', sensorId),
    },
    cameras: {
      create: (params: Record<string, unknown>) => ipcRenderer.invoke('cameras:create', params),
      update: (params: Record<string, unknown>) => ipcRenderer.invoke('cameras:update', params),
      delete: (params: { id: string; userId: string }) => ipcRenderer.invoke('cameras:delete', params),
      testConnection: (cameraId: string) => ipcRenderer.invoke('cameras:test-connection', cameraId),
    },
    ppeRules: { update: (params: { zoneId: string; rules: string; userId: string }) => ipcRenderer.invoke('ppe-rules:update', params) },
    hierarchy: {
      get: () => ipcRenderer.invoke('hierarchy:get'),
      updateLevel: (params: Record<string, unknown>) => ipcRenderer.invoke('hierarchy:update-level', params),
      addContact: (params: Record<string, unknown>) => ipcRenderer.invoke('hierarchy:add-contact', params),
      removeContact: (params: { contactId: string; userId: string }) => ipcRenderer.invoke('hierarchy:remove-contact', params),
    },
    system: {
      getInfo: () => ipcRenderer.invoke('system:get-info'),
      exportDatabase: () => ipcRenderer.invoke('system:export-database'),
      clearOldData: (params: Record<string, unknown>) => ipcRenderer.invoke('system:clear-old-data', params),
    },
    auditLog: { get: (params: Record<string, unknown>) => ipcRenderer.invoke('audit-log:get', params) },
  },
  settings: {
    saveCredentials: (creds: Record<string, string>) => ipcRenderer.invoke('settings:save-credentials', creds),
    testSMS: (phone: string) => ipcRenderer.invoke('settings:test-sms', phone),
    testWhatsApp: (phone: string) => ipcRenderer.invoke('settings:test-whatsapp', phone),
    hasCredentials: () => ipcRenderer.invoke('settings:has-credentials'),
    getDeliveryStats: (hours: number) => ipcRenderer.invoke('settings:get-delivery-stats', hours),
    getQueueStatus: () => ipcRenderer.invoke('settings:get-queue-status'),
    retryFailed: () => ipcRenderer.invoke('settings:retry-failed'),
  },
  updater: {
    onUpdateAvailable: (cb: (info: unknown) => void) => {
      const sub = (_: unknown, info: unknown) => cb(info);
      ipcRenderer.on('update:available', sub);
      return () => ipcRenderer.removeListener('update:available', sub);
    },
    onUpdateDownloaded: (cb: (info: unknown) => void) => {
      const sub = (_: unknown, info: unknown) => cb(info);
      ipcRenderer.on('update:downloaded', sub);
      return () => ipcRenderer.removeListener('update:downloaded', sub);
    },
    onDownloadProgress: (cb: (info: unknown) => void) => {
      const sub = (_: unknown, info: unknown) => cb(info);
      ipcRenderer.on('update:progress', sub);
      return () => ipcRenderer.removeListener('update:progress', sub);
    },
    installUpdate: () => ipcRenderer.invoke('updater:install'),
  },
  reports: {
    generate: (config: Record<string, unknown>) => ipcRenderer.invoke('reports:generate', config),
    getList: () => ipcRenderer.invoke('reports:get-list'),
    open: (filePath: string) => ipcRenderer.invoke('reports:open', { filePath }),
    delete: (filePath: string) => ipcRenderer.invoke('reports:delete', { filePath }),
    openFolder: () => ipcRenderer.invoke('reports:open-folder'),
    onProgress: (cb: (job: unknown) => void) => {
      const subscription = (_: unknown, job: unknown) => cb(job);
      ipcRenderer.on('reports:progress', subscription);
      return () => ipcRenderer.removeListener('reports:progress', subscription);
    },
  },
  engine: {
    acknowledgeAlert: (incidentId: string, userId: string) =>
      ipcRenderer.invoke('engine:acknowledge-alert', incidentId, userId),
    resolveIncident: (incidentId: string, userId: string, notes: string) =>
      ipcRenderer.invoke('engine:resolve-incident', incidentId, userId, notes),
    getState: () => ipcRenderer.invoke('engine:get-state'),
    getZoneHistory: (zoneId: string, hours: number) =>
      ipcRenderer.invoke('engine:get-zone-history', zoneId, hours),
    setSimulationMode: (enabled: boolean) =>
      ipcRenderer.invoke('engine:set-simulation-mode', enabled),
    onScoreUpdate: (cb: (data: unknown) => void) => {
      const subscription = (_: unknown, data: unknown) => cb(data);
      ipcRenderer.on(ENGINE_SCORE_UPDATE, subscription);
      return () => ipcRenderer.removeAllListeners(ENGINE_SCORE_UPDATE);
    },
    onAlertFired: (cb: (data: unknown) => void) => {
      const subscription = (_: unknown, data: unknown) => cb(data);
      ipcRenderer.on(ENGINE_ALERT_FIRED, subscription);
      return () => ipcRenderer.removeAllListeners(ENGINE_ALERT_FIRED);
    },
    onAlertEscalated: (cb: (data: unknown) => void) => {
      const subscription = (_: unknown, data: unknown) => cb(data);
      ipcRenderer.on(ENGINE_ALERT_ESCALATED, subscription);
      return () => ipcRenderer.removeAllListeners(ENGINE_ALERT_ESCALATED);
    },
    onSensorReading: (cb: (data: unknown) => void) => {
      const subscription = (_: unknown, data: unknown) => cb(data);
      ipcRenderer.on(ENGINE_SENSOR_READING, subscription);
      return () => ipcRenderer.removeAllListeners(ENGINE_SENSOR_READING);
    },
    onEngineStatus: (cb: (data: unknown) => void) => {
      const subscription = (_: unknown, data: unknown) => cb(data);
      ipcRenderer.on(ENGINE_STATUS, subscription);
      return () => ipcRenderer.removeAllListeners(ENGINE_STATUS);
    },
    onIncidentResolved: (cb: (data: unknown) => void) => {
      const subscription = (_: unknown, data: unknown) => cb(data);
      ipcRenderer.on(ENGINE_INCIDENT_RESOLVED, subscription);
      return () => ipcRenderer.removeAllListeners(ENGINE_INCIDENT_RESOLVED);
    },
  },
  events: {
    on: (channel: string, callback: (payload: unknown) => void) => {
      const subscription = (_: unknown, payload: unknown) => callback(payload);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
    off: (channel: string) => ipcRenderer.removeAllListeners(channel),
    emit: (channel: string, payload?: unknown) => ipcRenderer.send(channel, payload),
  },
});
