import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Drawer, Dropdown } from 'antd';
import {
  AuditOutlined,
  BookOutlined,
  DashboardOutlined,
  FormOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services';
import { queryKeys } from '@/config/query-keys';
import { useBreakpoint } from '@/hooks';
import { NotificationDropdown } from '@/components';

interface NavItem {
  key: string;
  icon: ComponentType;
  label: string;
}

const navItems: NavItem[] = [
  { key: '/admin/dashboard', icon: DashboardOutlined, label: 'Dashboard' },
  { key: '/admin/courses', icon: BookOutlined, label: 'Khoá học' },
  { key: '/admin/enrollments', icon: AuditOutlined, label: 'Ghi danh' },
  { key: '/admin/users', icon: TeamOutlined, label: 'Người dùng' },
  { key: '/admin/quizzes', icon: FormOutlined, label: 'Bài kiểm tra' },
  { key: '/admin/site-settings', icon: SettingOutlined, label: 'Cài đặt trang' },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, setUser, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const breakpoint = useBreakpoint();

  const { data: freshUser } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => (await authService.getMe()).data,
    enabled: !!user,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (freshUser && freshUser.id === user?.id && freshUser !== user) {
      setUser(freshUser);
    }
  }, [freshUser, user, setUser]);

  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';
  const sidebarCollapsed = isTablet || collapsed;
  const sidebarWidth = sidebarCollapsed ? 72 : 256;

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      clearAuth();
      navigate('/auth');
    }
  };

  const userMenuItems = [
    { key: 'profile', label: <Link to="/profile">Hồ sơ</Link>, icon: <UserOutlined /> },
    { type: 'divider' as const },
    {
      key: 'logout',
      label: 'Đăng xuất',
      className: 'lms-account-menu__logout',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  const selectedKey = navItems
    .filter((item) => location.pathname.startsWith(item.key))
    .sort((a, b) => b.key.length - a.key.length)[0]?.key;

  const renderNav = (onClick?: () => void) => (
    <nav className="lms-admin-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = selectedKey === item.key;
        const className = [
          'lms-admin-nav__item',
          isActive ? 'lms-admin-nav__item--active' : '',
          sidebarCollapsed && !isMobile ? 'lms-admin-nav__item--collapsed' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <Link key={item.key} to={item.key} className={className} onClick={onClick}>
            <Icon />
            {(!sidebarCollapsed || isMobile) && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const renderLogo = () => (
    <div className="lms-admin-logo">
      <BookOutlined />
      {(!sidebarCollapsed || isMobile) && <span>LMS Admin</span>}
    </div>
  );

  const sidebar = (
    <>
      {renderLogo()}
      {renderNav(isMobile ? () => setDrawerOpen(false) : undefined)}
    </>
  );

  return (
    <div className="lms-admin-shell">
      {!isMobile ? (
        <aside
          className="lms-admin-sidebar"
          style={{ width: sidebarWidth }}
        >
          {sidebar}
        </aside>
      ) : (
        <Drawer
          className="lms-admin-mobile-drawer"
          onClose={() => setDrawerOpen(false)}
          open={drawerOpen}
          placement="left"
          width={280}
          styles={{ body: { padding: 0, background: 'var(--color-surface)' } }}
        >
          {sidebar}
        </Drawer>
      )}

      <div className="lms-admin-main" style={{ marginLeft: isMobile ? 0 : sidebarWidth }}>
        <header className="lms-admin-topbar">
          <button
            aria-label={
              isMobile || sidebarCollapsed ? 'Mở điều hướng admin' : 'Thu gọn điều hướng admin'
            }
            className="lms-admin-topbar__toggle"
            onClick={() => (isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed))}
            type="button"
          >
            {isMobile ? <MenuOutlined /> : sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>

          <div className="lms-admin-topbar__right">
            <NotificationDropdown />

            <Dropdown
              menu={{ items: userMenuItems, className: 'lms-account-menu' }}
              placement="bottomRight"
              trigger={['click']}
            >
              <div className="lms-admin-user-trigger">
                <Avatar
                  size={32}
                  src={user?.avatar}
                  icon={!user?.avatar ? <UserOutlined /> : undefined}
                />
                {!isMobile ? (
                  <span className="lms-admin-user-trigger__name">{user?.fullName}</span>
                ) : null}
              </div>
            </Dropdown>
          </div>
        </header>

        <main className="lms-admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
