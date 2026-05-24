import type { Quiz } from './quiz.type';

export interface Attributes {
  status: number;
  libraryId: string;
  videoGuid: string;
}

export interface Lecture {
  id: string;
  name: string;
  description: string;
  order: number;
  isPublished: boolean;
  slug: string;
  videoUrl: string | null;
  chapterId: string;
  duration: number;
  quizId?: string | null;
  quiz?: Quiz | null;
  attributes?: Attributes | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string;
}
