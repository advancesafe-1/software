interface SectionLabelProps {
  children: string;
  dotColor?: string;
}

export function SectionLabel({ children, dotColor }: SectionLabelProps) {
  return (
    <div
      className="mb-2 font-mono text-[10px] uppercase tracking-wider"
      style={{ color: 'var(--text-secondary)', letterSpacing: '0.1em' }}
    >
      {dotColor != null && (
        <span
          className="mr-1.5 inline-block h-1 w-1 rounded-full"
          style={{ backgroundColor: dotColor, verticalAlign: 'middle' }}
        />
      )}
      {children}
    </div>
  );
}
