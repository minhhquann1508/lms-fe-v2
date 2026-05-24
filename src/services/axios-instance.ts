import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { message } from 'antd';
import { useAuthStore } from '@/store/auth.store';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const instance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshTokenPromise: Promise<string> | null = null;
let hasShownSessionExpired = false;

const requestNewAccessToken = async (): Promise<string> => {
  if (!refreshTokenPromise) {
    refreshTokenPromise = axios
      .get(`${API_BASE_URL}/auth/refresh-token`, {
        withCredentials: true,
      })
      .then((response) => {
        const token = response.data?.data?.token;

        if (!token) {
          throw new Error('UNAUTHENTICATED');
        }

        useAuthStore.getState().setToken(token);
        return token;
      })
      .catch((error) => {
        useAuthStore.getState().clearAuth();
        if (!hasShownSessionExpired && !window.location.pathname.includes('/auth')) {
          hasShownSessionExpired = true;
          message.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 5);
          window.setTimeout(() => {
            window.location.assign('/auth');
          }, 300);
        }
        throw error;
      })
      .finally(() => {
        refreshTokenPromise = null;
      });
  }

  return refreshTokenPromise;
};

/* ── Request interceptor: attach Bearer token ── */
instance.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/* ── Response interceptor: unwrap data, auto-refresh 401 ── */
instance.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const requestUrl = originalRequest?.url ?? '';
    const shouldRefresh =
      error.response?.status === 401 &&
      !!originalRequest &&
      !originalRequest._retry &&
      !requestUrl.includes('/auth/login') &&
      !requestUrl.includes('/auth/google') &&
      !requestUrl.includes('/auth/refresh-token') &&
      !requestUrl.includes('/auth/logout') &&
      !requestUrl.includes('/auth/register');

    if (shouldRefresh && originalRequest) {
      originalRequest._retry = true;
      originalRequest.headers = originalRequest.headers ?? {};

      try {
        const newAccessToken = await requestNewAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return instance(originalRequest);
      } catch (refreshError) {
        return Promise.reject((refreshError as AxiosError)?.response?.data ?? refreshError);
      }
    }

    return Promise.reject(error.response?.data ?? error);
  },
);

export default instance;
