import type { StoredCredentials } from '../../services/credentials-service';
import type { DeliveryResult } from '../delivery-types';
import type { QueuedDeliveryRow } from '../delivery-queue';
import { buildWhatsAppMessage } from '../message-templates';
import type { AlertMessageData } from '../message-templates';
import type { AlertContact } from '../delivery-types';

function formatWhatsAppNumber(whatsapp: string): string {
  const digits = whatsapp.replace(/\D/g, '');
  if (digits.length === 10) return 'whatsapp:+91' + digits;
  if (digits.startsWith('91')) return 'whatsapp:+' + digits;
  return 'whatsapp:+91' + digits.slice(-10);
}

const NO_RETRY_CODES = [21614, 21408, 21610];

export async function sendWhatsApp(
  delivery: QueuedDeliveryRow,
  contact: AlertContact,
  credentials: StoredCredentials,
  messageData: AlertMessageData
): Promise<DeliveryResult> {
  try {
    const wa = contact.whatsapp?.trim();
    if (!wa) return { success: false, error: 'No WhatsApp number', retry: false };
    const to = formatWhatsAppNumber(wa);
    const sid = credentials.twilioAccountSid?.trim();
    const token = credentials.twilioAuthToken?.trim();
    const from = credentials.twilioWhatsappFrom?.trim();
    if (!sid || !token || !from) return { success: false, error: 'Missing Twilio WhatsApp credentials', retry: false };
    const message = buildWhatsAppMessage(messageData);
    const fromWa = from.startsWith('whatsapp:') ? from : 'whatsapp:' + from;
    const url = 'https://api.twilio.com/2010-04-01/Accounts/' + sid + '/Messages.json';
    const body = new URLSearchParams({ To: to, From: fromWa, Body: message });
    const auth = Buffer.from(sid + ':' + token).toString('base64');
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (response.ok) return { success: true };
    const errData = (await response.json()) as { code?: number; message?: string };
    const noRetry = NO_RETRY_CODES.includes(errData.code ?? 0);
    return { success: false, error: errData.message ?? 'Unknown', retry: !noRetry };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err), retry: true };
  }
}
