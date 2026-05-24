import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Button, Drawer, Dropdown, Layout, Menu, Space, Typography } from 'antd';
import {
  AuditOutlined,
  BookOutlined,
  DashboardOutlined,
  FormOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services';
import { queryKeys } from '@/config/query-keys';
import { useBreakpoint } from '@/hooks';
import { colors } from '@/config/theme';
import { NotificationDropdown } from '@/components';

const { Header, Sider, Content } = Layout;

const siderMenuItems = [
  {
    key: '/admin/dashboard',
    icon: <DashboardOutlined />,
    label: <Link to="/admin/dashboard">Dashboard</Link>,
  },
  {
    key: '/admin/courses',
    icon: <BookOutlined />,
    label: <Link to="/admin/courses">Khoá học</Link>,
  },
  {
    key: '/admin/enrollments',
    icon: <AuditOutlined />,
    label: <Link to="/admin/enrollments">Ghi danh</Link>,
  },
  {
    key: '/admin/users',
    icon: <TeamOutlined />,
    label: <Link to="/admin/users">Người dùng</Link>,
  },
  {
    key: '/admin/quizzes',
    icon: <FormOutlined />,
    label: <Link to="/admin/quizzes">Bài kiểm tra</Link>,
  },
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
  const sidebarWidth = sidebarCollapsed ? 64 : 240;

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

  const selectedKey = siderMenuItems.find((item) => location.pathname.startsWith(item.key))?.key;

  const sidebar = (
    <>
      <div className="lms-admin-logo">
        <BookOutlined />
        {!sidebarCollapsed || isMobile ? <Typography.Text>LMS Admin</Typography.Text> : null}
      </div>
      <Menu
        items={siderMenuItems}
        mode="inline"
        onClick={() => setDrawerOpen(false)}
        selectedKeys={selectedKey ? [selectedKey] : []}
        theme="dark"
      />
    </>
  );

  return (
    <Layout className="lms-admin-layout">
      {!isMobile ? (
        <Sider
          className="lms-admin-sidebar"
          collapsed={sidebarCollapsed}
          collapsedWidth={64}
          theme="dark"
          width={240}
        >
          {sidebar}
        </Sider>
      ) : (
        <Drawer
          className="lms-admin-mobile-drawer"
          onClose={() => setDrawerOpen(false)}
          open={drawerOpen}
          placement="left"
          width={280}
        >
          <div style={{ background: colors.sidebarBg, minHeight: '100vh' }}>{sidebar}</div>
        </Drawer>
      )}

      <Layout className="lms-admin-main" style={{ marginLeft: isMobile ? 0 : sidebarWidth }}>
        <Header className="lms-admin-header">
          <Button
            aria-label={
              isMobile || sidebarCollapsed ? 'Mở điều hướng admin' : 'Thu gọn điều hướng admin'
            }
            icon={isMobile || sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => (isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed))}
            type="text"
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <NotificationDropdown />

            <Dropdown
              menu={{ items: userMenuItems, className: 'lms-account-menu' }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Space className="lms-account-trigger lms-account-trigger--compact" size={10}>
                <Avatar
                  size={30}
                  src={user?.avatar}
                  icon={!user?.avatar ? <UserOutlined /> : undefined}
                />
                {!isMobile ? (
                  <span className="lms-account-trigger__name">{user?.fullName}</span>
                ) : null}
              </Space>
            </Dropdown>
          </div>
        </Header>

        <Content className="lms-admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
