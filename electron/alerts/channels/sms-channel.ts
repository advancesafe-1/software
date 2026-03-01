import type { StoredCredentials } from '../../services/credentials-service';
import type { DeliveryResult } from '../delivery-types';
import type { QueuedDeliveryRow } from '../delivery-queue';
import { buildSMSMessage } from '../message-templates';
import type { AlertMessageData } from '../message-templates';
import type { AlertContact } from '../delivery-types';

const RATE_LIMIT_PER_MINUTE = 10;
const rateLimitMap = new Map<string, number[]>();

function cleanRateLimit(orgId: string): void {
  const now = Date.now();
  const windowStart = now - 60_000;
  const arr = rateLimitMap.get(orgId) ?? [];
  const filtered = arr.filter((t) => t > windowStart);
  rateLimitMap.set(orgId, filtered);
}

function checkRateLimit(orgId: string): boolean {
  cleanRateLimit(orgId);
  const arr = rateLimitMap.get(orgId) ?? [];
  if (arr.length >= RATE_LIMIT_PER_MINUTE) return false;
  arr.push(Date.now());
  rateLimitMap.set(orgId, arr);
  return true;
}

function formatIndianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return '+91' + digits;
  if (digits.length === 12 && digits.startsWith('91')) return '+' + digits;
  return '+91' + digits.slice(-10);
}

const NO_RETRY_CODES = [21614, 21408, 21610];

export async function sendSMS(
  delivery: QueuedDeliveryRow,
  contact: AlertContact,
  credentials: StoredCredentials,
  messageData: AlertMessageData,
  organizationId: string
): Promise<DeliveryResult> {
  try {
    if (!checkRateLimit(organizationId)) {
      return { success: false, error: 'Rate limit exceeded', retry: true };
    }
    const phone = contact.phone?.trim();
    if (!phone) return { success: false, error: 'No phone', retry: false };
    const formatted = formatIndianPhone(phone);
    const sid = credentials.twilioAccountSid?.trim();
    const token = credentials.twilioAuthToken?.trim();
    const from = credentials.twilioFromPhone?.trim();
    if (!sid || !token || !from) return { success: false, error: 'Missing Twilio credentials', retry: false };
    const message = buildSMSMessage(messageData);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const body = new URLSearchParams({
      To: formatted,
      From: from,
      Body: message,
    });
    const auth = Buffer.from(sid + ':' + token).toString('base64');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + auth,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (response.ok) return { success: true };
    const errData = (await response.json()) as { code?: number; message?: string };
    const shouldRetry = !NO_RETRY_CODES.includes(errData.code ?? 0);
    return { success: false, error: errData.message ?? 'Unknown', retry: shouldRetry };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      retry: true,
    };
  }
}
