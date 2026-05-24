export type LectureProgressAction = 'timeupdate' | 'pause' | 'seeked' | 'ended';

export interface LectureProgressItem {
  id: string;
  enrollmentId: string;
  lectureId: string;
  isCompleted: boolean;
  watchedSeconds: number;
  duration: number;
  updatedAt: string;
}

export interface EnrollmentLectureProgressSnapshot {
  enrollmentId: string;
  progress: number;
  completedAt: string | null;
  totalLectures: number;
  completedLectures: number;
  lectureProgresses: LectureProgressItem[];
}

export interface SyncLectureProgressPayload {
  enrollmentId: string;
  lectureId: string;
  action: LectureProgressAction;
  watchedSeconds: number;
  duration?: number;
}
