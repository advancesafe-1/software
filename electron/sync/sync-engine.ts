import * as admin from 'firebase-admin';
import { app } from 'electron';
import type Database from 'better-sqlite3';
import { credentialsService } from '../services/credentials-service';
import { getMainWindow } from '../services/window-manager';
import { firebaseClient } from './firebase-client';
import { SyncQueueManager } from './sync-queue-manager';
import type { SyncPriority, SyncQueueItem, SyncStats } from './sync-types';
import { SYNC_INTERVALS, SYNC_BATCH_SIZE, SENSOR_READINGS_RETENTION_DAYS } from './sync-constants';
import { transformIncident } from './transformers/incident-transformer';
import type { IncidentRow } from './transformers/incident-transformer';
import { transformScore } from './transformers/score-transformer';
import type { GuardianScoreRow } from './transformers/score-transformer';
import { transformReading } from './transformers/sensor-transformer';
import type { SensorReadingRow } from './transformers/sensor-transformer';

type Db = InstanceType<typeof Database>;

function loadOrgFromDB(database: Db): { id: string; name: string; city: string | null; state: string | null; industry_type: string | null; total_workers: number; is_active: number; activated_at: string | null } | null {
  const row = database.prepare('SELECT id, name, city, state, industry_type, total_workers, is_active, activated_at FROM organizations WHERE is_active = 1 LIMIT 1').get() as { id: string; name: string; city: string | null; state: string | null; industry_type: string | null; total_workers: number; is_active: number; activated_at: string | null } | undefined;
  return row ?? null;
}

export class SyncEngine {
  private queueManager!: SyncQueueManager;
  private isOnline = false;
  private isSyncing = false;
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private orgId: string | null = null;
  private orgName: string | null = null;
  private db: Db | null = null;
  private getEngineState: (() => { overallScore: number | null; overallStatus: string | null; activeIncidents: number; sensorsMonitored: number }) | null = null;

  async initialize(database: Db, getState?: () => { overallScore: number | null; overallStatus: string | null; activeIncidents: number; sensorsMonitored: number }): Promise<void> {
    this.getEngineState = getState ?? null;
    this.db = database;
    this.queueManager = new SyncQueueManager(database);
    this.queueManager.resumePending();
    const org = loadOrgFromDB(database);
    if (!org) return;
    this.orgId = org.id;
    this.orgName = org.name;
    const creds = await credentialsService.getCredentials();
    if (creds.firebaseProjectId?.trim()) {
      await firebaseClient.initialize({
        projectId: creds.firebaseProjectId.trim(),
        serviceAccountJson: creds.firebaseServiceAccountJson?.trim(),
      });
    }
    this.isOnline = await this.checkConnectivity();
    this.startTimers();
    if (this.isOnline) {
      await this.syncOrganizationProfile();
      await this.syncConfiguration();
    }
  }

  private startTimers(): void {
    this.timers.set(
      'liveStatus',
      setInterval(() => {
        this.syncLiveStatus().catch(() => {});
      }, SYNC_INTERVALS.liveStatus)
    );
    this.timers.set(
      'incidents',
      setInterval(() => {
        this.syncPendingQueue('critical').catch(() => {});
      }, SYNC_INTERVALS.incidents)
    );
    this.timers.set(
      'normal',
      setInterval(() => {
        this.syncPendingQueue('normal').catch(() => {});
      }, SYNC_INTERVALS.guardianScores)
    );
    this.timers.set(
      'historical',
      setInterval(() => {
        this.syncPendingQueue('low').catch(() => {});
        this.cleanupOldReadings().catch(() => {});
      }, SYNC_INTERVALS.historical)
    );
    this.timers.set(
      'connectivity',
      setInterval(() => {
        this.checkAndUpdateConnectivity().catch(() => {});
      }, 30_000)
    );
  }

