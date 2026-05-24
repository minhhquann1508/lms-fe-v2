import { Button, Empty, Typography } from 'antd';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  /** Optional visual element that helps identify the empty state. */
  icon?: ReactNode;
  /** Main empty state message. */
  title: string;
  /** Short explanation of what the user can do next. */
  description?: string;
  /** Optional action button configuration for the primary next step. */
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="lms-empty-state">
      {icon ? (
        <div className="lms-empty-state__icon">{icon}</div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
      <Typography.Title level={4}>{title || 'Chưa có dữ liệu'}</Typography.Title>
      {description ? <Typography.Paragraph>{description}</Typography.Paragraph> : null}
      {action ? (
        <Button type="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
