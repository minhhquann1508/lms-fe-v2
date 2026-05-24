import { Card, Statistic } from 'antd';
import type { ReactNode } from 'react';

export interface StatCardProps {
  /** Short label describing the metric. */
  title: string;
  /** Numeric or textual metric value. */
  value: string | number;
  /** Optional semantic icon shown next to the value. */
  icon?: ReactNode;
  /** Accent color applied to the leading border and icon background. */
  accentColor?: string;
}

export function StatCard({
  title,
  value,
  icon,
  accentColor = 'var(--color-primary)',
}: StatCardProps) {
  return (
    <Card className="lms-stat-card" style={{ borderInlineStartColor: accentColor }}>
      <div className="lms-stat-card__content">
        <Statistic title={title || 'Chỉ số'} value={value ?? 0} />
        {icon ? (
          <div className="lms-stat-card__icon" style={{ color: accentColor }}>
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
