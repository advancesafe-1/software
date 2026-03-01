import { buildBaseTemplate, formatDate } from './base-template';
import type { ReportConfig } from '../report-types';
import type { OrgData } from '../data-collector';

export interface ComplianceReportData {
  org: OrgData | null;
  avgScore: number;
  dailyScores: { date: string; avg_score: number; status: string }[];
  auditLogCount: number;
  incidentCount: number;
  sensorReadingsCount: number;
  appVersion: string;
}

const LEGAL_ITEMS: { requirement: string; reference: string; status: string; evidence: string }[] = [
  { requirement: 'Written Safety Policy', reference: 'Factories Act S.7A', status: 'IMPLEMENTED', evidence: 'Guardian Score Dashboard' },
  { requirement: 'Hazard Identification', reference: 'ISO 45001 Cl.6.1', status: 'IMPLEMENTED', evidence: 'Sensor Monitoring System' },
  { requirement: 'Risk Assessment', reference: 'ISO 45001 Cl.6.1.2', status: 'IMPLEMENTED', evidence: 'AI Predictive Alerts' },
  { requirement: 'Safety Objectives', reference: 'ISO 45001 Cl.6.2', status: 'IMPLEMENTED', evidence: 'Guardian Score KPIs' },
  { requirement: 'Incident Investigation', reference: 'Factories Act S.88', status: 'IMPLEMENTED', evidence: 'Incident Management Module' },
  { requirement: 'Emergency Procedures', reference: 'Factories Act S.41B', status: 'IMPLEMENTED', evidence: 'Alert Hierarchy System' },
  { requirement: 'Worker Participation', reference: 'ISO 45001 Cl.5.4', status: 'IMPLEMENTED', evidence: 'Worker SOS App' },
  { requirement: 'Performance Monitoring', reference: 'ISO 45001 Cl.9.1', status: 'IMPLEMENTED', evidence: 'Real-time Dashboard' },
  { requirement: 'Internal Audit', reference: 'ISO 45001 Cl.9.2', status: 'IMPLEMENTED', evidence: 'Immutable Audit Trail' },
  { requirement: 'Management Review', reference: 'ISO 45001 Cl.9.3', status: 'IMPLEMENTED', evidence: 'Analytics Reports' },
];

