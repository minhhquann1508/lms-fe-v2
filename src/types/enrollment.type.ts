import type { Course } from './course.type';
import type { EnrollmentLearningState } from './learning.type';

export type EnrollmentStatus = 'pending' | 'active' | 'rejected' | 'inactive' | 'cancelled';

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  notes?: string | null;
  learningStateRaw?: string | null;
  fullName?: string | null;
  phone?: string | null;
  progress: number;
  startAt: string;
  completedAt: string | null;
  approvedAt?: string | null;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
  course: Course;
  user?: {
    id: string;
    email: string;
    fullName: string;
    avatar: string | null;
  };
  learningState?: EnrollmentLearningState;
}
