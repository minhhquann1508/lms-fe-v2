import { Tabs, Form, Input, Button, message, Divider } from 'antd';
import { GoogleOutlined, MailOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [deviceLimitOpen, setDeviceLimitOpen] = useState(false);
  const [activeDevices, setActiveDevices] = useState<ActiveLoginDevice[]>([]);
  const [forgotMode, setForgotMode] = useState<'login' | 'forgot' | 'sent'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setAuth } = useAuthStore();

  // Read revokeSessionId from URL (set by GoogleCallbackPage redirect)
  const pendingRevokeSessionId = useRef(searchParams.get('revokeSessionId'));
  // Clean up the URL param after reading
  if (pendingRevokeSessionId.current && searchParams.has('revokeSessionId')) {
    const next = new URLSearchParams(searchParams);
    next.delete('revokeSessionId');
    setSearchParams(next, { replace: true });
  }

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
    pendingRevokeSessionId.current = null; // only use once
    return doLogin(values, revokeId);
  };

  /**
   * Revoke the earliest active session and retry login.
   * Sessions are sorted by loginAt DESC — the last element is the earliest.
   */
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

    doLogin(currentValues, earliest.sessionId).finally(() => {
      setRevoking(false);
    });
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

  return (
    <>
      {forgotMode === 'sent' ? (
        <div className="lms-auth-forgot-sent">
          <MailOutlined style={{ fontSize: 40, color: '#1677ff', marginBottom: 16 }} />
          <h2>Kiểm tra email của bạn</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu tới <strong>{forgotEmail}</strong>. Vui lòng
            kiểm tra hộp thư.
          </p>
          <Button type="link" onClick={() => setForgotMode('login')}>
            Quay lại đăng nhập
          </Button>
        </div>
      ) : forgotMode === 'forgot' ? (
        <div className="lms-auth-forgot">
          <h2 style={{ marginBottom: 8, textAlign: 'center' }}>Quên mật khẩu</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, textAlign: 'center' }}>
            Nhập email để nhận liên kết đặt lại mật khẩu
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const emailInput = form.elements.namedItem('email') as HTMLInputElement;
              if (emailInput?.value) {
                onForgotPassword(emailInput.value);
              }
            }}
          >
            <Form.Item style={{ marginBottom: 16 }}>
              <Input
                prefix={<MailOutlined style={{ color: '#9ca3af' }} />}
                placeholder="Email"
                size="large"
                name="email"
                type="email"
                required
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              Gửi liên kết đặt lại
            </Button>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Button type="link" onClick={() => setForgotMode('login')}>
                Quay lại đăng nhập
              </Button>
            </div>
          </form>
        </div>
      ) : (
        /* ── Login / Register tabs ── */
        <Tabs
          className="lms-auth-tabs"
          defaultActiveKey="login"
          centered
          items={[
            {
              key: 'login',
              label: 'Đăng nhập',
              children: (
                <form onSubmit={loginForm.handleSubmit(onLogin)}>
                  <Controller
                    name="email"
                    control={loginForm.control}
                    render={({ field, fieldState }) => (
                      <Form.Item
                        validateStatus={fieldState.error ? 'error' : undefined}
                        help={fieldState.error?.message}
                        style={{ marginBottom: 16 }}
                      >
                        <Input
                          {...field}
                          prefix={<MailOutlined style={{ color: '#9ca3af' }} />}
                          placeholder="Email"
                          size="large"
                          id="login-email"
                        />
                      </Form.Item>
                    )}
                  />
                  <Controller
                    name="password"
                    control={loginForm.control}
                    render={({ field, fieldState }) => (
                      <Form.Item
                        validateStatus={fieldState.error ? 'error' : undefined}
                        help={fieldState.error?.message}
                        style={{ marginBottom: 24 }}
                      >
                        <Input.Password
                          {...field}
                          prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                          placeholder="Mật khẩu"
                          size="large"
                          id="login-password"
                        />
                      </Form.Item>
                    )}
                  />
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    size="large"
                    id="login-submit"
                  >
                    Đăng nhập
                  </Button>

                  <div style={{ textAlign: 'right', marginTop: 8, marginBottom: 8 }}>
                    <Button type="link" size="small" onClick={() => setForgotMode('forgot')}>
                      Quên mật khẩu?
                    </Button>
                  </div>

                  <Divider plain>hoặc</Divider>
                  <Button
                    block
                    size="large"
                    icon={<GoogleOutlined />}
                    onClick={handleGoogleLogin}
                    id="google-login"
                  >
                    Đăng nhập bằng Google
                  </Button>
                </form>
              ),
            },
            {
              key: 'register',
              label: 'Đăng ký',
              children: (
                <form onSubmit={registerForm.handleSubmit(onRegister)}>
                  <Controller
                    name="fullName"
                    control={registerForm.control}
                    render={({ field, fieldState }) => (
                      <Form.Item
                        validateStatus={fieldState.error ? 'error' : undefined}
                        help={fieldState.error?.message}
                        style={{ marginBottom: 16 }}
                      >
                        <Input
                          {...field}
                          prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
                          placeholder="Họ tên"
                          size="large"
                          id="register-fullname"
                        />
                      </Form.Item>
                    )}
                  />
                  <Controller
                    name="email"
                    control={registerForm.control}
                    render={({ field, fieldState }) => (
                      <Form.Item
                        validateStatus={fieldState.error ? 'error' : undefined}
                        help={fieldState.error?.message}
                        style={{ marginBottom: 16 }}
                      >
                        <Input
                          {...field}
                          prefix={<MailOutlined style={{ color: '#9ca3af' }} />}
                          placeholder="Email"
                          size="large"
                          id="register-email"
                        />
                      </Form.Item>
                    )}
                  />
                  <Controller
                    name="password"
                    control={registerForm.control}
                    render={({ field, fieldState }) => (
                      <Form.Item
                        validateStatus={fieldState.error ? 'error' : undefined}
                        help={fieldState.error?.message}
                        style={{ marginBottom: 16 }}
                      >
                        <Input.Password
                          {...field}
                          prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                          placeholder="Mật khẩu (ít nhất 6 ký tự)"
                          size="large"
                          id="register-password"
                        />
                      </Form.Item>
                    )}
                  />
                  <Controller
                    name="confirmPassword"
                    control={registerForm.control}
                    render={({ field, fieldState }) => (
                      <Form.Item
                        validateStatus={fieldState.error ? 'error' : undefined}
                        help={fieldState.error?.message}
                        style={{ marginBottom: 24 }}
                      >
                        <Input.Password
                          {...field}
                          prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                          placeholder="Xác nhận mật khẩu"
                          size="large"
                          id="register-confirm-password"
                        />
                      </Form.Item>
                    )}
                  />
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    size="large"
                    id="register-submit"
                  >
                    Đăng ký
                  </Button>
                </form>
              ),
            },
          ]}
        />
      )}
      <DeviceLimitModal
        activeDevices={activeDevices}
        onClose={() => setDeviceLimitOpen(false)}
        onRevokeEarliest={handleRevokeEarliest}
        open={deviceLimitOpen}
        revoking={revoking}
      />
    </>
  );
}
