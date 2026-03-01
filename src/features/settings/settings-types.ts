export type SettingsSectionId =
  | 'organization'
  | 'users'
  | 'floors-zones'
  | 'sensors'
  | 'cameras'
  | 'ppe-rules'
  | 'hierarchy'
  | 'alert-delivery'
  | 'cloud-sync'
  | 'workers'
  | 'system'
  | 'audit-log';

export interface SettingsNavItem {
  id: SettingsSectionId;
  label: string;
  group: 'organization' | 'facility' | 'alerts' | 'system';
}

export const SETTINGS_NAV: SettingsNavItem[] = [
  { id: 'organization', label: 'Organization Profile', group: 'organization' },
  { id: 'users', label: 'Users & Roles', group: 'organization' },
  { id: 'floors-zones', label: 'Floors & Zones', group: 'facility' },
  { id: 'sensors', label: 'Sensors', group: 'facility' },
  { id: 'cameras', label: 'Cameras', group: 'facility' },
  { id: 'ppe-rules', label: 'PPE Rules', group: 'facility' },
  { id: 'hierarchy', label: 'Alert Hierarchy', group: 'alerts' },
  { id: 'alert-delivery', label: 'SMS & WhatsApp', group: 'alerts' },
  { id: 'cloud-sync', label: 'Cloud Sync', group: 'system' },
  { id: 'workers', label: 'Workers', group: 'system' },
  { id: 'system', label: 'System Settings', group: 'system' },
  { id: 'audit-log', label: 'Audit Log', group: 'system' },
];

export const SETTINGS_GROUP_LABELS: Record<SettingsNavItem['group'], string> = {
  organization: 'ORGANIZATION',
  facility: 'FACILITY',
  alerts: 'ALERTS',
  system: 'SYSTEM',
};
