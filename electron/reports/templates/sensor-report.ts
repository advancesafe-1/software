import { buildBaseTemplate, formatDateTime } from './base-template';
import type { ReportConfig } from '../report-types';
import type { OrgData, SensorSummaryRow, SensorBreachRow, SensorInventoryRow } from '../data-collector';

export interface SensorReportData {
  org: OrgData | null;
  inventory: SensorInventoryRow[];
  summary: SensorSummaryRow[];
  breaches: SensorBreachRow[];
}

export function buildSensorReport(
  config: ReportConfig,
  data: SensorReportData,
  reportId: string,
  generatedAt: string
): string {
  const sections = config.sections ?? ['sensor_list', 'readings_summary', 'breach_log', 'uptime'];
  const dateRange = `${config.dateFrom.split('T')[0]} — ${config.dateTo.split('T')[0]}`;
  const orgName = data.org?.name ?? 'Unknown';
  const tocEntries: string[] = [];
  const parts: string[] = [];

  if (sections.includes('sensor_list') && data.inventory.length > 0) {
    tocEntries.push('<li>Sensor Inventory</li>');
    const rows = data.inventory
      .map(
        (s) =>
          `<tr><td>${s.name}</td><td>${s.zone_name ?? '—'}</td><td>${s.floor_name ?? '—'}</td><td>${s.sensor_type}</td><td>${s.protocol}</td><td>${s.status}</td><td>${s.last_reading_at ? formatDateTime(s.last_reading_at) : '—'}</td><td>Safe: &lt;${s.safe_max ?? '—'} | Warn: ${s.warning_max ?? '—'} | Crit: &gt;${s.critical_max ?? '—'}</td></tr>`
      )
      .join('');
    parts.push(`<div class="section-title">Sensor Inventory</div><table class="no-break"><thead><tr><th>Sensor</th><th>Zone</th><th>Floor</th><th>Type</th><th>Protocol</th><th>Status</th><th>Last Reading</th><th>Thresholds</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  if (sections.includes('readings_summary') && data.summary.length > 0) {
    tocEntries.push('<li>Readings Summary</li>');
    const rows = data.summary
      .map((s) => {
        const rate = s.readings_count > 0 ? ((s.breach_count / s.readings_count) * 100).toFixed(1) : '0';
        return `<tr><td>${s.sensor_name}</td><td>${s.readings_count}</td><td>${s.min_value.toFixed(2)}</td><td>${s.max_value.toFixed(2)}</td><td>${s.avg_value.toFixed(2)}</td><td>${s.breach_count}</td><td>${rate}%</td></tr>`;
      })
      .join('');
    parts.push(`<div class="section-title">Readings Summary</div><table class="no-break"><thead><tr><th>Sensor</th><th>Readings</th><th>Min</th><th>Max</th><th>Avg</th><th>Breaches</th><th>Breach Rate %</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  if (sections.includes('breach_log') && data.breaches.length > 0) {
    tocEntries.push('<li>Threshold Breach Log</li>');
    const rows = data.breaches
      .slice(0, 100)
      .map((b) => `<tr><td>${formatDateTime(b.recorded_at)}</td><td>${b.sensor_name}</td><td>${b.zone_name ?? '—'}</td><td>${b.value}</td><td>${b.unit ?? '—'}</td><td>${b.status}</td></tr>`)
      .join('');
    parts.push(`<div class="section-title">Threshold Breach Log</div><table class="no-break"><thead><tr><th>Date/Time</th><th>Sensor</th><th>Zone</th><th>Value</th><th>Unit</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  if (sections.includes('uptime') && data.summary.length > 0) {
    tocEntries.push('<li>Sensor Uptime</li>');
    const rows = data.summary
      .map((s) => {
        const expected = 30 * 24 * 12;
        const uptime = s.readings_count > 0 ? Math.min(100, Math.round((s.readings_count / expected) * 100)) : 0;
        return `<tr><td>${s.sensor_name}</td><td>${expected}</td><td>${s.readings_count}</td><td>${uptime}%</td></tr>`;
      })
      .join('');
    parts.push(`<div class="section-title">Sensor Uptime</div><p>Expected readings based on 5-minute interval over report period.</p><table class="no-break"><thead><tr><th>Sensor</th><th>Expected</th><th>Actual</th><th>Uptime %</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  const content = parts.join('');
  const tocHtml = `<ul>${tocEntries.join('')}</ul>`;
  return buildBaseTemplate(config.title, orgName, dateRange, config.generatedByName, generatedAt, reportId, content, config.type, tocHtml);
}
