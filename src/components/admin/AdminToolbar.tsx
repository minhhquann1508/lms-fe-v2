interface AdminToolbarProps {
  children: React.ReactNode;
}

export default function AdminToolbar({ children }: AdminToolbarProps) {
  return <div className="lms-admin-toolbar">{children}</div>;
}
