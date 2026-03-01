import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { SensorRow } from './useSensorsData';

interface DataPoint {
  time: string;
  value: number;
}

interface SensorTrendChartProps {
  sensor: SensorRow;
  data: { value: number; status: string; recorded_at: string }[];
}

export function SensorTrendChart({ sensor, data }: SensorTrendChartProps) {
  const chartData: DataPoint[] = data.map((d) => ({
    time: new Date(d.recorded_at).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    value: d.value,
  }));
  const safeMax = sensor.safe_max != null ? sensor.safe_max : 100;
  const warningMax = sensor.warning_max != null ? sensor.warning_max : safeMax * 1.2;
  const dangerMax = sensor.danger_max != null ? sensor.danger_max : safeMax * 1.5;
  const unit = sensor.unit != null ? sensor.unit : '';

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-dim)' }} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text-dim)' }} domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              fontSize: 11,
            }}
            formatter={(value: number) => [value + ' ' + unit, 'Value']}
          />
          <ReferenceLine y={safeMax} stroke="var(--status-safe)" strokeDasharray="2 2" />
          <ReferenceLine y={warningMax} stroke="var(--status-warning)" strokeDasharray="2 2" />
          <ReferenceLine y={dangerMax} stroke="var(--status-danger)" strokeDasharray="2 2" />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--accent-cyan)"
            fill="var(--accent-cyan)"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
