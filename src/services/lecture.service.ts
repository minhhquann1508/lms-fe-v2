import axios from './axios-instance';
import type { Lecture, ApiEnvelope } from '@/types';

export const lectureService = {
  async create(data: FormData): Promise<Lecture> {
    const res = (await axios.post('/lectures', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })) as unknown as ApiEnvelope<Lecture>;
    return res.data;
  },

  async getById(id: string): Promise<Lecture> {
    const res = (await axios.get(`/lectures/${id}`)) as unknown as ApiEnvelope<Lecture>;
    return res.data;
  },

  async update(id: string, data: FormData): Promise<Lecture> {
    const res = (await axios.put(`/lectures/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })) as unknown as ApiEnvelope<Lecture>;
    return res.data;
  },

  async patch(id: string, payload: { order: number }): Promise<Lecture> {
    const res = (await axios.patch(`/lectures/${id}`, payload)) as unknown as ApiEnvelope<Lecture>;
    return res.data;
  },

  async reorder(items: { id: string; order: number }[]): Promise<void> {
    await axios.patch('/lectures/reorder/batch', { items });
  },

  async delete(id: string): Promise<void> {
    await axios.delete(`/lectures/${id}`);
  },
};
