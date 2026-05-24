export interface EnrollmentLearningNote {
  id: string;
  lectureId: string;
  content: string;
  timestampSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentLearningState {
  version: 1;
  activeLectureId: string | null;
  notes: EnrollmentLearningNote[];
  legacyText?: string;
}
