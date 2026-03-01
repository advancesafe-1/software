import type { RiskMatrixRow } from './useAnalyticsData';

const HOUR_BUCKETS = ['00', '04', '08', '12', '16', '20'];

interface RiskMatrixProps {
  data: RiskMatrixRow[];
}

function getCellColor(count: number): string {
  if (count === 0) return 'var(--bg-card)';
  if (count <= 2) return 'rgba(255, 183, 0, 0.3)';
  if (count <= 5) return 'rgba(255, 107, 53, 0.5)';
  return 'rgba(255, 45, 45, 0.7)';
}

export function RiskMatrix({ data }: RiskMatrixProps) {
  const byZone = new Map<string, Map<string, number>>();
  data.forEach((row) => {
    const zone = row.zone_name ?? 'Unknown';
    if (!byZone.has(zone)) byZone.set(zone, new Map());
    byZone.get(zone)!.set(row.hour_bucket, row.incident_count);
  });
  const zones = Array.from(byZone.keys()).sort();

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-[10px]">
        <thead>
          <tr>
            <th className="border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-1.5 text-left text-[var(--text-secondary)]">Zone</th>
            {HOUR_BUCKETS.map((h) => (
              <th key={h} className="border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-1.5 text-[var(--text-secondary)]">
                {h}-{String(parseInt(h, 10) + 4).padStart(2, '0')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {zones.map((zone) => (
            <tr key={zone}>
              <td className="border border-[var(--border-default)] p-1.5 text-[var(--text-primary)]">{zone}</td>
              {HOUR_BUCKETS.map((h) => {
                const count = byZone.get(zone)?.get(h) ?? 0;
                return (
                  <td
                    key={h}
                    className="border border-[var(--border-default)] p-1.5 text-center text-[var(--text-primary)]"
                    style={{ backgroundColor: getCellColor(count) }}
                  >
                    {count}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
