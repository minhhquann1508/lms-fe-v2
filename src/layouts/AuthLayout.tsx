import { Outlet } from 'react-router-dom';
import { Layout, Typography } from 'antd';
import { BookOutlined } from '@ant-design/icons';

export default function AuthLayout() {
  return (
    <Layout className="lms-auth-layout">
      <aside className="lms-auth-brand">
        <BookOutlined className="lms-auth-brand__icon" />
        <Typography.Title className="lms-auth-brand__title" level={1}>
          LMS Platform
        </Typography.Title>
        <Typography.Text className="lms-auth-brand__subtitle">
          Nền tảng học tập trực tuyến hiện đại, giúp bạn nâng cao kỹ năng mỗi ngày.
        </Typography.Text>
      </aside>

      <main className="lms-auth-panel">
        <section className="lms-auth-card">
          <div className="lms-auth-card__header">
            <Typography.Title level={2}>Chào mừng trở lại</Typography.Title>
            <Typography.Text type="secondary">
              Vui lòng đăng nhập hoặc đăng ký để tiếp tục.
            </Typography.Text>
          </div>
          <Outlet />
        </section>
      </main>
    </Layout>
  );
}
