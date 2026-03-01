type Size = 'sm' | 'md' | 'lg';

const sizeMap: Record<Size, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-16 w-16 border-[3px]',
};

interface LoadingSpinnerProps {
  size?: Size;
  className?: string;
  center?: boolean;
}

export function LoadingSpinner({ size = 'md', className = '', center = false }: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={
        'animate-spin rounded-full border-[var(--border-default)] border-t-[var(--accent-cyan)] ' +
        sizeMap[size] +
        ' ' +
        className
      }
      role="status"
      aria-label="Loading"
    />
  );
  if (center) {
    return <div className="flex min-h-[120px] flex-1 items-center justify-center">{spinner}</div>;
  }
  return spinner;
}

interface LoadingSpinnerWithLabelProps {
  size?: Size;
  label?: string;
  className?: string;
}

export function LoadingSpinnerWithLabel({
  size = 'md',
  label = 'Loading…',
  className = '',
}: LoadingSpinnerWithLabelProps) {
  return (
    <div className={'flex flex-col items-center gap-3 ' + className}>
      <LoadingSpinner size={size} />
      {label != null && label !== '' && (
        <span className="font-mono text-xs text-[var(--text-secondary)]">{label}</span>
      )}
    </div>
  );
}
