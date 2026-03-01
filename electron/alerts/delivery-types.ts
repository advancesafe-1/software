export type AlertChannel = 'sms' | 'whatsapp' | 'push' | 'desktop';

export interface QueuedDelivery {
  id: string;
  incident_id: string;
  hierarchy_level: number;
  contact_id: string;
  channel: AlertChannel;
  message_body: string;
  status: string;
  attempts: number;
  last_attempt_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface DeliveryResult {
  success: boolean;
  error?: string;
  retry?: boolean;
  skipped?: boolean;
}

export interface AlertContact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
}
