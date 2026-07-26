import type { ReactNode } from 'react';

interface AdminBadgeProps {
  variant?: 'success' | 'info' | 'neutral' | 'draft' | 'warning';
  children: ReactNode;
}

export default function AdminBadge({ variant = 'neutral', children }: AdminBadgeProps) {
  return <span className={`lms-admin-badge lms-admin-badge--${variant}`}>{children}</span>;
}
