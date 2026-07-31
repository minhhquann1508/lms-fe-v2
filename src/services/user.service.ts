import axios from './axios-instance';
import type { ApiEnvelope, PaginatedResponse, User, UserInfo } from '@/types';

export interface UserListParams {
  page: number;
  limit: number;
  search?: string;
  roleCode?: string;
  isActive?: boolean;
}

export interface UpdateProfilePayload {
  fullName?: string;
  avatar?: string | null;
}

export const userService = {
  async getAll(params: UserListParams): Promise<PaginatedResponse<User>> {
    const res = (await axios.get('/users', { params })) as unknown as ApiEnvelope<
      PaginatedResponse<User>
    >;
    return res.data;
  },

  async updateMe(payload: UpdateProfilePayload): Promise<UserInfo> {
    const res = (await axios.patch('/users/me', payload)) as unknown as ApiEnvelope<UserInfo>;
    return res.data;
  },

  async updateRole(userId: string, roleCode: string): Promise<UserInfo> {
    const res = (await axios.patch(`/users/${userId}/role`, {
      roleCode,
    })) as unknown as ApiEnvelope<UserInfo>;
    return res.data;
  },

  async toggleActive(userId: string): Promise<UserInfo> {
    const res = (await axios.patch(
      `/users/${userId}/toggle-active`,
    )) as unknown as ApiEnvelope<UserInfo>;
    return res.data;
  },

  async createUser(payload: {
    email: string;
    password: string;
    fullName: string;
    roleCode?: string;
  }): Promise<UserInfo> {
    const res = (await axios.post('/users', payload)) as unknown as ApiEnvelope<UserInfo>;
    return res.data;
  },

  async bulkImport(users: Array<{ email: string; fullName: string }>): Promise<{
    created: number;
    skipped: number;
    errors: string[];
  }> {
    const res = (await axios.post('/users/bulk-import', { users })) as unknown as ApiEnvelope<{
      created: number;
      skipped: number;
      errors: string[];
    }>;
    return res.data;
  },
};
