import type Database from 'better-sqlite3';
import { getDb } from '../services/database';
import { credentialsService, type StoredCredentials } from '../services/credentials-service';
import { getMainWindow } from '../services/window-manager';
import { DeliveryQueue, type QueuedDeliveryRow } from './delivery-queue';
import type { AlertChannel } from './delivery-types';
import type { AlertMessageData } from './message-templates';
import { buildSMSMessage, buildWhatsAppMessage, buildDesktopTitle, buildDesktopBody } from './message-templates';
import { sendDesktopNotification, setDesktopChannelGetWindow } from './channels/desktop-channel';
import { sendSMS } from './channels/sms-channel';
import { sendWhatsApp } from './channels/whatsapp-channel';
import { sendPush, setPushChannelGetDb } from './channels/push-channel';

type Db = InstanceType<typeof Database>;

export interface IncidentForAlert {
  id: string;
  zone_id: string;
  title: string;
  severity: string;
  triggered_at: string;
  sensor_id: string | null;
}

export interface OrganizationForAlert {
  id: string;
  name: string;
}

export interface ContactForAlert {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
}

export interface SensorForAlert {
  name: string;
  value: number;
  unit: string;
  threshold?: number;
}

export interface QueueAlertParams {
  incident: IncidentForAlert;
  hierarchyLevel: number;
  contacts: ContactForAlert[];
  organization: OrganizationForAlert;
  zoneName: string;
  floorName: string;
  sensor?: SensorForAlert | null;
}

let queue: DeliveryQueue | null = null;
let processingInterval: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;

function getContactById(db: Db, contactId: string): ContactForAlert | null {
  const row = db.prepare('SELECT id, name, phone, email, whatsapp FROM alert_contacts WHERE id = ?').get(contactId) as ContactForAlert | undefined;
  return row ?? null;
}

function logDeliveryAttempt(db: Db, deliveryQueueId: string, incidentId: string, channel: string, contactId: string | null, status: string, errorMessage: string | null): void {
  try {
    db.prepare(
      `INSERT INTO alert_log (id, delivery_queue_id, incident_id, channel, contact_id, status, error_message) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?)`
    ).run(deliveryQueueId, incidentId, channel, contactId, status, errorMessage);
  } catch {
    // ignore
  }
}

async function deliverItem(db: Db, item: QueuedDeliveryRow, creds: Partial<StoredCredentials>, orgId: string, messageData: AlertMessageData): Promise<void> {
  const contact = getContactById(db, item.contact_id);
  if (!contact) {
    queue?.markFailed(item.id, 'Contact not found', false);
    return;
  }
  const channel = item.channel as AlertChannel;
  let result: { success: boolean; error?: string; retry?: boolean; skipped?: boolean };
  if (channel === 'sms') {
    result = await sendSMS(item, contact, creds as StoredCredentials, messageData, orgId);
  } else if (channel === 'whatsapp') {
    result = await sendWhatsApp(item, contact, creds as StoredCredentials, messageData);
  } else if (channel === 'push') {
    result = await sendPush(item, contact, creds as StoredCredentials, messageData);
  } else {
    result = { success: false, error: 'Unknown channel', retry: false };
  }
  if (result.success) {
    if (!result.skipped) queue?.markDelivered(item.id);
    logDeliveryAttempt(db, item.id, item.incident_id, channel, item.contact_id, result.skipped ? 'skipped' : 'delivered', null);
  } else {
    queue?.markFailed(item.id, result.error ?? 'Unknown', result.retry ?? true);
    logDeliveryAttempt(db, item.id, item.incident_id, channel, item.contact_id, 'failed', result.error ?? null);
  }
}

