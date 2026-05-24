import axios from './axios-instance';
import type { Chapter, ApiEnvelope } from '@/types';

export interface ChapterFormData {
  name: string;
  description?: string;
  courseId?: string;
  isPublished?: boolean;
}

export interface ChapterListParams {
  courseId: string;
  page: number;
  limit: number;
  search?: string;
}

export const chapterService = {
  async getAll(params: ChapterListParams): Promise<{ items: Chapter[]; total: number }> {
    const res = (await axios.get('/chapters', { params })) as unknown as ApiEnvelope<{
      items: Chapter[];
      total: number;
    }>;
    return res.data;
  },

  async getLectures(chapterId: string) {
    const res = (await axios.get(
      `/chapters/${chapterId}/lectures`,
    )) as unknown as ApiEnvelope<unknown>;
    return res.data;
  },

  async create(data: ChapterFormData & { courseId: string }): Promise<Chapter> {
    const res = (await axios.post('/chapters', data)) as unknown as ApiEnvelope<Chapter>;
    return res.data;
  },

  async update(chapterId: string, data: ChapterFormData): Promise<Chapter> {
    const res = (await axios.put(
      `/chapters/${chapterId}`,
      data,
    )) as unknown as ApiEnvelope<Chapter>;
    return res.data;
  },

  async delete(chapterId: string): Promise<void> {
    await axios.delete(`/chapters/${chapterId}`);
  },
};
