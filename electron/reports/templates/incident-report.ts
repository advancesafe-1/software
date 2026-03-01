import { buildBaseTemplate, badgeClass, formatDateTime } from './base-template';
import type { ReportConfig } from '../report-types';
import type { OrgData, IncidentRow, ZoneRiskRow, ResponseTimeRow } from '../data-collector';

export interface IncidentReportData {
  org: OrgData | null;
  incidents: IncidentRow[];
  counts: { total: number; critical: number; danger: number; warning: number };
  zoneRisk: ZoneRiskRow[];
  responseTimes: ResponseTimeRow[];
  dailyTrend: { date: string; count: number }[];
}

export function buildIncidentReport(
  config: ReportConfig,
  data: IncidentReportData,
  reportId: string,
  generatedAt: string
): string {
  const sections = config.sections ?? ['summary', 'incident_list', 'response_times', 'zone_analysis', 'trend'];
  const dateRange = `${config.dateFrom.split('T')[0]} — ${config.dateTo.split('T')[0]}`;
  const orgName = data.org?.name ?? 'Unknown';
  const tocEntries: string[] = [];
  const parts: string[] = [];

  if (sections.includes('summary')) {
    tocEntries.push('<li>Incident Summary</li>');
    parts.push(`
      <div class="section-title">Incident Summary</div>
      <div class="stat-grid">
        <div class="stat-box"><div class="value">${data.counts.total}</div><div class="label">Total</div></div>
        <div class="stat-box"><div class="value">${data.counts.critical}</div><div class="label">Critical</div></div>
        <div class="stat-box"><div class="value">${data.counts.danger}</div><div class="label">Danger</div></div>
        <div class="stat-box"><div class="value">${data.counts.warning}</div><div class="label">Warning</div></div>
      </div>
    `);
  }

  if (sections.includes('incident_list') && data.incidents.length > 0) {
    tocEntries.push('<li>Complete Incident Log</li>');
    const rows = data.incidents
      .slice(0, 100)
      .map(
        (i) =>
          `<tr><td>${i.id.slice(0, 8)}</td><td>${formatDateTime(i.triggered_at)}</td><td>${i.zone_name ?? '—'}</td><td>${i.incident_type}</td><td><span class="${badgeClass(i.severity)}">${i.severity}</span></td><td>${i.title.slice(0, 40)}</td><td>${i.sensor_name ?? 'Manual'}</td><td>${i.resolved_by ?? '—'}</td></tr>`
      )
      .join('');
    parts.push(`
      <div class="section-title page-break">Complete Incident Log</div>
      <table class="no-break"><thead><tr><th>ID</th><th>Date/Time</th><th>Zone</th><th>Type</th><th>Severity</th><th>Title</th><th>Triggered By</th><th>Resolved By</th></tr></thead><tbody>${rows}</tbody></table>
    `);
  }

  if (sections.includes('response_times') && data.responseTimes.length > 0) {
    tocEntries.push('<li>Response Time Analysis</li>');
    const rows = data.responseTimes
      .map((r) => `<tr><td>${r.severity}</td><td>${r.count}</td><td>${Math.round(r.avgAckMinutes)} min</td><td>${Math.round(r.avgResolutionMinutes)} min</td></tr>`)
      .join('');
    parts.push(`<div class="section-title">Response Time Analysis</div><p>Response times measured from incident trigger to first acknowledgment.</p><table class="no-break"><thead><tr><th>Severity</th><th>Count</th><th>Avg Acknowledge</th><th>Avg Resolution</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  if (sections.includes('zone_analysis') && data.zoneRisk.length > 0) {
    tocEntries.push('<li>Zone Risk Analysis</li>');
    const rows = data.zoneRisk
      .map((z) => `<tr><td>${z.zone_name}</td><td>${z.floor_name ?? '—'}</td><td>${z.incident_count}</td><td>${z.critical ?? 0}</td><td>${z.danger ?? 0}</td><td>${z.warning ?? 0}</td><td>${z.risk_rating}</td></tr>`)
      .join('');
    parts.push(`<div class="section-title">Zone Risk Analysis</div><table class="no-break"><thead><tr><th>Zone</th><th>Floor</th><th>Count</th><th>Critical</th><th>Danger</th><th>Warning</th><th>Risk Rating</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  if (sections.includes('trend') && data.dailyTrend.length > 0) {
    tocEntries.push('<li>Incident Trend</li>');
    const rows = data.dailyTrend.map((d) => `<tr><td>${d.date}</td><td>${d.count}</td></tr>`).join('');
    parts.push(`<div class="section-title">Incident Trend</div><table class="no-break"><thead><tr><th>Date</th><th>Count</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  const content = parts.join('');
  const tocHtml = `<ul>${tocEntries.join('')}</ul>`;
  return buildBaseTemplate(config.title, orgName, dateRange, config.generatedByName, generatedAt, reportId, content, config.type, tocHtml);
}
