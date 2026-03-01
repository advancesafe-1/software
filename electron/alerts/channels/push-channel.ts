import type { StoredCredentials } from '../../services/credentials-service';
import type { DeliveryResult } from '../delivery-types';
import type { QueuedDeliveryRow } from '../delivery-queue';
import { buildDesktopTitle, buildDesktopBody } from '../message-templates';
import type { AlertMessageData } from '../message-templates';
import type { AlertContact } from '../delivery-types';

type DbLike = { prepare: (sql: string) => { get: (...args: unknown[]) => unknown } } | null;
let getDb: (() => unknown) | null = null;

export function setPushChannelGetDb(fn: () => unknown): void {
  getDb = fn;
}

export async function sendPush(
  delivery: QueuedDeliveryRow,
  _contact: AlertContact,
  _credentials: StoredCredentials,
  messageData: AlertMessageData
): Promise<DeliveryResult> {
  try {
    const db = getDb?.() as DbLike;
    if (!db) return { success: true, skipped: true };
    const key = 'fcm_token_' + delivery.contact_id;
    const row = db.prepare('SELECT value_encrypted FROM system_config WHERE key = ?').get(key) as { value_encrypted: string | null } | undefined;
    const token = row?.value_encrypted;
    if (!token) return { success: true, skipped: true };
    return { success: true, skipped: true };
  } catch {
    return { success: true, skipped: true };
  }
}
