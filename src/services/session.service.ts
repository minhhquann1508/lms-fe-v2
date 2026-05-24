import axios from './axios-instance';
import type { ApiEnvelope, SessionListResponse } from '@/types';

export const sessionService = {
  getMySessions(): Promise<ApiEnvelope<SessionListResponse>> {
    return axios.get('/sessions/me') as Promise<ApiEnvelope<SessionListResponse>>;
  },

  revokeSession(id: string): Promise<void> {
    return axios.delete(`/sessions/${id}`) as unknown as Promise<void>;
  },

  revokeAllOtherSessions(): Promise<ApiEnvelope<{ revokedCount: number }>> {
    return axios.delete('/sessions/me/others') as Promise<ApiEnvelope<{ revokedCount: number }>>;
  },
};
