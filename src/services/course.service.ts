import axios from './axios-instance';
import type { PaginatedResponse, Course, ApiEnvelope } from '@/types';

export interface CourseListParams {
  page: number;
  limit: number;
  search?: string;
  isPublished?: boolean;
  categoryId?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface CourseFormData {
  name: string;
  description: string;
  thumbnail?: string;
  price: number;
  isPublished?: boolean;
  categoryId?: string;
}

export const courseService = {
  async getAll(params: CourseListParams): Promise<PaginatedResponse<Course>> {
    const res = (await axios.get('/courses', { params })) as unknown as ApiEnvelope<
      PaginatedResponse<Course>
    >;
    return res.data;
  },

  async getById(courseId: string): Promise<Course> {
    const res = (await axios.get(`/courses/${courseId}`)) as unknown as ApiEnvelope<Course>;
    return res.data;
  },

  async getAdminById(courseId: string): Promise<Course> {
    const res = (await axios.get(`/courses/admin/${courseId}`)) as unknown as ApiEnvelope<Course>;
    return res.data;
  },

  async create(data: CourseFormData): Promise<Course> {
    const res = (await axios.post('/courses', data)) as unknown as ApiEnvelope<Course>;
    return res.data;
  },

  async update(courseId: string, data: CourseFormData): Promise<Course> {
    const res = (await axios.put(`/courses/${courseId}`, data)) as unknown as ApiEnvelope<Course>;
    return res.data;
  },

  async delete(courseId: string): Promise<void> {
    await axios.delete(`/courses/${courseId}`);
  },
};