  private async syncLiveStatus(): Promise<void> {
    if (!this.isOnline || !this.orgId) return;
    try {
      const state = this.getEngineState?.();
      if (!state) return;
      const activeCount = state.activeIncidents;
      const sensorCount = state.sensorsMonitored;
      const overallScore = state.overallScore ?? 0;
      const status = state.overallStatus ?? 'unknown';
      const liveStatus: Record<string, unknown> = {
        overallScore,
        status,
        activeIncidents: activeCount,
        sensorsOnline: sensorCount,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        isOnline: true,
        appVersion: app.getVersion(),
      };
      await firebaseClient.setDocument(`organizations/${this.orgId}/live_status`, liveStatus);
      await firebaseClient.setDocument(`system/installations/${this.orgId}`, {
        orgName: this.orgName,
        lastSeen: new Date().toISOString(),
        isOnline: true,
        appVersion: app.getVersion(),
      });
    } catch {
      // ignore
    }
  }

  private async syncPendingQueue(priority: SyncPriority): Promise<void> {
    if (!this.isOnline || !this.orgId) return;
    if (this.isSyncing) return;
    this.isSyncing = true;
    let batch: SyncQueueItem[] = [];
    try {
      batch = this.queueManager.getNextBatch(priority, SYNC_BATCH_SIZE);
      if (batch.length === 0) return;
      const operations = batch.map((item: SyncQueueItem) => {
        const payload = JSON.parse(item.payloadJson) as Record<string, unknown>;
        const path = this.buildFirestorePath(item.tableName, item.recordId);
        return { path, data: payload };
      });
      const success = await firebaseClient.batchWrite(operations);
      if (success) {
        this.queueManager.markSynced(batch.map((i) => i.id));
      } else {
        batch.forEach((item) => this.queueManager.markFailed(item.id, 'Batch write failed'));
      }
    } catch {
      batch.forEach((item) => this.queueManager.markFailed(item.id, 'Sync error'));
    } finally {
      this.isSyncing = false;
    }
  }

  private buildFirestorePath(tableName: string, recordId: string): string {
    const collectionMap: Record<string, string> = {
      incidents: 'incidents',
      guardian_scores: 'guardian_scores',
      sensor_readings: 'sensor_readings',
      workers: 'workers',
      audit_log: 'audit_log',
      alert_log: 'alert_log',
      worker_checkins: 'worker_checkins',
    };
    const collection = collectionMap[tableName] ?? tableName;
    return `organizations/${this.orgId}/${collection}/${recordId}`;
  }

  private async syncOrganizationProfile(): Promise<void> {
    if (!this.orgId || !this.db) return;
    const org = loadOrgFromDB(this.db);
    if (!org) return;
    try {
      await firebaseClient.setDocument(`organizations/${this.orgId}`, {
        id: org.id,
        name: org.name,
        city: org.city,
        state: org.state,
        industryType: org.industry_type,
        totalWorkers: org.total_workers,
        isActive: Boolean(org.is_active),
        activatedAt: org.activated_at,
      });
    } catch {
      // ignore
    }
  }

  private async syncConfiguration(): Promise<void> {
    // Floors, zones, sensor configs - run once on startup
    if (!this.orgId || !this.db) return;
    try {
      const floors = this.db.prepare('SELECT id, name, floor_number, description FROM floors WHERE organization_id = ?').all(this.orgId) as { id: string; name: string; floor_number: number; description: string | null }[];
      for (const f of floors) {
        await firebaseClient.setDocument(`organizations/${this.orgId}/floors/${f.id}`, {
          id: f.id,
          name: f.name,
          floorNumber: f.floor_number,
          description: f.description ?? null,
        });
      }
      const zones = this.db.prepare('SELECT z.id, z.name, z.zone_type, z.floor_id FROM zones z JOIN floors f ON f.id = z.floor_id WHERE f.organization_id = ?').all(this.orgId) as { id: string; name: string; zone_type: string; floor_id: string }[];
      for (const z of zones) {
        await firebaseClient.setDocument(`organizations/${this.orgId}/zones/${z.id}`, {
          id: z.id,
          name: z.name,
          zoneType: z.zone_type,
          floorId: z.floor_id,
        });
      }
    } catch {
      // ignore
    }
  }

