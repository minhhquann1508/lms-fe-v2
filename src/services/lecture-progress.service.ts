import axios from './axios-instance';
import type {
  EnrollmentLectureProgressSnapshot,
  SyncLectureProgressPayload,
  ApiEnvelope,
} from '@/types';

export const lectureProgressService = {
  async getByEnrollment(enrollmentId: string): Promise<EnrollmentLectureProgressSnapshot> {
    const res = (await axios.get(
      `/lecture-progress/enrollment/${enrollmentId}`,
    )) as unknown as ApiEnvelope<EnrollmentLectureProgressSnapshot>;
    return res.data;
  },

  async sync(payload: SyncLectureProgressPayload): Promise<EnrollmentLectureProgressSnapshot> {
    const res = (await axios.put(
      '/lecture-progress',
      payload,
    )) as unknown as ApiEnvelope<EnrollmentLectureProgressSnapshot>;
    return res.data;
  },
};
