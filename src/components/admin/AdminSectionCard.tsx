import type { ReactNode } from 'react';

interface AdminSectionCardProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function AdminSectionCard({ title, description, actions, children }: AdminSectionCardProps) {
  return (
    <div className="lms-admin-section-card">
      <div className="lms-admin-section-card__head">
        <div>
          <h3 className="lms-admin-section-card__title">{title}</h3>
          {description ? <p className="lms-admin-section-card__desc">{description}</p> : null}
        </div>
        {actions}
      </div>
      <div className="lms-admin-section-card__body">{children}</div>
    </div>
  );
}
