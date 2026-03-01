import { Notification } from 'electron';
import * as path from 'path';
import type { DeliveryResult } from '../delivery-types';
import type { AlertMessageData } from '../message-templates';
import { buildDesktopTitle, buildDesktopBody } from '../message-templates';

export interface DesktopDeliveryItem {
  incidentId: string;
  severity: string;
  zoneId?: string;
  messageData: AlertMessageData;
}

type GetWindowFn = () => { focus: () => void; webContents: { send: (ch: string, payload: string) => void } } | null;

let getMainWindow: GetWindowFn | null = null;

export function setDesktopChannelGetWindow(fn: GetWindowFn): void {
  getMainWindow = fn;
}

export async function sendDesktopNotification(
  item: DesktopDeliveryItem,
  messageData: AlertMessageData
): Promise<DeliveryResult> {
  try {
    if (!Notification.isSupported()) {
      return { success: false, error: 'Not supported', retry: false };
    }
    const title = buildDesktopTitle(messageData);
    const body = buildDesktopBody(messageData);
    const iconPath = path.join(__dirname, '../../../assets/icon.png');
    const notification = new Notification({ title, body, icon: iconPath });
    notification.on('click', () => {
      const win = getMainWindow?.();
      if (win) {
        win.focus();
        win.webContents.send('navigate', '/incidents');
      }
    });
    notification.show();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      retry: false,
    };
  }
}
