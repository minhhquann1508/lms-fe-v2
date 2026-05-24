import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { ADMIN, SUPER_ADMIN } from '@/constants';
import { Spin } from 'antd';

export default function AdminGuard() {
  const { user, _hasHydrated } = useAuthStore();

  if (!_hasHydrated) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (user.roleCode !== ADMIN && user.roleCode !== SUPER_ADMIN) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
