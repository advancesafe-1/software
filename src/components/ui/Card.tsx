import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-[4px] border border-[var(--border-default)] bg-[var(--bg-card)] ${className}`}
      style={{ padding: '16px' }}
    >
      {children}
    </div>
  );
}
