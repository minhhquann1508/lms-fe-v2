import axios from './axios-instance';
import type { ApiEnvelope, Category } from '@/types';

export const categoryService = {
  async getAll(): Promise<Category[]> {
    const res = (await axios.get('/categories')) as unknown as ApiEnvelope<Category[]>;
    return res.data;
  },

  async getById(id: string): Promise<Category> {
    const res = (await axios.get(`/categories/${id}`)) as unknown as ApiEnvelope<Category>;
    return res.data;
  },

  async create(data: { name: string; icon?: string; description?: string }): Promise<Category> {
    const res = (await axios.post('/categories', data)) as unknown as ApiEnvelope<Category>;
    return res.data;
  },

  async update(id: string, data: { name?: string; icon?: string; description?: string }): Promise<Category> {
    const res = (await axios.put(`/categories/${id}`, data)) as unknown as ApiEnvelope<Category>;
    return res.data;
  },

  async remove(id: string): Promise<void> {
    await axios.delete(`/categories/${id}`);
  },
};
