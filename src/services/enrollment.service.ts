import axios from './axios-instance';
import type {
  ApiEnvelope,
  Enrollment,
  EnrollmentLearningNote,
  EnrollmentStatus,
  PaginatedResponse,
} from '@/types';

export interface CreateEnrollmentPayload {
  courseId: string;
  notes?: string;
  fullName?: string;
  phone?: string;
}

export interface UpdateEnrollmentLearningStatePayload {
  activeLectureId?: string;
  notes?: EnrollmentLearningNote[];
}

export interface ReviewEnrollmentPayload {
  status: Extract<EnrollmentStatus, 'active' | 'rejected'>;
  reviewNote?: string;
}

export interface DirectEnrollResponse {
  created: number;
  skipped: number;
  enrollments: Enrollment[];
}

export const enrollmentService = {
  async getById(enrollmentId: string): Promise<Enrollment> {
    const res = (await axios.get(
      `/enrollments/${enrollmentId}`,
    )) as unknown as ApiEnvelope<Enrollment>;
    return res.data;
  },

  async create(data: CreateEnrollmentPayload): Promise<Enrollment> {
    const res = (await axios.post('/enrollments', data)) as unknown as ApiEnvelope<Enrollment>;
    return res.data;
  },

  async getMineByCourse(courseId: string): Promise<Enrollment | null> {
    const res = (await axios.get(
      `/enrollments/my-course/${courseId}`,
    )) as unknown as ApiEnvelope<Enrollment | null>;
    return res.data;
  },

  async getAll(params: {
    page: number;
    limit: number;
    search?: string;
    status?: EnrollmentStatus;
  }): Promise<PaginatedResponse<Enrollment>> {
    const res = (await axios.get('/enrollments/all', {
      params,
    })) as unknown as ApiEnvelope<PaginatedResponse<Enrollment>>;
    return res.data;
  },

  async getMyEnrollments(params: {
    page: number;
    limit: number;
    search?: string;
    status?: EnrollmentStatus;
  }): Promise<PaginatedResponse<Enrollment>> {
    const res = (await axios.get('/enrollments/my-enrollments', {
      params,
    })) as unknown as ApiEnvelope<PaginatedResponse<Enrollment>>;
    return res.data;
  },

  async getByCourse(
    courseId: string,
    params: {
      page: number;
      limit: number;
      search?: string;
      status?: EnrollmentStatus;
    },
  ): Promise<PaginatedResponse<Enrollment>> {
    const res = (await axios.get(`/enrollments/course/${courseId}`, {
      params,
    })) as unknown as ApiEnvelope<PaginatedResponse<Enrollment>>;
    return res.data;
  },

  async updateLearningState(
    enrollmentId: string,
    payload: UpdateEnrollmentLearningStatePayload,
  ): Promise<Enrollment> {
    const res = (await axios.patch(
      `/enrollments/${enrollmentId}/learning-state`,
      payload,
    )) as unknown as ApiEnvelope<Enrollment>;
    return res.data;
  },

  async review(enrollmentId: string, payload: ReviewEnrollmentPayload): Promise<Enrollment> {
    const res = (await axios.patch(
      `/enrollments/${enrollmentId}/review`,
      payload,
    )) as unknown as ApiEnvelope<Enrollment>;
    return res.data;
  },

  async addDirect(
    courseId: string,
    userIds: string[],
  ): Promise<DirectEnrollResponse> {
    const res = (await axios.post('/enrollments/direct', { courseId, userIds })) as unknown as ApiEnvelope<DirectEnrollResponse>;
    return res.data;
  },
};
