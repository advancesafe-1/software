import type Database from 'better-sqlite3';
import type { AlertChannel } from './delivery-types';

type Db = InstanceType<typeof Database>;

export interface QueueItem {
  incidentId: string;
  hierarchyLevel: number;
  contactId: string;
  channel: AlertChannel;
  messageBody: string;
}

export interface QueuedDeliveryRow {
  id: string;
  incident_id: string;
  hierarchy_level: number;
  contact_id: string;
  channel: string;
  message_body: string;
  status: string;
  attempts: number;
  last_attempt_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
  created_at: string;
}

export class DeliveryQueue {
  constructor(private db: Db) {}

  enqueue(items: QueueItem[]): void {
    if (items.length === 0) return;
    const stmt = this.db.prepare(
      `INSERT INTO alert_delivery_queue (id, incident_id, hierarchy_level, contact_id, channel, message_body, status, attempts)
       VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, 'pending', 0)`
    );
    const run = this.db.transaction(() => {
      for (const it of items) {
        stmt.run(it.incidentId, it.hierarchyLevel, it.contactId, it.channel, it.messageBody);
      }
    });
    run();
  }

  getNextBatch(limit: number = 10): QueuedDeliveryRow[] {
    const rows = this.db
      .prepare(
        `SELECT id, incident_id, hierarchy_level, contact_id, channel, message_body, status, attempts, last_attempt_at, delivered_at, error_message, created_at
         FROM alert_delivery_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?`
      )
      .all(limit) as QueuedDeliveryRow[];
    if (rows.length === 0) return [];
    const update = this.db.prepare(`UPDATE alert_delivery_queue SET status = 'sending', last_attempt_at = datetime('now') WHERE id = ?`);
    const run = this.db.transaction(() => {
      for (const r of rows) {
        update.run(r.id);
      }
    });
    run();
    return rows;
  }

  markDelivered(id: string): void {
    this.db
      .prepare(`UPDATE alert_delivery_queue SET status = 'delivered', delivered_at = datetime('now') WHERE id = ?`)
      .run(id);
  }

  markFailed(id: string, error: string, retry: boolean): void {
    const row = this.db.prepare('SELECT attempts FROM alert_delivery_queue WHERE id = ?').get(id) as { attempts: number } | undefined;
    const attempts = row?.attempts ?? 0;
    if (retry && attempts < 4) {
      this.db
        .prepare(
          `UPDATE alert_delivery_queue SET status = 'pending', attempts = attempts + 1, last_attempt_at = datetime('now'), error_message = ? WHERE id = ?`
        )
        .run(error.slice(0, 500), id);
    } else {
      this.db
        .prepare(`UPDATE alert_delivery_queue SET status = 'failed', error_message = ? WHERE id = ?`)
        .run(error.slice(0, 500), id);
    }
  }

  cancelForIncident(incidentId: string): void {
    this.db
      .prepare(`UPDATE alert_delivery_queue SET status = 'cancelled' WHERE incident_id = ? AND status = 'pending'`)
      .run(incidentId);
  }

  resumePending(): void {
    this.db.prepare(`UPDATE alert_delivery_queue SET status = 'pending' WHERE status = 'sending'`).run();
  }

  getDeliveryStats(incidentId: string): { total: number; delivered: number; failed: number; pending: number } {
    const rows = this.db
      .prepare(
        `SELECT status, COUNT(*) as c FROM alert_delivery_queue WHERE incident_id = ? GROUP BY status`
      )
      .all(incidentId) as { status: string; c: number }[];
    let total = 0;
    let delivered = 0;
    let failed = 0;
    let pending = 0;
    for (const r of rows) {
      total += r.c;
      if (r.status === 'delivered') delivered += r.c;
      else if (r.status === 'failed') failed += r.c;
      else if (r.status === 'pending' || r.status === 'sending') pending += r.c;
    }
    return { total, delivered, failed, pending };
  }
}