  private async cleanupOldReadings(): Promise<void> {
    if (!this.orgId || !firebaseClient.isInitialized()) return;
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - SENSOR_READINGS_RETENTION_DAYS);
      const cutoffIso = cutoff.toISOString();
      // Firestore doesn't support bulk delete by query easily from client; skip for MVP or use a Cloud Function
      // Placeholder: could list docs and delete in batches
    } catch {
      // ignore
    }
  }

  private async checkAndUpdateConnectivity(): Promise<void> {
    const wasOnline = this.isOnline;
    this.isOnline = await this.checkConnectivity();
    const win = getMainWindow();
    if (!wasOnline && this.isOnline && win && !win.isDestroyed()) {
      try {
        win.webContents.send('sync:online');
      } catch {
        // ignore
      }
      await this.syncPendingQueue('critical');
      await this.syncPendingQueue('high');
    }
    if (wasOnline && !this.isOnline && win && !win.isDestroyed()) {
      try {
        win.webContents.send('sync:offline');
      } catch {
        // ignore
      }
    }
  }

  private async checkConnectivity(): Promise<boolean> {
    if (!firebaseClient.isInitialized()) return false;
    return firebaseClient.checkConnectivity();
  }

  onNewIncident(incident: IncidentRow): void {
    const payload = transformIncident(incident);
    this.queueManager.enqueue([
      { tableName: 'incidents', recordId: incident.id, operation: 'insert', payload, priority: 'critical' },
    ]);
  }

  onScoreUpdate(score: GuardianScoreRow): void {
    const payload = transformScore(score);
    this.queueManager.enqueue([
      { tableName: 'guardian_scores', recordId: score.id, operation: 'insert', payload, priority: 'high' },
    ]);
  }

  onSensorReading(reading: SensorReadingRow): void {
    const payload = transformReading(reading);
    this.queueManager.enqueue([
      { tableName: 'sensor_readings', recordId: reading.id, operation: 'insert', payload, priority: 'normal' },
    ]);
  }

  getSyncStats(): SyncStats {
    const stats = this.queueManager.getStats();
    return {
      ...stats,
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      firebaseConfigured: firebaseClient.isInitialized(),
    };
  }

  requeueFailed(): void {
    this.queueManager.requeueFailed();
  }

  async forceFullSync(): Promise<void> {
    if (!this.db || !this.orgId) return;
    await this.syncOrganizationProfile();
    await this.syncConfiguration();
    await this.syncLiveStatus();
    await this.syncPendingQueue('critical');
    await this.syncPendingQueue('high');
    await this.syncPendingQueue('normal');
    await this.syncPendingQueue('low');
  }

  async updateFirebaseConfig(projectId: string, serviceAccountJson: string): Promise<{ success: boolean; error?: string }> {
    try {
      await credentialsService.saveCredentials({
        firebaseProjectId: projectId.trim(),
        firebaseServiceAccountJson: serviceAccountJson.trim(),
      });
      const ok = await firebaseClient.initialize({
        projectId: projectId.trim(),
        serviceAccountJson: serviceAccountJson.trim() || undefined,
      });
      return ok ? { success: true } : { success: false, error: 'Firebase init failed' };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  shutdown(): void {
    this.timers.forEach((t) => clearInterval(t));
    this.timers.clear();
    if (this.orgId && this.isOnline) {
      firebaseClient.setDocument(`organizations/${this.orgId}/live_status`, { isOnline: false }).catch(() => {});
      firebaseClient.setDocument(`system/installations/${this.orgId}`, { isOnline: false }).catch(() => {});
    }
    firebaseClient.shutdown();
    this.orgId = null;
    this.orgName = null;
    this.db = null;
  }
}

export const syncEngine = new SyncEngine();
