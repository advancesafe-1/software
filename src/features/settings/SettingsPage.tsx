import { useState, useCallback, lazy, Suspense } from 'react';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { SETTINGS_NAV, SETTINGS_GROUP_LABELS, type SettingsSectionId } from './settings-types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const OrganizationSettings = lazy(() => import('./sections/OrganizationSettings').then((m) => ({ default: m.OrganizationSettings })));
const UserManagement = lazy(() => import('./sections/UserManagement').then((m) => ({ default: m.UserManagement })));
const FloorZoneSettings = lazy(() => import('./sections/FloorZoneSettings').then((m) => ({ default: m.FloorZoneSettings })));
const SensorManagement = lazy(() => import('./sections/SensorManagement').then((m) => ({ default: m.SensorManagement })));
const CameraManagement = lazy(() => import('./sections/CameraManagement').then((m) => ({ default: m.CameraManagement })));
const PPERuleSettings = lazy(() => import('./sections/PPERuleSettings').then((m) => ({ default: m.PPERuleSettings })));
const HierarchySettings = lazy(() => import('./sections/HierarchySettings').then((m) => ({ default: m.HierarchySettings })));
const AlertDeliverySettings = lazy(() => import('./sections/AlertDeliverySettings').then((m) => ({ default: m.AlertDeliverySettings })));
const DeliveryMonitor = lazy(() => import('./sections/DeliveryMonitor').then((m) => ({ default: m.DeliveryMonitor })));
const CloudSyncSettings = lazy(() => import('./sections/CloudSyncSettings').then((m) => ({ default: m.CloudSyncSettings })));
const WorkerManagement = lazy(() => import('./sections/WorkerManagement').then((m) => ({ default: m.WorkerManagement })));
const SystemSettings = lazy(() => import('./sections/SystemSettings').then((m) => ({ default: m.SystemSettings })));
const AuditLogViewer = lazy(() => import('./sections/AuditLogViewer').then((m) => ({ default: m.AuditLogViewer })));

function SectionContent({ sectionId }: { sectionId: SettingsSectionId }) {
  switch (sectionId) {
    case 'organization':
      return <OrganizationSettings />;
    case 'users':
      return <UserManagement />;
    case 'floors-zones':
      return <FloorZoneSettings />;
    case 'sensors':
      return <SensorManagement />;
    case 'cameras':
      return <CameraManagement />;
    case 'ppe-rules':
      return <PPERuleSettings />;
    case 'hierarchy':
      return <HierarchySettings />;
    case 'alert-delivery':
      return (
        <Card>
          <SectionLabel>ALERT DELIVERY</SectionLabel>
          <AlertDeliverySettings />
          <div className="mt-4" />
          <SectionLabel>DELIVERY MONITOR</SectionLabel>
          <DeliveryMonitor />
        </Card>
      );
    case 'cloud-sync':
      return (
        <Card>
          <SectionLabel>FIREBASE CLOUD SYNC</SectionLabel>
          <CloudSyncSettings />
        </Card>
      );
    case 'workers':
      return <WorkerManagement />;
    case 'system':
      return <SystemSettings />;
    case 'audit-log':
      return <AuditLogViewer />;
    default:
      return <p className="font-mono text-sm text-[var(--text-dim)]">Select a section</p>;
  }
}

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('organization');

  const handleNav = useCallback((id: SettingsSectionId) => {
    setActiveSection(id);
  }, []);

  const groups = Array.from(new Set(SETTINGS_NAV.map((n) => n.group)));

  return (
    <div className="flex h-full flex-1">
      <nav className="w-[220px] shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-card)] p-2">
        <h2 className="mb-3 font-rajdhani text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
          Settings
        </h2>
        {groups.map((group) => (
          <div key={group} className="mb-4">
            <div className="mb-1 font-mono text-[10px] font-semibold uppercase text-[var(--text-dim)]">
              {SETTINGS_GROUP_LABELS[group]}
            </div>
            {SETTINGS_NAV.filter((n) => n.group === group).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`mb-0.5 flex w-full items-center rounded px-2 py-1.5 text-left font-mono text-xs transition-colors ${
                  activeSection === item.id
                    ? 'border-l-2 border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]'
                    : 'border-l-2 border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <main className="min-w-0 flex-1 overflow-auto p-4">
        <Suspense fallback={<LoadingSpinner size="lg" center />}>
          <SectionContent sectionId={activeSection} />
        </Suspense>
      </main>
    </div>
  );
}
