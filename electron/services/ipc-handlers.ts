import { ipcMain } from 'electron';
import * as os from 'os';
import { createHash } from 'crypto';
import { getDb } from './database';
import { safetyEngine } from '../engine/safety-engine';
import { registerFeatureIpcHandlers } from './ipc-features';
import { registerSettingsIpcHandlers } from './ipc-settings';
import { credentialsService } from './credentials-service';
import { syncEngine } from '../sync/sync-engine';
import { reportGenerator } from '../reports/report-generator';
import { autoUpdaterService } from '../updater/auto-updater';

function getVersion(): string {
  try {
    const pkg = require('../../package.json');
    return (pkg as { version?: string }).version ?? '1.0.0';
  } catch {
    return '1.0.0';
  }
}

export function registerIpcHandlers(): void {
  ipcMain.handle('db:query', async (_event, _channel: string, sql: string, params: unknown[] = []) => {
    const db = getDb();
    if (!db) throw new Error('Database not initialized');
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  });

  ipcMain.handle('db:execute', async (_event, _channel: string, sql: string, params: unknown[] = []) => {
    const db = getDb();
    if (!db) throw new Error('Database not initialized');
    const stmt = db.prepare(sql);
    return stmt.run(...params);
  });

  ipcMain.handle('db:transaction', async (_event, _channel: string, fn: () => void) => {
    const db = getDb();
    if (!db) throw new Error('Database not initialized');
    const transaction = db.transaction(fn);
    return transaction();
  });

  ipcMain.handle('system:getHardwareId', async () => {
    const ifaces = os.networkInterfaces();
    let mac = '';
    for (const name of Object.keys(ifaces)) {
      const arr = ifaces[name];
      if (Array.isArray(arr)) {
        for (const iface of arr) {
          if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
            mac = iface.mac;
            break;
          }
        }
      }
      if (mac) break;
    }
    const fallback = os.hostname() + os.platform() + os.arch();
    return createHash('sha256').update(mac || fallback).digest('hex');
  });

  ipcMain.handle('system:getPlatform', () => process.platform);
  ipcMain.handle('system:getVersion', () => getVersion());

  ipcMain.handle('alerts:send', async (_event, _payload: unknown) => {
    return { ok: true };
  });

  ipcMain.handle('engine:acknowledge-alert', async (_event, incidentId: string, userId: string) => {
    await safetyEngine.acknowledgeAlert(incidentId, userId);
  });

  ipcMain.handle('engine:resolve-incident', async (_event, incidentId: string, userId: string, notes: string) => {
    await safetyEngine.resolveIncident(incidentId, userId, notes);
  });

  ipcMain.handle('engine:get-state', async () => safetyEngine.getState());

  ipcMain.handle('engine:get-zone-history', async (_event, zoneId: string, hours: number) =>
    safetyEngine.getZoneHistory(zoneId, hours ?? 24));

  ipcMain.handle('engine:set-simulation-mode', async (_event, enabled: boolean) => {
    safetyEngine.setSimulationMode(Boolean(enabled));
  });

  registerFeatureIpcHandlers();
  registerSettingsIpcHandlers();

  ipcMain.handle('settings:save-credentials', async (_event, creds: { twilioAccountSid?: string; twilioAuthToken?: string; twilioFromPhone?: string; twilioWhatsappFrom?: string; firebaseProjectId?: string }) => {
    try {
      await credentialsService.saveCredentials(creds ?? {});
      const db = getDb();
      if (db) {
        db.prepare(
          `INSERT INTO audit_log (id, action, entity_type, performed_at, synced_to_cloud) VALUES (lower(hex(randomblob(16))), 'credentials_saved', 'settings', datetime('now'), 0)`
        ).run();
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('settings:test-sms', async (_event, testPhone: string) => {
    try {
      const creds = await credentialsService.getCredentials();
      const sid = creds.twilioAccountSid?.trim();
      const token = creds.twilioAuthToken?.trim();
      const from = creds.twilioFromPhone?.trim();
      if (!sid || !token || !from || !testPhone?.trim()) return { success: false, error: 'Missing credentials or phone' };
      const to = testPhone.replace(/\D/g, '').length === 10 ? '+91' + testPhone.replace(/\D/g, '') : testPhone.startsWith('+') ? testPhone : '+' + testPhone.replace(/\D/g, '');
      const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
      const body = new URLSearchParams({ To: to, From: from, Body: 'AdvanceSafe test message. Alerts are configured.' });
      const auth = Buffer.from(sid + ':' + token).toString('base64');
      const res = await fetch(url, { method: 'POST', headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
      if (res.ok) return { success: true };
      const errData = (await res.json()) as { message?: string };
      return { success: false, error: errData.message ?? 'Send failed' };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('settings:test-whatsapp', async (_event, testPhone: string) => {
    try {
      const creds = await credentialsService.getCredentials();
      const sid = creds.twilioAccountSid?.trim();
      const token = creds.twilioAuthToken?.trim();
      const from = creds.twilioWhatsappFrom?.trim();
      if (!sid || !token || !from || !testPhone?.trim()) return { success: false, error: 'Missing credentials or phone' };
      const to = 'whatsapp:+91' + testPhone.replace(/\D/g, '').slice(-10);
      const fromWa = from.startsWith('whatsapp:') ? from : 'whatsapp:' + from;
      const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
      const body = new URLSearchParams({ To: to, From: fromWa, Body: 'AdvanceSafe WhatsApp test. Alerts are configured.' });
      const auth = Buffer.from(sid + ':' + token).toString('base64');
      const res = await fetch(url, { method: 'POST', headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
      if (res.ok) return { success: true };
      const errData = (await res.json()) as { message?: string };
      return { success: false, error: errData.message ?? 'Send failed' };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('settings:has-credentials', async () => credentialsService.hasCredentials());

  ipcMain.handle('settings:get-delivery-stats', async (_event, hours: number) => {
    const db = getDb();
    if (!db) return [];
    const h = Math.min(168, Math.max(1, Number(hours) || 24));
    const rows = db.prepare(
      `SELECT channel, status, COUNT(*) as count FROM alert_delivery_queue WHERE created_at > datetime('now', '-' || ? || ' hours') GROUP BY channel, status`
    ).all(h) as { channel: string; status: string; count: number }[];
    return rows;
  });

  ipcMain.handle('settings:get-queue-status', async () => {
    const db = getDb();
    if (!db) return { pending: 0, sending: 0, failed: 0 };
    const pending = (db.prepare('SELECT COUNT(*) as c FROM alert_delivery_queue WHERE status = ?').get('pending') as { c: number }).c;
    const sending = (db.prepare('SELECT COUNT(*) as c FROM alert_delivery_queue WHERE status = ?').get('sending') as { c: number }).c;
    const failed = (db.prepare('SELECT COUNT(*) as c FROM alert_delivery_queue WHERE status = ?').get('failed') as { c: number }).c;
    return { pending, sending, failed };
  });

  ipcMain.handle('settings:retry-failed', async () => {
    const db = getDb();
    if (!db) return;
    db.prepare(`UPDATE alert_delivery_queue SET status = 'pending', attempts = 0 WHERE status = 'failed' AND created_at > datetime('now', '-24 hours')`).run();
  });

  ipcMain.handle('sync:get-stats', async () => syncEngine.getSyncStats());
  ipcMain.handle('sync:retry-failed', async () => syncEngine.requeueFailed());
  ipcMain.handle('sync:force-full-sync', async () => syncEngine.forceFullSync());
  ipcMain.handle('sync:update-firebase-config', async (_event, config: { projectId: string; serviceAccountJson?: string }) => {
    return syncEngine.updateFirebaseConfig(config?.projectId ?? '', config?.serviceAccountJson ?? '');
  });

  ipcMain.handle('reports:generate', async (event, config: import('../reports/report-types').ReportConfig) => {
    const job = await reportGenerator.generateReport(config, (job) => {
      event.sender.send('reports:progress', job);
    });
    return job;
  });
  ipcMain.handle('reports:get-list', async () => reportGenerator.getReportsList());
  ipcMain.handle('reports:open', async (_event, params: { filePath: string }) => {
    await reportGenerator.openReport(params.filePath);
  });
  ipcMain.handle('reports:delete', async (_event, params: { filePath: string }) => {
    await reportGenerator.deleteReport(params.filePath);
  });
  ipcMain.handle('reports:open-folder', async () => {
    const { shell } = await import('electron');
    await shell.openPath(reportGenerator.getReportsDir());
  });

  ipcMain.handle('updater:install', async () => {
    await autoUpdaterService.installNow();
  });
}
