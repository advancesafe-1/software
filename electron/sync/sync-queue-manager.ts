import type Database from 'better-sqlite3';
import type { SyncPriority, SyncQueueItem, SyncStats } from './sync-types';
import { TABLE_PRIORITIES, SYNC_BATCH_SIZE, MAX_SYNC_RETRIES } from './sync-constants';

type Db = InstanceType<typeof Database>;

const PRIORITY_ORDER: SyncPriority[] = ['critical', 'high', 'normal', 'low'];

interface EnqueueInput {
  tableName: string;
  recordId: string;
  operation: 'insert' | 'update';
  payload: Record<string, unknown>;
  priority?: SyncPriority;
}

export class SyncQueueManager {
  constructor(private db: Db) {}

  enqueue(items: EnqueueInput[]): void {
    if (items.length === 0) return;
    const stmt = this.db.prepare(
      `INSERT INTO sync_queue (id, table_name, record_id, operation, payload_json, priority, attempts, status)
       VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, 0, 'pending')`
    );
    const updateStmt = this.db.prepare(
      `UPDATE sync_queue SET payload_json = ?, operation = ? WHERE table_name = ? AND record_id = ? AND status = 'pending'`
    );
    const run = this.db.transaction(() => {
      for (const it of items) {
        const priority = it.priority ?? TABLE_PRIORITIES[it.tableName] ?? 'normal';
        const payloadJson = JSON.stringify(it.payload);
        const existing = this.db
          .prepare('SELECT id FROM sync_queue WHERE table_name = ? AND record_id = ? AND status = ?')
          .get(it.tableName, it.recordId, 'pending') as { id: string } | undefined;
        if (existing) {
          updateStmt.run(payloadJson, it.operation, it.tableName, it.recordId);
        } else {
          stmt.run(it.tableName, it.recordId, it.operation, payloadJson, priority);
        }
      }
    });
    run();
  }

  getNextBatch(priority?: SyncPriority, limit: number = SYNC_BATCH_SIZE): SyncQueueItem[] {
    const orderClause = PRIORITY_ORDER.map((p) => `CASE priority WHEN '${p}' THEN ${PRIORITY_ORDER.indexOf(p)} END`).join(', ');
    const sql = priority
      ? `SELECT id, table_name as tableName, record_id as recordId, operation, payload_json as payloadJson, priority, attempts, last_attempt_at as lastAttemptAt, synced_at as syncedAt, status, created_at as createdAt FROM sync_queue WHERE status = 'pending' AND priority = ? ORDER BY created_at ASC LIMIT ?`
      : `SELECT id, table_name as tableName, record_id as recordId, operation, payload_json as payloadJson, priority, attempts, last_attempt_at as lastAttemptAt, synced_at as syncedAt, status, created_at as createdAt FROM sync_queue WHERE status = 'pending' ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, created_at ASC LIMIT ?`;
    const rows = (priority
      ? this.db.prepare(sql).all(priority, limit)
      : this.db.prepare(sql).all(limit)) as SyncQueueItem[];
    if (rows.length === 0) return [];
    const updateStmt = this.db.prepare(
      `UPDATE sync_queue SET status = 'syncing', last_attempt_at = datetime('now') WHERE id = ?`
    );
    const run = this.db.transaction(() => {
      for (const r of rows) {
        updateStmt.run(r.id);
      }
    });
    run();
    return rows;
  }

  markSynced(ids: string[]): void {
    if (ids.length === 0) return;
    const stmt = this.db.prepare(
      `UPDATE sync_queue SET status = 'synced', synced_at = datetime('now') WHERE id = ?`
    );
    const run = this.db.transaction(() => {
      for (const id of ids) {
        stmt.run(id);
      }
    });
    run();
  }

  markFailed(id: string, error: string): void {
    const row = this.db.prepare('SELECT attempts FROM sync_queue WHERE id = ?').get(id) as { attempts: number } | undefined;
    const attempts = row?.attempts ?? 0;
    if (attempts < MAX_SYNC_RETRIES) {
      this.db
        .prepare(
          `UPDATE sync_queue SET status = 'pending', attempts = attempts + 1, last_attempt_at = datetime('now') WHERE id = ?`
        )
        .run(id);
    } else {
      this.db.prepare(`UPDATE sync_queue SET status = 'failed' WHERE id = ?`).run(id);
    }
  }

  getStats(): SyncStats {
    const pending = (this.db.prepare('SELECT COUNT(*) as c FROM sync_queue WHERE status = ?').get('pending') as { c: number }).c;
    const synced = (this.db.prepare('SELECT COUNT(*) as c FROM sync_queue WHERE status = ?').get('synced') as { c: number }).c;
    const failed = (this.db.prepare('SELECT COUNT(*) as c FROM sync_queue WHERE status = ?').get('failed') as { c: number }).c;
    const lastRow = this.db.prepare('SELECT MAX(synced_at) as t FROM sync_queue WHERE status = ?').get('synced') as { t: string | null };
    return {
      totalPending: pending,
      totalSynced: synced,
      totalFailed: failed,
      lastSyncAt: lastRow?.t ?? null,
      isOnline: false,
      isSyncing: false,
      firebaseConfigured: false,
    };
  }

  clearSynced(olderThanDays: number = 7): void {
    this.db.prepare(`DELETE FROM sync_queue WHERE status = 'synced' AND synced_at < datetime('now', '-' || ? || ' days')`).run(olderThanDays);
  }

  requeueFailed(): void {
    this.db.prepare(`UPDATE sync_queue SET status = 'pending', attempts = 0 WHERE status = 'failed'`).run();
  }

  resumePending(): void {
    this.db.prepare(`UPDATE sync_queue SET status = 'pending' WHERE status = 'syncing'`).run();
  }
}
