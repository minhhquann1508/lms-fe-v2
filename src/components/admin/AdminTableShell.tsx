import type { ReactNode } from 'react';

interface AdminTableShellProps {
  thead: ReactNode;
  children: ReactNode;
  pagination?: ReactNode;
}

export default function AdminTableShell({ thead, children, pagination }: AdminTableShellProps) {
  return (
    <div className="lms-admin-table-wrap">
      <table className="lms-admin-table">
        <thead>{thead}</thead>
        <tbody>{children}</tbody>
      </table>
      {pagination}
    </div>
  );
}
