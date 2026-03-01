export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export type SyncPriority = 'critical' | 'high' | 'normal' | 'low';

export interface SyncQueueItem {
  id: string;
  tableName: string;
  recordId: string;
  operation: 'insert' | 'update' | 'delete';
  payloadJson: string;
  priority: SyncPriority;
  attempts: number;
  lastAttemptAt: string | null;
  syncedAt: string | null;
  status: SyncStatus;
  createdAt: string;
}

export interface SyncStats {
  totalPending: number;
  totalSynced: number;
  totalFailed: number;
  lastSyncAt: string | null;
  isOnline: boolean;
  isSyncing: boolean;
  firebaseConfigured: boolean;
}

export interface LiveStatusDocument {
  overallScore: number;
  status: string;
  activeIncidents: number;
  sensorsOnline: number;
  lastUpdated: unknown;
  isOnline: boolean;
  appVersion?: string;
}

export interface SyncResult {
  success: boolean;
  recordsSynced: number;
  errors: string[];
}