async function processQueue(): Promise<void> {
  if (!queue || isProcessing) return;
  const db = getDb();
  if (!db) return;
  isProcessing = true;
  try {
    const batch = queue.getNextBatch(5);
    if (batch.length === 0) return;
    const creds = await credentialsService.getCredentials();
    const inc0 = db.prepare('SELECT zone_id FROM incidents WHERE id = ?').get(batch[0].incident_id) as { zone_id: string } | undefined;
    const zone0 = inc0 ? (db.prepare('SELECT floor_id FROM zones WHERE id = ?').get(inc0.zone_id) as { floor_id: string } | undefined) : undefined;
    const floor0 = zone0 ? (db.prepare('SELECT organization_id FROM floors WHERE id = ?').get(zone0.floor_id) as { organization_id: string } | undefined) : undefined;
    const orgId = floor0?.organization_id;
    if (!orgId) {
      for (const it of batch) queue.markFailed(it.id, 'Organization not found', false);
      return;
    }
    for (const item of batch) {
      const inc = db.prepare('SELECT id, zone_id, title, severity, triggered_at FROM incidents WHERE id = ?').get(item.incident_id) as { id: string; zone_id: string; title: string; severity: string; triggered_at: string } | undefined;
      const zone = inc ? (db.prepare('SELECT name, floor_id FROM zones WHERE id = ?').get(inc.zone_id) as { name: string; floor_id: string } | undefined) : undefined;
      const floor = zone ? (db.prepare('SELECT name FROM floors WHERE id = ?').get(zone.floor_id) as { name: string } | undefined) : undefined;
      const org = db.prepare('SELECT id, name FROM organizations WHERE id = ?').get(orgId) as { id: string; name: string } | undefined;
      if (!inc || !zone || !floor || !org) {
        queue.markFailed(item.id, 'Missing data', false);
        continue;
      }
      const messageData: AlertMessageData = {
        orgName: org.name,
        zoneName: zone.name,
        floorName: floor.name,
        severity: inc.severity,
        title: inc.title,
        triggeredAt: inc.triggered_at,
        incidentId: inc.id,
      };
      await deliverItem(db, item, creds, orgId, messageData);
    }
  } catch {
    // ignore
  } finally {
    isProcessing = false;
  }
}

export async function queueAlert(params: QueueAlertParams): Promise<void> {
  const db = getDb();
  if (!db) return;
  if (!queue) return;
  const { incident, hierarchyLevel, contacts, organization, zoneName, floorName, sensor } = params;
  const messageData: AlertMessageData = {
    orgName: organization.name,
    zoneName,
    floorName,
    severity: incident.severity,
    title: incident.title,
    sensorName: sensor?.name,
    sensorValue: sensor?.value != null ? String(sensor.value) : undefined,
    sensorUnit: sensor?.unit,
    threshold: sensor?.threshold != null ? String(sensor.threshold) : undefined,
    triggeredAt: incident.triggered_at,
    incidentId: incident.id,
  };
  const desktopItem = { incidentId: incident.id, severity: incident.severity, zoneId: incident.zone_id, messageData };
  await sendDesktopNotification(desktopItem, messageData);
  const hasCreds = await credentialsService.hasCredentials();
  const creds = await credentialsService.getCredentials();
  const items: { incidentId: string; hierarchyLevel: number; contactId: string; channel: AlertChannel; messageBody: string }[] = [];
  for (const contact of contacts) {
    if (contact.phone && hasCreds) {
      items.push({
        incidentId: incident.id,
        hierarchyLevel,
        contactId: contact.id,
        channel: 'sms',
        messageBody: buildSMSMessage(messageData),
      });
    }
    if (contact.whatsapp && hasCreds) {
      items.push({
        incidentId: incident.id,
        hierarchyLevel,
        contactId: contact.id,
        channel: 'whatsapp',
        messageBody: buildWhatsAppMessage(messageData),
      });
    }
    items.push({
      incidentId: incident.id,
      hierarchyLevel,
      contactId: contact.id,
      channel: 'push',
      messageBody: buildDesktopBody(messageData),
    });
  }
  if (items.length > 0) queue.enqueue(items);
}

export function cancelForIncident(incidentId: string): void {
  queue?.cancelForIncident(incidentId);
}

export function initialize(db: Db): void {
  queue = new DeliveryQueue(db);
  queue.resumePending();
  setDesktopChannelGetWindow(() => getMainWindow());
  setPushChannelGetDb(() => getDb());
  processingInterval = setInterval(() => {
    processQueue().catch(() => {});
  }, 2000);
}

export function shutdown(): void {
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
  }
  queue = null;
}
