import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={
        'flex flex-col items-center justify-center gap-3 rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)]/50 py-12 px-6 text-center ' +
        className
      }
    >
      {icon != null && <div className="text-[var(--text-dim)]">{icon}</div>}
      <h3 className="font-rajdhani text-base font-semibold text-[var(--text-primary)]">{title}</h3>
      {description != null && (
        <p className="max-w-sm font-mono text-xs text-[var(--text-secondary)]">{description}</p>
      )}
      {action != null && <div className="mt-2">{action}</div>}
    </div>
  );
}
