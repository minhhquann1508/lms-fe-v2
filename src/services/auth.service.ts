import axios from './axios-instance';
import type { ApiEnvelope, LoginPayload, LoginResponse, RegisterPayload, UserInfo } from '@/types';

export const authService = {
  login(data: LoginPayload): Promise<ApiEnvelope<LoginResponse>> {
    return axios.post('/auth/login', data) as Promise<ApiEnvelope<LoginResponse>>;
  },

  register(data: RegisterPayload): Promise<ApiEnvelope<LoginResponse>> {
    return axios.post('/auth/register', data) as Promise<ApiEnvelope<LoginResponse>>;
  },

  getMe(): Promise<ApiEnvelope<UserInfo>> {
    return axios.get('/auth/me') as Promise<ApiEnvelope<UserInfo>>;
  },

  logout(): Promise<void> {
    return axios.delete('/auth/logout') as unknown as Promise<void>;
  },

  refreshToken(): Promise<ApiEnvelope<{ token: string }>> {
    return axios.get('/auth/refresh-token') as Promise<ApiEnvelope<{ token: string }>>;
  },

  forgotPassword(email: string): Promise<ApiEnvelope<{ message: string }>> {
    return axios.post('/auth/forgot-password', { email }) as Promise<ApiEnvelope<{ message: string }>>;
  },

  resetPassword(token: string, email: string, password: string): Promise<ApiEnvelope<{ message: string }>> {
    return axios.post('/auth/reset-password', { token, email, password }) as Promise<ApiEnvelope<{ message: string }>>;
  },
};