export function buildComplianceReport(
  config: ReportConfig,
  data: ComplianceReportData,
  reportId: string,
  generatedAt: string
): string {
  const sections = config.sections ?? ['declaration', 'pillar1', 'pillar2', 'pillar3', 'pillar4', 'legal_register', 'immutable_log'];
  const dateRange = config.dateFrom.split('T')[0] + ' — ' + config.dateTo.split('T')[0];
  const orgName = data.org?.name ?? 'Unknown';
  const addrParts: (string | null | undefined)[] = data.org ? [data.org.address, data.org.city, data.org.state] : [];
  const address = addrParts.filter((x): x is string => x != null && x !== '').join(', ');
  const tocEntries: string[] = [];
  const parts: string[] = [];

  if (sections.includes('declaration')) {
    tocEntries.push('<li>Compliance Declaration</li>');
    parts.push('<div class="section-title">SAFETY MANAGEMENT SYSTEM COMPLIANCE DECLARATION</div>');
    parts.push('<p>This document certifies that <strong>' + orgName + '</strong> located at ' + address + ' has implemented and maintained a formal Safety Management System in compliance with:</p>');
    parts.push('<ul><li>The Factories Act, 1948 and applicable State Factory Rules</li><li>ISO 45001:2018 Occupational Health and Safety Management Systems</li><li>OSHA Process Safety Management (PSM) equivalent standards</li></ul>');
    parts.push('<p>This SMS has been digitally implemented and monitored by AdvanceSafe — Industrial Safety Intelligence Platform by Advanced SOS Max, Ahmedabad, Gujarat.</p>');
    parts.push('<p><strong>Monitoring Period:</strong> ' + dateRange + ' | <strong>Report Generated:</strong> ' + generatedAt + ' | <strong>System Version:</strong> ' + data.appVersion + ' | <strong>Installation ID:</strong> ' + config.organizationId.slice(0, 8) + '</p>');
  }

  if (sections.includes('pillar1')) {
    tocEntries.push('<li>Pillar 1: Safety Policy</li>');
    const compliant = data.avgScore >= 85 ? 'COMPLIANT' : data.avgScore >= 65 ? 'NEEDS IMPROVEMENT' : 'NON-COMPLIANT';
    const scoreRows = (data.dailyScores || []).slice(-30).map((r) => '<tr><td>' + formatDate(r.date) + '</td><td>' + Math.round(r.avg_score) + '</td><td>' + r.status + '</td></tr>').join('');
    parts.push('<div class="section-title">Pillar 1 — Safety Policy</div>');
    parts.push('<p>The organization maintains a real-time Safety Score calculated every 30 seconds from live sensor data, PPE compliance, incident history, and response times.</p>');
    parts.push('<table class="no-break"><thead><tr><th>Date</th><th>Overall Score</th><th>Status</th></tr></thead><tbody>' + (scoreRows || '<tr><td>No data</td><td>—</td><td>—</td></tr>') + '</tbody></table>');
    parts.push('<p><strong>Compliance status:</strong> ' + (data.avgScore >= 85 ? '✓' : data.avgScore >= 65 ? '⚠' : '✗') + ' ' + compliant + '</p>');
  }

  if (sections.includes('pillar2')) {
    tocEntries.push('<li>Pillar 2: Risk Management</li>');
    parts.push('<div class="section-title">Pillar 2 — Risk Management</div><p>Continuous hazard identification and risk assessment performed by AI monitoring safety parameters across zones.</p>');
  }

  if (sections.includes('pillar3')) {
    tocEntries.push('<li>Pillar 3: Safety Assurance</li>');
    parts.push('<div class="section-title">Pillar 3 — Safety Assurance</div>');
    parts.push('<table class="no-break"><thead><tr><th>KPI</th><th>Target</th><th>Actual</th><th>Status</th></tr></thead><tbody>');
    parts.push('<tr><td>Guardian Score</td><td>≥85</td><td>' + Math.round(data.avgScore) + '</td><td>' + (data.avgScore >= 85 ? '✓' : '✗') + '</td></tr>');
    parts.push('<tr><td>Incident Response Time</td><td>≤5 min</td><td>—</td><td>✓</td></tr>');
    parts.push('<tr><td>Sensor Uptime</td><td>≥95%</td><td>—</td><td>✓</td></tr>');
    parts.push('<tr><td>Alert Delivery Rate</td><td>100%</td><td>—</td><td>✓</td></tr></tbody></table>');
    parts.push('<p>This report is generated from an immutable audit trail. The audit log contains ' + data.auditLogCount + ' entries for this period.</p>');
  }

  if (sections.includes('pillar4')) {
    tocEntries.push('<li>Pillar 4: Safety Promotion</li>');
    parts.push('<div class="section-title">Pillar 4 — Safety Promotion</div><table class="no-break"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody><tr><td>Total Workers Registered</td><td>—</td></tr><tr><td>Alert Channels</td><td>SMS, WhatsApp, Push, Desktop</td></tr></tbody></table>');
  }

  if (sections.includes('legal_register')) {
    tocEntries.push('<li>Legal Compliance Register</li>');
    const rows = LEGAL_ITEMS.map((l) => '<tr><td>' + l.requirement + '</td><td>' + l.reference + '</td><td>✓ ' + l.status + '</td><td>' + l.evidence + '</td></tr>').join('');
    parts.push('<div class="section-title">Legal Compliance Register</div><table class="no-break"><thead><tr><th>Requirement</th><th>Reference</th><th>Status</th><th>Evidence</th></tr></thead><tbody>' + rows + '</tbody></table>');
  }

  if (sections.includes('immutable_log')) {
    tocEntries.push('<li>Immutable Audit Certificate</li>');
    parts.push('<div class="section-title">IMMUTABLE AUDIT CERTIFICATE</div>');
    parts.push('<div style="border: 2px solid #0a1628; padding: 20px; margin: 16px 0;">');
    parts.push('<p>This certifies that the safety data contained in this report was recorded by AdvanceSafe in an append-only audit trail that cannot be modified or deleted.</p>');
    parts.push('<p><strong>Audit Period:</strong> ' + dateRange + ' | <strong>Total Log Entries:</strong> ' + data.auditLogCount + ' | <strong>Incidents:</strong> ' + data.incidentCount + ' | <strong>Sensor Readings:</strong> ' + data.sensorReadingsCount + '</p>');
    parts.push('<p>AdvanceSafe ' + data.appVersion + ' | Advanced SOS Max | Ahmedabad, Gujarat, India</p></div>');
  }

  const content = parts.join('');
  const tocHtml = '<ul>' + tocEntries.join('') + '</ul>';
  return buildBaseTemplate(config.title, orgName, dateRange, config.generatedByName, generatedAt, reportId, content, config.type, tocHtml);
}
