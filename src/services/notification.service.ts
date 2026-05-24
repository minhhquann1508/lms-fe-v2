import axios from './axios-instance';
import type { ApiEnvelope, Notification, PaginatedResponse } from '@/types';

export const notificationService = {
  async getMy(params: { page: number; limit: number }): Promise<PaginatedResponse<Notification>> {
    const res = (await axios.get('/notifications/my', {
      params,
    })) as unknown as ApiEnvelope<PaginatedResponse<Notification>>;
    return res.data;
  },

  async markAsRead(notificationId: string): Promise<void> {
    await axios.patch(`/notifications/${notificationId}/read`);
  },
};
