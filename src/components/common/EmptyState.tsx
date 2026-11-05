import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div className={`empty-state${compact ? ' empty-state-compact' : ''}`}>
      {icon && <span className="empty-icon">{icon}</span>}
      <strong>{title}</strong>
      <span>{description}</span>
      {action}
    </div>
  );
}
