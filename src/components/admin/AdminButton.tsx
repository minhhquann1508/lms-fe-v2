import { LoadingOutlined } from '@ant-design/icons';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'danger-outline';
  size?: 'md' | 'sm';
  icon?: ReactNode;
  loading?: boolean;
}

export default function AdminButton({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  children,
  disabled,
  className,
  ...rest
}: AdminButtonProps) {
  const classes = [
    'lms-admin-btn',
    `lms-admin-btn--${variant}`,
    size === 'sm' ? 'lms-admin-btn--sm' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {loading ? <LoadingOutlined /> : icon}
      {children}
    </button>
  );
}
