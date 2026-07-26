import { Outlet } from 'react-router-dom';
import { BookOutlined } from '@ant-design/icons';

export default function AuthLayout() {
  return (
    <div className="lms-auth-page">
      {/* Abstract geometric decoration */}
      <div className="lms-auth-geo lms-auth-geo--1" />
      <div className="lms-auth-geo lms-auth-geo--2" />
      <div className="lms-auth-geo lms-auth-geo--3" />
      <div className="lms-auth-geo lms-auth-geo--4" />
      <div className="lms-auth-geo-dot lms-auth-geo-dot--1" />
      <div className="lms-auth-geo-dot lms-auth-geo-dot--2" />
      <div className="lms-auth-geo-dot lms-auth-geo-dot--3" />
      <div className="lms-auth-geo-dot lms-auth-geo-dot--4" />

      <div className="lms-auth-wrapper">
        {/* Branding header */}
        <header className="lms-auth-branding">
          <div className="lms-auth-illustration">
            <div className="lms-auth-illustration__inner">
              <div className="lms-auth-illustration__bg" />
              <div className="lms-auth-illustration__icon">
                <BookOutlined />
              </div>
            </div>
          </div>
          <h1 className="lms-auth-brand-name">LMS Platform</h1>
          <p className="lms-auth-brand-tagline">Nền tảng học tập trực tuyến hiện đại</p>
        </header>

        <Outlet />
      </div>
    </div>
  );
}
