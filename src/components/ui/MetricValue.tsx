interface MetricValueProps {
  value: string | number;
  label: string;
}

export function MetricValue({ value, label }: MetricValueProps) {
  return (
    <div>
      <div
        className="font-mono text-lg font-medium"
        style={{ color: 'var(--text-mono)' }}
      >
        {value}
      </div>
      <div
        className="mt-0.5 font-mono text-[10px] uppercase tracking-wider"
        style={{ color: 'var(--text-secondary)', letterSpacing: '0.1em' }}
      >
        {label}
      </div>
    </div>
  );
}
