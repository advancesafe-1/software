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

export interface ReportSection {
  id: string;
  title: string;
  description: string;
  includeByDefault: boolean;
}

export const REPORT_SECTIONS: Record<ReportType, ReportSection[]> = {
  safety_summary: [
    { id: 'overview', title: 'Executive Overview', description: 'Guardian Score trend and key metrics', includeByDefault: true },
    { id: 'guardian_scores', title: 'Guardian Score History', description: 'Daily scores per zone', includeByDefault: true },
    { id: 'incident_summary', title: 'Incident Summary', description: 'Count and severity breakdown', includeByDefault: true },
    { id: 'sensor_status', title: 'Sensor Performance', description: 'Sensor uptime and breach count', includeByDefault: true },
    { id: 'ppe_compliance', title: 'PPE Compliance', description: 'Compliance rates by zone', includeByDefault: true },
    { id: 'recommendations', title: 'Recommendations', description: 'AI-generated safety recommendations', includeByDefault: false },
  ],
  incident_report: [
    { id: 'summary', title: 'Incident Summary', includeByDefault: true, description: 'Total counts by type/severity' },
    { id: 'incident_list', title: 'Complete Incident Log', includeByDefault: true, description: 'All incidents in period' },
    { id: 'response_times', title: 'Response Time Analysis', includeByDefault: true, description: 'Avg acknowledgment and resolution times' },
    { id: 'zone_analysis', title: 'Zone Risk Analysis', includeByDefault: true, description: 'Incidents per zone heatmap' },
    { id: 'trend', title: 'Incident Trend', includeByDefault: true, description: 'Daily incident count chart' },
  ],
  sensor_report: [
    { id: 'sensor_list', title: 'Sensor Inventory', includeByDefault: true, description: 'All sensors and current status' },
    { id: 'readings_summary', title: 'Readings Summary', includeByDefault: true, description: 'Min/max/avg per sensor' },
    { id: 'breach_log', title: 'Threshold Breach Log', includeByDefault: true, description: 'All threshold breaches in period' },
    { id: 'uptime', title: 'Sensor Uptime', includeByDefault: true, description: 'Online/offline time per sensor' },
  ],
  compliance_report: [
    { id: 'declaration', title: 'Compliance Declaration', includeByDefault: true, description: 'ISO 45001 SMS pillar compliance' },
    { id: 'pillar1', title: 'Pillar 1: Safety Policy', includeByDefault: true, description: 'Guardian Score as policy metric' },
    { id: 'pillar2', title: 'Pillar 2: Risk Management', includeByDefault: true, description: 'Hazard identification records' },
    { id: 'pillar3', title: 'Pillar 3: Safety Assurance', includeByDefault: true, description: 'Audit trail and KPI records' },
    { id: 'pillar4', title: 'Pillar 4: Safety Promotion', includeByDefault: true, description: 'Worker safety records' },
    { id: 'legal_register', title: 'Legal Compliance Register', includeByDefault: true, description: 'Factories Act compliance checklist' },
    { id: 'immutable_log', title: 'Immutable Audit Certificate', includeByDefault: true, description: 'Tamper-proof record certificate' },
  ],
  audit_report: [
    { id: 'user_actions', title: 'User Actions Log', includeByDefault: true, description: 'All user actions in period' },
    { id: 'system_changes', title: 'System Configuration Changes', includeByDefault: true, description: 'Settings and config modifications' },
    { id: 'alert_delivery', title: 'Alert Delivery Log', includeByDefault: true, description: 'All alerts sent and delivery status' },
  ],
};
