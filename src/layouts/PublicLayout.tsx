import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Button, Dropdown, Layout, Space } from 'antd';
import {
  BellOutlined,
  BookOutlined,
  LogoutOutlined,
  MenuOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { authService, siteSettingService } from '@/services';
import { queryKeys } from '@/config/query-keys';
import { useBreakpoint } from '@/hooks';
import { NotificationDropdown } from '@/components';

const { Content } = Layout;

export default function PublicLayout() {
  const { user, setUser, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const breakpoint = useBreakpoint();
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(location.pathname !== '/');

  const { data: freshUser } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => (await authService.getMe()).data,
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: settings } = useQuery({
    queryKey: queryKeys.siteSettings.all,
    queryFn: () => siteSettingService.get(),
    staleTime: 300_000,
  });

  useEffect(() => {
    if (freshUser && freshUser.id === user?.id && freshUser !== user) {
      setUser(freshUser);
    }
  }, [freshUser, user, setUser]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      clearAuth();
      navigate('/auth');
    }
  };

  const navItems = [
    { label: 'Trang chủ', path: '/' },
    { label: 'Khoá học', path: '/' },
    { label: 'Khoá học của tôi', path: '/profile', protected: true },
  ];

  const userMenuItems = user
    ? [
        { key: 'profile', label: <Link to="/profile">Hồ sơ</Link>, icon: <UserOutlined /> },
        {
          key: 'notifications',
          label: <Link to="/profile#notifications">Thông báo</Link>,
          icon: <BellOutlined />,
        },
        {
          key: 'my-learning',
          label: <Link to="/profile">Khoá học của tôi</Link>,
          icon: <BookOutlined />,
        },
        { type: 'divider' as const },
        {
          key: 'logout',
          label: 'Đăng xuất',
          className: 'lms-account-menu__logout',
          icon: <LogoutOutlined />,
          onClick: handleLogout,
        },
      ]
    : [{ key: 'login', label: <Link to="/auth">Đăng nhập</Link>, icon: <UserOutlined /> }];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <header className={`lms-public-header${scrolled ? ' lms-public-header--scrolled' : ''}`}>
        <Link className="lms-brand" to="/">
          {settings?.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.logoAlt ?? 'Logo'}
              className="lms-brand__logo"
            />
          ) : (
            <span className="lms-brand__icon">
              <BookOutlined />
            </span>
          )}
          <span className="lms-brand__name">{settings?.footerBrandName ?? 'LMS Platform'}</span>
        </Link>

        <nav className="lms-public-nav">
          {navItems.map((item) => {
            const active = item.path !== '#more' && location.pathname === item.path;
            const target = item.protected && !user ? '/auth' : item.path;
            return (
              <Link
                key={item.label}
                className={`lms-public-nav__link${active ? ' lms-public-nav__link--active' : ''}`}
                to={target}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="lms-public-actions">
          {user ? <NotificationDropdown /> : null}

          {user && breakpoint !== 'mobile' ? (
            <Dropdown
              menu={{ items: userMenuItems, className: 'lms-account-menu' }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Space className="lms-account-trigger lms-account-trigger--compact" size={10}>
                <Avatar
                  size={30}
                  src={user.avatar}
                  icon={!user.avatar ? <UserOutlined /> : undefined}
                />
                <span className="lms-account-trigger__name">{user.fullName}</span>
              </Space>
            </Dropdown>
          ) : !user ? (
            <Button className="lms-login-btn" onClick={() => navigate('/auth')}>
              Đăng nhập
            </Button>
          ) : null}
        </div>

        {breakpoint === 'mobile' && user ? (
          <Dropdown
            menu={{ items: userMenuItems }}
            onOpenChange={setMoreOpen}
            open={moreOpen}
            placement="bottomRight"
            trigger={['click']}
          >
            <Button aria-label="Mở menu tài khoản" icon={<MenuOutlined />} type="text" />
          </Dropdown>
        ) : null}
      </header>

      <Content style={{ paddingTop: '80px' }}>
        <Outlet />
      </Content>

      <footer className="lms-public-footer">
        <div className="lms-public-footer__brand">
          <span className="lms-public-footer__icon">
            <BookOutlined />
          </span>
          <span>{settings?.footerBrandName ?? 'LMS Platform'}</span>
        </div>
        <div className="lms-public-footer__links">
          {settings?.footerLinks && settings.footerLinks.length > 0 ? (
            settings.footerLinks.map((link, i) => (
              <Link key={i} to={link.url}>
                {link.label}
              </Link>
            ))
          ) : (
            <>
              <Link to="/">Trang chủ</Link>
              <Link to="/">Khoá học</Link>
            </>
          )}
          {user ? <Link to="/profile">Hồ sơ</Link> : null}
        </div>
        <div className="lms-public-footer__copy">
          {settings?.footerCopyright
            ? settings.footerCopyright.replace('{year}', String(new Date().getFullYear()))
            : `© ${new Date().getFullYear()} LMS Platform. All rights reserved.`}
        </div>
      </footer>
    </Layout>
  );
}
