import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import type { IncidentDistributionRow } from './useAnalyticsData';

const CATEGORIES = ['Mechanical', 'Electrical', 'Thermal', 'Chemical', 'Human Factor'];

function mapType(incidentType: string): string {
  if (incidentType === 'sensor_breach') return 'Chemical';
  if (incidentType === 'ppe_violation' || incidentType === 'worker_sos' || incidentType === 'manual') return 'Human Factor';
  return 'Other';
}

interface Props {
  data: IncidentDistributionRow[];
}

export function IncidentDistributionChart({ data }: Props) {
  const byCat = new Map<string, number>();
  CATEGORIES.forEach((c) => byCat.set(c, 0));
  data.forEach((row) => {
    const cat = mapType(row.incident_type);
    byCat.set(cat, (byCat.get(cat) ?? 0) + row.count);
  });
  const chartData = Array.from(byCat.entries()).map(([name, count]) => ({ name, count }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData}>
          <PolarGrid stroke="var(--border-default)" />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
          <PolarRadiusAxis angle={90} tick={{ fontSize: 10, fill: 'var(--text-dim)' }} />
          <Radar dataKey="count" stroke="var(--accent-cyan)" fill="var(--accent-cyan)" fillOpacity={0.2} strokeWidth={2} />
          <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', fontSize: 11 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
