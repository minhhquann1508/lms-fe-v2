import { describe, expect, it } from 'vitest';
import { resolveInitialLectureId, shouldSyncLectureTimeUpdate } from '../LearningPage';
import type { LectureProgressItem } from '@/types';

const makeProgress = (
  lectureId: string,
  overrides: Partial<LectureProgressItem>,
): LectureProgressItem => ({
  duration: 100,
  enrollmentId: 'enrollment-1',
  id: `progress-${lectureId}`,
  isCompleted: false,
  lectureId,
  updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  watchedSeconds: 0,
  ...overrides,
});

describe('resolveInitialLectureId', () => {
  const lectures = [
    { id: 'lecture-1', order: 1 },
    { id: 'lecture-2', order: 2 },
    { id: 'lecture-3', order: 3 },
  ] as unknown as Parameters<typeof resolveInitialLectureId>[0];

  it('prioritizes active lecture when it still belongs to the course', () => {
    const result = resolveInitialLectureId(lectures, 'lecture-3', new Map());

    expect(result).toBe('lecture-3');
  });

  it('falls back to the first in-progress lecture', () => {
    const progressMap = new Map([
      ['lecture-1', makeProgress('lecture-1', { isCompleted: true })],
      ['lecture-2', makeProgress('lecture-2', { watchedSeconds: 40 })],
    ]);

    const result = resolveInitialLectureId(lectures, 'missing', progressMap);

    expect(result).toBe('lecture-2');
  });

  it('falls back to the first incomplete lecture', () => {
    const progressMap = new Map([
      ['lecture-1', makeProgress('lecture-1', { isCompleted: true })],
      ['lecture-2', makeProgress('lecture-2', { isCompleted: true })],
    ]);

    const result = resolveInitialLectureId(lectures, null, progressMap);

    expect(result).toBe('lecture-3');
  });
});

describe('shouldSyncLectureTimeUpdate', () => {
  it('does not throttle the completion threshold update', () => {
    expect(shouldSyncLectureTimeUpdate(95, 100, 90)).toBe(true);
    expect(shouldSyncLectureTimeUpdate(99, 100, 90)).toBe(true);
  });

  it('keeps regular time updates throttled before completion threshold', () => {
    expect(shouldSyncLectureTimeUpdate(94, 100, 90)).toBe(false);
    expect(shouldSyncLectureTimeUpdate(100, 100, 90)).toBe(true);
  });
});
