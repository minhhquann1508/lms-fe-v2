import type { ReactNode } from 'react';
import AdminPageHead from './AdminPageHead';

interface AdminListPageShellProps {
  title: string;
  subtitle?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export default function AdminListPageShell({ title, subtitle, filters, actions, children }: AdminListPageShellProps) {
  return (
    <div>
      <AdminPageHead title={title} subtitle={subtitle} />
      {filters || actions ? (
        <div className="lms-admin-list-toolbar">
          {filters ? <div className="lms-admin-toolbar-left">{filters}</div> : null}
          {actions ? <div className="lms-admin-toolbar-right">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
