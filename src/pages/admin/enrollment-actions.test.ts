import { describe, expect, it } from 'vitest';
import { shouldShowEnrollmentReviewActions } from './enrollment-actions';

describe('shouldShowEnrollmentReviewActions', () => {
  it('shows approve/reject actions only for pending enrollments', () => {
    expect(shouldShowEnrollmentReviewActions('pending')).toBe(true);
    expect(shouldShowEnrollmentReviewActions('active')).toBe(false);
    expect(shouldShowEnrollmentReviewActions('rejected')).toBe(false);
    expect(shouldShowEnrollmentReviewActions('inactive')).toBe(false);
    expect(shouldShowEnrollmentReviewActions('cancelled')).toBe(false);
  });
});
