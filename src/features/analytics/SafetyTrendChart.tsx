import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { SafetyTrendPoint } from './useAnalyticsData';

interface SafetyTrendChartProps {
  data: SafetyTrendPoint[];
}

export function SafetyTrendChart(props: SafetyTrendChartProps) {
  const data = props.data;
  const withMa = data.map((d, i) => {
    const start = Math.max(0, i - 6);
    const slice = data.slice(start, i + 1);
    const ma =
      slice.length > 0
        ? slice.reduce((s, x) => s + x.avg_score, 0) / slice.length
        : d.avg_score;
    return { date: d.date, avg_score: d.avg_score, min_score: d.min_score, readings: d.readings, ma };
  });

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={withMa} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-dim)' }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-dim)' }} />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              fontSize: 11,
            }}
          />
          <ReferenceLine y={85} stroke="var(--status-safe)" strokeDasharray="2 2" />
          <ReferenceLine y={65} stroke="var(--status-warning)" strokeDasharray="2 2" />
          <Area
            type="monotone"
            dataKey="avg_score"
            stroke="var(--accent-cyan)"
            fill="var(--accent-cyan)"
            fillOpacity={0.2}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="ma"
            stroke="var(--accent-cyan)"
            strokeDasharray="4 2"
            strokeWidth={1.5}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
