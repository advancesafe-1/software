export type ReportType =
  | 'safety_summary'
  | 'incident_report'
  | 'sensor_report'
  | 'compliance_report'
  | 'audit_report';

export interface ReportConfig {
  type: ReportType;
  title: string;
  organizationId: string;
  generatedBy: string;
  generatedByName: string;
  dateFrom: string;
  dateTo: string;
  filters?: {
    floorIds?: string[];
    zoneIds?: string[];
    severities?: string[];
    includeResolved?: boolean;
  };
  sections?: string[];
}

export interface ReportJob {
  id: string;
  config: ReportConfig;
  status: 'queued' | 'generating' | 'complete' | 'failed';
  progress: number;
  outputPath: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  fileSizeBytes: number | null;
}

export interface ReportListItem {
  name: string;
  path: string;
  size: number;
  createdAt: string;
}

export const REPORT_TYPE_LABELS: Record<ReportType, { title: string; description: string }> = {
  safety_summary: { title: 'Safety Summary', description: 'Guardian Score trend and key metrics' },
  incident_report: { title: 'Incident Report', description: 'Incidents for insurance and regulatory submission' },
  sensor_report: { title: 'Sensor Report', description: 'Sensor inventory and readings summary' },
  compliance_report: { title: 'Factory Act', description: 'ISO 45001 and Factories Act compliance' },
  audit_report: { title: 'Audit Report', description: 'User actions and system changes log' },
};

export interface ReportSectionOption {
  id: string;
  title: string;
  description: string;
  includeByDefault: boolean;
}

export const REPORT_SECTIONS_UI: Record<ReportType, ReportSectionOption[]> = {
  safety_summary: [
    { id: 'overview', title: 'Executive Overview', description: 'Guardian Score trend and key metrics', includeByDefault: true },
    { id: 'guardian_scores', title: 'Guardian Score History', description: 'Daily scores per zone', includeByDefault: true },
    { id: 'incident_summary', title: 'Incident Summary', description: 'Count and severity breakdown', includeByDefault: true },
    { id: 'sensor_status', title: 'Sensor Performance', description: 'Sensor uptime and breach count', includeByDefault: true },
    { id: 'ppe_compliance', title: 'PPE Compliance', description: 'Compliance rates by zone', includeByDefault: true },
    { id: 'recommendations', title: 'Recommendations', description: 'AI-generated safety recommendations', includeByDefault: false },
  ],
  incident_report: [
    { id: 'summary', title: 'Incident Summary', description: 'Total counts by type/severity', includeByDefault: true },
    { id: 'incident_list', title: 'Complete Incident Log', description: 'All incidents in period', includeByDefault: true },
    { id: 'response_times', title: 'Response Time Analysis', description: 'Avg acknowledgment and resolution times', includeByDefault: true },
    { id: 'zone_analysis', title: 'Zone Risk Analysis', description: 'Incidents per zone heatmap', includeByDefault: true },
    { id: 'trend', title: 'Incident Trend', description: 'Daily incident count chart', includeByDefault: true },
  ],
  sensor_report: [
    { id: 'sensor_list', title: 'Sensor Inventory', description: 'All sensors and current status', includeByDefault: true },
    { id: 'readings_summary', title: 'Readings Summary', description: 'Min/max/avg per sensor', includeByDefault: true },
    { id: 'breach_log', title: 'Threshold Breach Log', description: 'All threshold breaches in period', includeByDefault: true },
    { id: 'uptime', title: 'Sensor Uptime', description: 'Online/offline time per sensor', includeByDefault: true },
  ],
  compliance_report: [
    { id: 'declaration', title: 'Compliance Declaration', description: 'ISO 45001 SMS pillar compliance', includeByDefault: true },
    { id: 'pillar1', title: 'Pillar 1: Safety Policy', description: 'Guardian Score as policy metric', includeByDefault: true },
    { id: 'pillar2', title: 'Pillar 2: Risk Management', description: 'Hazard identification records', includeByDefault: true },
    { id: 'pillar3', title: 'Pillar 3: Safety Assurance', description: 'Audit trail and KPI records', includeByDefault: true },
    { id: 'pillar4', title: 'Pillar 4: Safety Promotion', description: 'Worker safety records', includeByDefault: true },
    { id: 'legal_register', title: 'Legal Compliance Register', description: 'Factories Act compliance checklist', includeByDefault: true },
    { id: 'immutable_log', title: 'Immutable Audit Certificate', description: 'Tamper-proof record certificate', includeByDefault: true },
  ],
  audit_report: [
    { id: 'user_actions', title: 'User Actions Log', description: 'All user actions in period', includeByDefault: true },
    { id: 'system_changes', title: 'System Configuration Changes', description: 'Settings and config modifications', includeByDefault: true },
    { id: 'alert_delivery', title: 'Alert Delivery Log', description: 'All alerts sent and delivery status', includeByDefault: true },
  ],
};
