import { Card, Skeleton } from 'antd';

export interface LoadingSkeletonProps {
  /** Skeleton shape that mirrors the eventual content structure. */
  variant?: 'card' | 'table-row' | 'page-content';
  /** Number of repeated skeleton items to render. */
  count?: number;
}

export function LoadingSkeleton({ variant = 'page-content', count = 6 }: LoadingSkeletonProps) {
  if (variant === 'card') {
    return (
      <div className="lms-grid lms-grid--courses">
        {Array.from({ length: Math.min(Math.max(count, 3), 8) }).map((_, index) => (
          <Card className="lms-skeleton-card" key={index}>
            <Skeleton.Image active className="lms-skeleton-card__image" />
            <Skeleton active paragraph={{ rows: 3 }} />
          </Card>
        ))}
      </div>
    );
  }

  if (variant === 'table-row') {
    return (
      <div className="lms-table-skeleton">
        {Array.from({ length: Math.min(Math.max(count, 5), 10) }).map((_, index) => (
          <div className="lms-table-skeleton__row" key={index}>
            <Skeleton.Input active block />
            <Skeleton.Input active block />
            <Skeleton.Button active />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="lms-page-skeleton">
      <Skeleton active paragraph={{ rows: 2 }} title={{ width: '40%' }} />
      <Skeleton active paragraph={{ rows: 6 }} />
      <div className="lms-page-skeleton__split">
        <Skeleton active paragraph={{ rows: 4 }} />
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    </div>
  );
}
