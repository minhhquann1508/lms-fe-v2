interface AdminPageHeadProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function AdminPageHead({ title, subtitle, actions }: AdminPageHeadProps) {
  return (
    <div className="lms-admin-page-head">
      <div>
        <h2 className="lms-admin-page-head__title">{title}</h2>
        {subtitle ? <p className="lms-admin-page-head__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="lms-admin-page-head__actions">{actions}</div> : null}
    </div>
  );
}
