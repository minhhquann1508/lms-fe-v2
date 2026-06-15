import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin, message } from 'antd';
import { authService } from '@/services';
import { useAuthStore } from '@/store/auth.store';
import { ADMIN, SUPER_ADMIN } from '@/constants';
import { getAuthErrorMessage } from '@/utils/auth-error-message';
import { readOrCreateDeviceUid } from '@/utils/device';
import DeviceLimitModal from './DeviceLimitModal';
import { ACCOUNT_IN_USE_CODE, decodeDeviceLimitDetails } from '@/utils/device-limit-error';
import { useState } from 'react';
import type { ActiveLoginDevice } from '@/types';

/**
 * Handles the Google OAuth callback.
 * BE redirects here with ?token=... after successful Google auth,
 * or ?error=ERROR_CODE when authentication fails.
 */
export default function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const hasRun = useRef(false);
  const initialDeviceLimitOpen = searchParams.get('error') === ACCOUNT_IN_USE_CODE;
  const [deviceLimitOpen] = useState(initialDeviceLimitOpen);
  const [activeDevices] = useState<ActiveLoginDevice[]>(() =>
    initialDeviceLimitOpen ? decodeDeviceLimitDetails(searchParams.get('details')) : [],
  );

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    // Handle error redirect from backend
    const errorCode = searchParams.get('error');
    if (errorCode) {
      if (errorCode === ACCOUNT_IN_USE_CODE) {
        return;
      }

      message.error(getAuthErrorMessage(errorCode));
      navigate('/auth');
      return;
    }

    const token = searchParams.get('token');
    if (!token) {
      message.error('Token không hợp lệ');
      navigate('/auth');
      return;
    }

    // Store token first so axios-instance attaches Bearer automatically
    useAuthStore.getState().setToken(token);

    authService
      .getMe()
      .then((res) => {
        setAuth(res.data, token);
        message.success('Đăng nhập Google thành công!');
        const role = res.data.roleCode;
        if (role === ADMIN || role === SUPER_ADMIN) {
          navigate('/admin/dashboard');
        } else {
          navigate('/');
        }
      })
      .catch(() => {
        message.error('Xác thực thất bại');
        useAuthStore.getState().clearAuth();
        navigate('/auth');
      });
  }, [searchParams, navigate, setAuth]);

  /**
   * Revoke the earliest active session by re-initiating Google OAuth login
   * with the revokeSessionId param. BE will revoke the session during the
   * callback before checking device limits.
   * Sessions are sorted by loginAt DESC — the last element is the earliest.
   */
  const handleRevokeEarliest = () => {
    if (activeDevices.length === 0) return;
    const earliest = activeDevices[activeDevices.length - 1];
    if (!earliest.sessionId) {
      message.error('Không thể xác định phiên đăng nhập sớm nhất.');
      return;
    }
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
    const deviceUid = readOrCreateDeviceUid();
    const params = new URLSearchParams({
      device_uid: deviceUid,
      revokeSessionId: earliest.sessionId,
    });
    window.location.href = `${apiBase}/auth/google?${params.toString()}`;
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Spin description="Đang xác thực..." size="large" />
      </div>
      <DeviceLimitModal
        activeDevices={activeDevices}
        onClose={() => navigate('/auth')}
        onRevokeEarliest={handleRevokeEarliest}
        open={deviceLimitOpen}
      />
    </>
  );
}
