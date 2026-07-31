import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { message } from 'antd';
import { GoogleOutlined, MailOutlined } from '@ant-design/icons';
import { loginSchema, registerSchema } from '@/schemas';
import type { LoginFormValues, RegisterFormValues } from '@/schemas';
import { authService } from '@/services';
import { useAuthStore } from '@/store/auth.store';
import { getDeviceInfo, readOrCreateDeviceUid } from '@/utils/device';
import { ADMIN, SUPER_ADMIN } from '@/constants';
import DeviceLimitModal from './DeviceLimitModal';
import { isApiError } from '@/utils/api-error';
import { getAuthErrorMessage } from '@/utils/auth-error-message';
import { ACCOUNT_IN_USE_CODE, getActiveDevices } from '@/utils/device-limit-error';
import type { ActiveLoginDevice } from '@/types';

type ForgotMode = 'login' | 'forgot' | 'sent';

function EmailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 4L12 13 2 4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16" r="1" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  );
}

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [deviceLimitOpen, setDeviceLimitOpen] = useState(false);
  const [activeDevices, setActiveDevices] = useState<ActiveLoginDevice[]>([]);
  const [forgotMode, setForgotMode] = useState<ForgotMode>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setAuth } = useAuthStore();

  const pendingRevokeSessionId = useRef<string | null>(null);

  useEffect(() => {
    const revokeId = searchParams.get('revokeSessionId');
    if (revokeId) {
      pendingRevokeSessionId.current = revokeId;
      const next = new URLSearchParams(searchParams);
      next.delete('revokeSessionId');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  /* ── Login form ── */
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const doLogin = async (values: LoginFormValues, revokeSessionId?: string) => {
    setLoading(true);
    try {
      const device = getDeviceInfo();
      const res = await authService.login({ ...values, device, revokeSessionId });
      setAuth(res.data.userInfo, res.data.token);
      message.success('Đăng nhập thành công!');
      const role = res.data.userInfo.roleCode;
      if (role === ADMIN || role === SUPER_ADMIN) {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      if (isApiError(err) && err.code === ACCOUNT_IN_USE_CODE) {
        setActiveDevices(getActiveDevices(err.details));
        setDeviceLimitOpen(true);
        return;
      }
      if (isApiError(err)) {
        message.error(getAuthErrorMessage(err.code ?? err.message));
        return;
      }
      message.error('Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const onLogin = (values: LoginFormValues) => {
    const revokeId = pendingRevokeSessionId.current ?? undefined;
    pendingRevokeSessionId.current = null;
    return doLogin(values, revokeId);
  };

  const handleRevokeEarliest = () => {
    if (activeDevices.length === 0) return;
    const earliest = activeDevices[activeDevices.length - 1];
    if (!earliest.sessionId) {
      message.error('Không thể xác định phiên đăng nhập sớm nhất.');
      return;
    }
    const currentValues = loginForm.getValues();
    setRevoking(true);
    setDeviceLimitOpen(false);
    doLogin(currentValues, earliest.sessionId).finally(() => setRevoking(false));
  };

  /* ── Register form ── */
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const onRegister = async (values: RegisterFormValues) => {
    setLoading(true);
    try {
      const device = getDeviceInfo();
      const res = await authService.register({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        device,
      });
      setAuth(res.data.userInfo, res.data.token);
      message.success('Đăng ký thành công!');
      navigate('/');
    } catch (err: unknown) {
      if (isApiError(err)) {
        message.error(getAuthErrorMessage(err.code ?? err.message));
        return;
      }
      message.error('Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
    const deviceUid = readOrCreateDeviceUid();
    const params = new URLSearchParams({ device_uid: deviceUid });
    window.location.href = `${apiBase}/auth/google?${params.toString()}`;
  };

  const onForgotPassword = async (email: string) => {
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setForgotEmail(email);
      setForgotMode('sent');
    } catch {
      message.error('Không thể gửi email đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const emailInput = e.currentTarget.elements.namedItem('email') as HTMLInputElement;
    if (emailInput?.value) onForgotPassword(emailInput.value);
  };

  /* ── Render ── */
  if (forgotMode === 'sent') {
    return (
      <div className="lms-auth-card">
        <div className="lms-auth-sent">
          <div className="lms-auth-sent__icon">
            <MailOutlined />
          </div>
          <h2 className="lms-auth-sent__title">Kiểm tra email của bạn</h2>
          <p className="lms-auth-sent__text">
            Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu tới <strong>{forgotEmail}</strong>. Vui lòng
            kiểm tra hộp thư.
          </p>
          <button className="lms-auth-link" onClick={() => setForgotMode('login')}>
            Quay lại đăng nhập
          </button>
        </div>
      </div>
    );
  }

  if (forgotMode === 'forgot') {
    return (
      <div className="lms-auth-card">
        <h2 className="lms-auth-forgot__title">Quên mật khẩu</h2>
        <p className="lms-auth-forgot__desc">Nhập email để nhận liên kết đặt lại mật khẩu</p>
        <form onSubmit={handleForgotSubmit}>
          <div className="lms-auth-form-group">
            <label className="lms-auth-form-label" htmlFor="forgot-email">
              Email
            </label>
            <div className="lms-auth-input-wrap">
              <span className="lms-auth-input-icon">
                <EmailIcon />
              </span>
              <input
                className="lms-auth-input"
                id="forgot-email"
                name="email"
                type="email"
                placeholder="Email của bạn"
                required
              />
            </div>
          </div>
          <button className="lms-auth-btn-primary" type="submit" disabled={loading}>
            Gửi liên kết đặt lại
          </button>
          <div className="lms-auth-forgot__back">
            <button className="lms-auth-link" onClick={() => setForgotMode('login')}>
              Quay lại đăng nhập
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="lms-auth-card">
      <h2 className="lms-auth-card__title">Chào mừng trở lại</h2>
      <p className="lms-auth-card__subtitle">Vui lòng đăng nhập hoặc đăng ký để tiếp tục.</p>

      {/* Google Login */}
      <button className="lms-auth-btn-google" onClick={handleGoogleLogin} id="google-login">
        <GoogleOutlined className="lms-auth-btn-google__icon" />
        Đăng nhập bằng Google
      </button>

      <div className="lms-auth-divider">hoặc</div>

      {/* Tabs */}
      <div className="lms-auth-tabs">
        <button
          className={`lms-auth-tab${activeTab === 'login' ? ' lms-auth-tab--active' : ''}`}
          onClick={() => setActiveTab('login')}
        >
          Đăng nhập
        </button>
        <button
          className={`lms-auth-tab${activeTab === 'register' ? ' lms-auth-tab--active' : ''}`}
          onClick={() => setActiveTab('register')}
        >
          Đăng ký
        </button>
      </div>

      {/* Login Form */}
      {activeTab === 'login' && (
        // eslint-disable-next-line react-hooks/refs
        <form onSubmit={loginForm.handleSubmit(onLogin)}>
          <Controller
            name="email"
            control={loginForm.control}
            render={({ field, fieldState }) => (
              <div className="lms-auth-form-group">
                <label className="lms-auth-form-label" htmlFor="login-email">
                  Email
                </label>
                <div className="lms-auth-input-wrap">
                  <span className="lms-auth-input-icon">
                    <EmailIcon />
                  </span>
                  <input
                    {...field}
                    className={`lms-auth-input${fieldState.error ? ' lms-auth-input--has-error' : ''}`}
                    id="login-email"
                    type="email"
                    placeholder="Email của bạn"
                    autoComplete="email"
                  />
                </div>
                {fieldState.error && <p className="lms-auth-error">{fieldState.error.message}</p>}
              </div>
            )}
          />

          <Controller
            name="password"
            control={loginForm.control}
            render={({ field, fieldState }) => (
              <div className="lms-auth-form-group">
                <label className="lms-auth-form-label" htmlFor="login-password">
                  Mật khẩu
                </label>
                <div className="lms-auth-input-wrap">
                  <span className="lms-auth-input-icon">
                    <LockIcon />
                  </span>
                  <input
                    {...field}
                    className={`lms-auth-input${fieldState.error ? ' lms-auth-input--has-error' : ''}`}
                    id="login-password"
                    type="password"
                    placeholder="Mật khẩu của bạn"
                    autoComplete="current-password"
                  />
                </div>
                {fieldState.error && <p className="lms-auth-error">{fieldState.error.message}</p>}
              </div>
            )}
          />

          <button
            className="lms-auth-btn-primary"
            type="submit"
            disabled={loading}
            id="login-submit"
          >
            Đăng nhập
          </button>

          <div className="lms-auth-form-footer" style={{ marginTop: 8 }}>
            <span />
            <button className="lms-auth-link" type="button" onClick={() => setForgotMode('forgot')}>
              Quên mật khẩu?
            </button>
          </div>
        </form>
      )}

      {/* Register Form */}
      {activeTab === 'register' && (
        <form onSubmit={registerForm.handleSubmit(onRegister)}>
          <Controller
            name="fullName"
            control={registerForm.control}
            render={({ field, fieldState }) => (
              <div className="lms-auth-form-group">
                <label className="lms-auth-form-label" htmlFor="register-fullname">
                  Họ tên
                </label>
                <div className="lms-auth-input-wrap">
                  <span className="lms-auth-input-icon">
                    <UserIcon />
                  </span>
                  <input
                    {...field}
                    className={`lms-auth-input${fieldState.error ? ' lms-auth-input--has-error' : ''}`}
                    id="register-fullname"
                    type="text"
                    placeholder="Họ và tên của bạn"
                    autoComplete="name"
                  />
                </div>
                {fieldState.error && <p className="lms-auth-error">{fieldState.error.message}</p>}
              </div>
            )}
          />

          <Controller
            name="email"
            control={registerForm.control}
            render={({ field, fieldState }) => (
              <div className="lms-auth-form-group">
                <label className="lms-auth-form-label" htmlFor="register-email">
                  Email
                </label>
                <div className="lms-auth-input-wrap">
                  <span className="lms-auth-input-icon">
                    <EmailIcon />
                  </span>
                  <input
                    {...field}
                    className={`lms-auth-input${fieldState.error ? ' lms-auth-input--has-error' : ''}`}
                    id="register-email"
                    type="email"
                    placeholder="Email của bạn"
                    autoComplete="email"
                  />
                </div>
                {fieldState.error && <p className="lms-auth-error">{fieldState.error.message}</p>}
              </div>
            )}
          />

          <Controller
            name="password"
            control={registerForm.control}
            render={({ field, fieldState }) => (
              <div className="lms-auth-form-group">
                <label className="lms-auth-form-label" htmlFor="register-password">
                  Mật khẩu
                </label>
                <div className="lms-auth-input-wrap">
                  <span className="lms-auth-input-icon">
                    <LockIcon />
                  </span>
                  <input
                    {...field}
                    className={`lms-auth-input${fieldState.error ? ' lms-auth-input--has-error' : ''}`}
                    id="register-password"
                    type="password"
                    placeholder="Mật khẩu (ít nhất 6 ký tự)"
                    autoComplete="new-password"
                  />
                </div>
                {fieldState.error && <p className="lms-auth-error">{fieldState.error.message}</p>}
              </div>
            )}
          />

          <Controller
            name="confirmPassword"
            control={registerForm.control}
            render={({ field, fieldState }) => (
              <div className="lms-auth-form-group">
                <label className="lms-auth-form-label" htmlFor="register-confirm-password">
                  Xác nhận mật khẩu
                </label>
                <div className="lms-auth-input-wrap">
                  <span className="lms-auth-input-icon">
                    <LockIcon />
                  </span>
                  <input
                    {...field}
                    className={`lms-auth-input${fieldState.error ? ' lms-auth-input--has-error' : ''}`}
                    id="register-confirm-password"
                    type="password"
                    placeholder="Xác nhận mật khẩu"
                    autoComplete="new-password"
                  />
                </div>
                {fieldState.error && <p className="lms-auth-error">{fieldState.error.message}</p>}
              </div>
            )}
          />

          <button
            className="lms-auth-btn-primary"
            type="submit"
            disabled={loading}
            id="register-submit"
          >
            Đăng ký
          </button>
        </form>
      )}

      <DeviceLimitModal
        activeDevices={activeDevices}
        onClose={() => setDeviceLimitOpen(false)}
        onRevokeEarliest={handleRevokeEarliest}
        open={deviceLimitOpen}
        revoking={revoking}
      />
    </div>
  );
}
