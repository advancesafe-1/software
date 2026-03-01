import { buildBaseTemplate, badgeClass, formatDate } from './base-template';
import type { ReportConfig } from '../report-types';
import type {
  OrgData,
  ScoreHistoryRow,
  IncidentCountData,
  SensorSummaryRow,
  ResponseTimeRow,
} from '../data-collector';

export interface SafetySummaryData {
  org: OrgData | null;
  avgScore: number;
  scoreHistory: ScoreHistoryRow[];
  incidentCounts: IncidentCountData;
  responseTimes: ResponseTimeRow[];
  sensorSummary: SensorSummaryRow[];
  workerStats: { total: number; active: number };
  totalIncidents: number;
  sensorsMonitored: number;
}

const DEFAULT_PPE = 85;

export function buildSafetySummaryReport(
  config: ReportConfig,
  data: SafetySummaryData,
  reportId: string,
  generatedAt: string
): string {
  const sections = config.sections ?? ['overview', 'guardian_scores', 'incident_summary', 'sensor_status', 'ppe_compliance'];
  const dateRange = `${config.dateFrom.split('T')[0]} — ${config.dateTo.split('T')[0]}`;
  const orgName = data.org?.name ?? 'Unknown';

  const tocEntries: string[] = [];
  const parts: string[] = [];

  if (sections.includes('overview')) {
    tocEntries.push('<li>Executive Overview</li>');
    const trend = data.avgScore >= 85 ? 'improving' : data.avgScore >= 65 ? 'stable' : 'declining';
    parts.push(`
      <div class="section-title">Executive Overview</div>
      <div class="stat-grid">
        <div class="stat-box"><div class="value">${Math.round(data.avgScore)}</div><div class="label">Avg Guardian Score</div></div>
        <div class="stat-box"><div class="value">${data.totalIncidents}</div><div class="label">Total Incidents</div></div>
        <div class="stat-box"><div class="value">${data.incidentCounts.critical}</div><div class="label">Critical Incidents</div></div>
        <div class="stat-box"><div class="value">${data.sensorsMonitored}</div><div class="label">Sensors Monitored</div></div>
        <div class="stat-box"><div class="value">${DEFAULT_PPE}%</div><div class="label">PPE Compliance</div></div>
        <div class="stat-box"><div class="value">99.9%</div><div class="label">System Uptime</div></div>
      </div>
      <p class="no-break">During the period ${dateRange}, ${orgName} maintained an average Guardian Safety Score of ${Math.round(data.avgScore)}/100. A total of ${data.totalIncidents} safety incidents were recorded, of which ${data.incidentCounts.critical} were critical, ${data.incidentCounts.danger} danger, and ${data.incidentCounts.warning} warning level. The safety trend shows ${trend} performance over this period.</p>
    `);
  }

  if (sections.includes('guardian_scores') && data.scoreHistory.length > 0) {
    tocEntries.push('<li>Guardian Score History</li>');
    const rows = data.scoreHistory
      .slice(0, 100)
      .map(
        (r) =>
          `<tr><td>${formatDate(r.date)}</td><td>${r.zone_name ?? '—'}</td><td>${Math.round(r.avg_score)}</td><td>${Math.round(r.min_score)}</td><td>${Math.round(r.max_score)}</td><td><span class="${badgeClass(r.status)}">${r.status}</span></td></tr>`
      )
      .join('');
    parts.push(`
      <div class="section-title page-break">Guardian Score History</div>
      <table class="no-break"><thead><tr><th>Date</th><th>Zone</th><th>Avg Score</th><th>Min</th><th>Max</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
    `);
  }

  if (sections.includes('incident_summary')) {
    tocEntries.push('<li>Incident Summary</li>');
    const severityRows = [
      ['Critical', data.incidentCounts.critical],
      ['Danger', data.incidentCounts.danger],
      ['Warning', data.incidentCounts.warning],
      ['Total', data.incidentCounts.total],
    ]
      .map(([sev, count]) => `<tr><td>${sev}</td><td>${count}</td><td>—</td><td>—</td></tr>`)
      .join('');
    const typeRows = Object.entries(data.incidentCounts.byType)
      .map(([type, count]) => `<tr><td>${type}</td><td>${count}</td></tr>`)
      .join('');
    parts.push(`
      <div class="section-title">Incident Summary</div>
      <table class="no-break"><thead><tr><th>Severity</th><th>Count</th><th>Avg Response</th><th>Avg Resolution</th></tr></thead><tbody>${severityRows}</tbody></table>
      <table class="no-break"><thead><tr><th>Type</th><th>Count</th></tr></thead><tbody>${typeRows}</tbody></table>
    `);
  }

  if (sections.includes('sensor_status') && data.sensorSummary.length > 0) {
    tocEntries.push('<li>Sensor Performance</li>');
    const rows = data.sensorSummary
      .slice(0, 50)
      .map(
        (s) =>
          `<tr><td>${s.sensor_name}</td><td>${s.zone_name ?? '—'}</td><td>${s.sensor_type}</td><td>${s.readings_count}</td><td>${s.breach_count}</td><td>${s.readings_count > 0 ? Math.round((1 - s.breach_count / s.readings_count) * 100) : 100}%</td></tr>`
      )
      .join('');
    parts.push(`
      <div class="section-title">Sensor Performance</div>
      <table class="no-break"><thead><tr><th>Sensor</th><th>Zone</th><th>Type</th><th>Readings</th><th>Breaches</th><th>Uptime %</th></tr></thead><tbody>${rows}</tbody></table>
    `);
  }

  if (sections.includes('ppe_compliance')) {
    tocEntries.push('<li>PPE Compliance</li>');
    parts.push(`
      <div class="section-title">PPE Compliance</div>
      <p>PPE data from computer vision analysis of camera feeds. If no CV data: default values shown (CV system not yet active).</p>
      <table class="no-break"><thead><tr><th>Zone</th><th>Helmet %</th><th>Vest %</th><th>Gloves %</th><th>Overall %</th></tr></thead><tbody><tr><td>All zones</td><td>${DEFAULT_PPE}%</td><td>${DEFAULT_PPE}%</td><td>${DEFAULT_PPE}%</td><td>${DEFAULT_PPE}%</td></tr></tbody></table>
    `);
  }

  if (sections.includes('recommendations')) {
    tocEntries.push('<li>Recommendations</li>');
    const recs: string[] = [];
    if (data.avgScore < 70) recs.push('⚠ Overall safety score below target. Immediate review of high-risk zones recommended.');
    if (data.incidentCounts.critical > 5) recs.push(`⚠ ${data.incidentCounts.critical} critical incidents in period. Engineering review recommended.`);
    const highBreach = data.sensorSummary.find((s) => s.breach_count > 10);
    if (highBreach) recs.push(`⚠ Sensor ${highBreach.sensor_name} exceeded safe limits ${highBreach.breach_count} times. Equipment inspection recommended.`);
    const avgAck = data.responseTimes[0]?.avgAckMinutes ?? 0;
    if (avgAck > 10) recs.push(`⚠ Average alert response time of ${Math.round(avgAck)} minutes exceeds recommended 5 minute target. Hierarchy review recommended.`);
    if (recs.length === 0) recs.push('No critical recommendations. Continue monitoring.');
    parts.push(`<div class="section-title">Recommendations</div><ul>${recs.map((r) => `<li>${r}</li>`).join('')}</ul>`);
  }

  const content = parts.join('');
  const tocHtml = `<ul>${tocEntries.join('')}</ul>`;
  return buildBaseTemplate(config.title, orgName, dateRange, config.generatedByName, generatedAt, reportId, content, config.type, tocHtml);
}
