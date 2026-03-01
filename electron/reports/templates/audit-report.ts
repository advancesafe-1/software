import { buildBaseTemplate, formatDateTime } from './base-template';
import type { ReportConfig } from '../report-types';
import type { OrgData, AuditLogRow, AlertDeliveryRow } from '../data-collector';

export interface AuditReportData {
  org: OrgData | null;
  auditLog: AuditLogRow[];
  systemChanges: AuditLogRow[];
  alertDelivery: AlertDeliveryRow[];
}

export function buildAuditReport(
  config: ReportConfig,
  data: AuditReportData,
  reportId: string,
  generatedAt: string
): string {
  const sections = config.sections ?? ['user_actions', 'system_changes', 'alert_delivery'];
  const dateRange = `${config.dateFrom.split('T')[0]} — ${config.dateTo.split('T')[0]}`;
  const orgName = data.org?.name ?? 'Unknown';
  const tocEntries: string[] = [];
  const parts: string[] = [];

  const configEntityTypes = ['organizations', 'sensors', 'zones', 'alert_hierarchy', 'app_users'];

  if (sections.includes('user_actions')) {
    tocEntries.push('<li>User Actions Log</li>');
    const rows = data.auditLog
      .slice(0, 200)
      .map((a) => `<tr><td>${formatDateTime(a.performed_at)}</td><td>${a.user_id ?? '—'}</td><td>${a.action}</td><td>${a.entity_type ?? '—'}</td><td>${(a.new_value_json || '').slice(0, 80)}</td></tr>`)
      .join('');
    parts.push(`<div class="section-title">User Actions Log</div><table class="no-break"><thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  if (sections.includes('system_changes')) {
    tocEntries.push('<li>System Configuration Changes</li>');
    const changes = data.systemChanges.filter((a) => a.entity_type && configEntityTypes.includes(a.entity_type));
    const rows = changes
      .slice(0, 100)
      .map((a) => `<tr><td>${formatDateTime(a.performed_at)}</td><td>${a.user_id ?? '—'}</td><td>${a.entity_type}</td><td>${(a.new_value_json || '').slice(0, 60)}</td></tr>`)
      .join('');
    parts.push(`<div class="section-title">System Configuration Changes</div><table class="no-break"><thead><tr><th>Timestamp</th><th>User</th><th>Changed</th><th>New Value</th></tr></thead><tbody>${rows || '<tr><td colspan="4">No config changes in period</td></tr>'}</tbody></table>`);
  }

  if (sections.includes('alert_delivery')) {
    tocEntries.push('<li>Alert Delivery Log</li>');
    const rows = data.alertDelivery
      .slice(0, 100)
      .map((a) => `<tr><td>${formatDateTime(a.created_at)}</td><td>${a.incident_id.slice(0, 8)}</td><td>${a.channel}</td><td>${a.status}</td><td>${a.attempts}</td></tr>`)
      .join('');
    parts.push(`<div class="section-title">Alert Delivery Log</div><table class="no-break"><thead><tr><th>Timestamp</th><th>Incident</th><th>Channel</th><th>Status</th><th>Attempts</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  const content = parts.join('');
  const tocHtml = `<ul>${tocEntries.join('')}</ul>`;
  return buildBaseTemplate(config.title, orgName, dateRange, config.generatedByName, generatedAt, reportId, content, config.type, tocHtml);
}
