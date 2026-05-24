import { Space, Typography } from 'antd';
import type { ReactNode } from 'react';

const { Title, Paragraph } = Typography;

export interface PageHeaderAction {
  /** Stable identifier used as React key for an action button. */
  key: string;
  /** Rendered button or control displayed on the right side of the header. */
  node: ReactNode;
}

export interface PageHeaderProps {
  /** Main page title, truncated after a safe display length. */
  title: string;
  /** Optional supporting copy shown below the title. */
  subtitle?: string;
  /** Optional action controls, capped to three items for visual balance. */
  actions?: PageHeaderAction[];
}

export function PageHeader({ title, subtitle, actions = [] }: PageHeaderProps) {
  const safeTitle = title.slice(0, 80);
  const safeSubtitle = subtitle?.slice(0, 150);
  const visibleActions = actions.slice(0, 3);

  return (
    <div className="lms-page-header">
      <div className="lms-page-header__copy">
        <Title level={2} className="lms-page-header__title">
          {safeTitle}
        </Title>
        {safeSubtitle ? (
          <Paragraph className="lms-page-header__subtitle">{safeSubtitle}</Paragraph>
        ) : null}
      </div>
      {visibleActions.length ? (
        <Space wrap className="lms-page-header__actions">
          {visibleActions.map((action) => (
            <span key={action.key}>{action.node}</span>
          ))}
        </Space>
      ) : null}
    </div>
  );
}
