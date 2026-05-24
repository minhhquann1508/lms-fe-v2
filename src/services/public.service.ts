import axios from './axios-instance';
import type { ApiEnvelope } from '@/types';

export interface PublicStats {
  totalCourses: number;
  totalStudents: number;
  averageRating: string;
}

export const publicService = {
  async getStats(): Promise<PublicStats> {
    const res = (await axios.get('/public/stats')) as unknown as ApiEnvelope<PublicStats>;
    return res.data;
  },
};
