export interface AlertMessageData {
  orgName: string;
  zoneName: string;
  floorName: string;
  severity: string;
  title: string;
  sensorName?: string;
  sensorValue?: string;
  sensorUnit?: string;
  threshold?: string;
  triggeredAt: string;
  incidentId: string;
}

const MAX_CHAR = 50;

export function sanitizeForMessage(value: string): string {
  if (value == null || value === undefined) return 'Unknown';
  const s = String(value)
    .replace(/[\n\r\t]/g, ' ')
    .replace(/[^\w\s\-.,:/()]/g, '')
    .trim();
  return s.length > MAX_CHAR ? s.slice(0, MAX_CHAR) : s || 'Unknown';
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes();
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  } catch {
    return '--:--';
  }
}

export function buildSMSMessage(data: AlertMessageData): string {
  const severity = sanitizeForMessage(data.severity);
  const zone = sanitizeForMessage(data.zoneName);
  const title = sanitizeForMessage(data.title);
  const sensor = data.sensorName ? sanitizeForMessage(data.sensorName) : '';
  const value = data.sensorValue != null ? sanitizeForMessage(String(data.sensorValue)) : '';
  const unit = data.sensorUnit ? sanitizeForMessage(data.sensorUnit) : '';
  const time = fmtTime(data.triggeredAt);
  const id = sanitizeForMessage(data.incidentId).slice(0, 8);
  let body = `ADVANCESAFE ALERT\n${severity} - ${zone}\n${title}`;
  if (sensor && value) body += `\n${sensor}: ${value}${unit}`;
  body += `\nTime: ${time}\nID: ${id}`;
  if (body.length > 160) {
    body = `ADVANCESAFE ALERT\n${severity} - ${zone}\n${title.slice(0, 40)}\nTime: ${time} ID: ${id}`.slice(0, 160);
  }
  return body;
}

export function buildWhatsAppMessage(data: AlertMessageData): string {
  const severity = sanitizeForMessage(data.severity);
  const org = sanitizeForMessage(data.orgName);
  const zone = sanitizeForMessage(data.zoneName);
  const floor = sanitizeForMessage(data.floorName);
  const title = sanitizeForMessage(data.title);
  const id = sanitizeForMessage(data.incidentId).slice(0, 8);
  let body = `*ADVANCESAFE SAFETY ALERT*\n\n*Severity:* ${severity}\n*Organization:* ${org}\n*Location:* ${floor} -> ${zone}\n*Alert:* ${title}\n`;
  if (data.sensorName && data.sensorValue != null) {
    const val = sanitizeForMessage(String(data.sensorValue));
    const u = data.sensorUnit ? sanitizeForMessage(data.sensorUnit) : '';
    const th = data.threshold ? sanitizeForMessage(data.threshold) : '';
    body += `*Reading:* ${val}${u}\n(Safe limit: ${th}${u})\n`;
  }
  body += `*Time:* ${data.triggeredAt}\n*Incident ID:* ${id}\n\nPlease acknowledge in AdvanceSafe dashboard or respond to this message.`;
  return body;
}

export function buildDesktopTitle(data: AlertMessageData): string {
  return `${sanitizeForMessage(data.severity)}: ${sanitizeForMessage(data.zoneName)}`;
}

export function buildDesktopBody(data: AlertMessageData): string {
  const floor = sanitizeForMessage(data.floorName);
  const time = fmtTime(data.triggeredAt);
  return `${sanitizeForMessage(data.title)}\n${floor} - ${time}`;
}
