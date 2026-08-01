import type { EnrollmentStatus } from '@/types';

export function shouldShowEnrollmentReviewActions(status: EnrollmentStatus): boolean {
  return status === 'pending';
}
