import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  AlertTriangle,
  Activity,
  BarChart2,
  Users,
  FileText,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSidebarStore } from '@/store/sidebar-store';

const navItems: { path: string; label: string; icon: React.ComponentType<{ className?: string; size?: number }> }[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/plant-map', label: 'Plant Map', icon: Map },
  { path: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { path: '/sensors', label: 'Sensors', icon: Activity },
  { path: '/analytics', label: 'Analytics', icon: BarChart2 },
  { path: '/workers', label: 'Workers', icon: Users },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
];

export function Sidebar() {
  const expanded = useSidebarStore((s) => s.expanded);
  const toggle = useSidebarStore((s) => s.toggle);
  const width = expanded ? 200 : 80;

  return (
    <aside
      className="flex shrink-0 flex-col border-r border-[var(--border-default)] bg-[var(--bg-secondary)] transition-[width] duration-200"
      style={{ width: `${width}px` }}
    >
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded px-3 py-2.5 font-rajdhani font-semibold transition-colors ${
                isActive
                  ? 'border-l-2 border-[var(--accent-cyan)] bg-[var(--bg-tertiary)] text-[var(--accent-cyan)]'
                  : 'border-l-2 border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
              }`
            }
            style={({ isActive }) =>
              isActive ? { borderLeftColor: 'var(--accent-cyan)' } : undefined
            }
          >
            <Icon className="shrink-0" size={20} />
            {expanded && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
      <button
        type="button"
        onClick={toggle}
        className="flex items-center justify-center border-t border-[var(--border-default)] py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {expanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>
    </aside>
  );
}
