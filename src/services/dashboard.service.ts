import axios from './axios-instance';
import type { DashboardOverview, DashboardCourseHighlights, ApiEnvelope } from '@/types';

export const dashboardService = {
  async getOverview(): Promise<DashboardOverview> {
    const res = (await axios.get(
      '/dashboard/overview',
    )) as unknown as ApiEnvelope<DashboardOverview>;
    return res.data;
  },

  async getCourseHighlights(limit = 5): Promise<DashboardCourseHighlights> {
    const res = (await axios.get('/dashboard/course-highlights', {
      params: { limit },
    })) as unknown as ApiEnvelope<DashboardCourseHighlights>;
    return res.data;
  },
};
