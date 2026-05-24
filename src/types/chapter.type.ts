import type { Lecture } from './lecture.type';

export interface Chapter {
  id: string;
  name: string;
  description: string;
  order: number;
  isPublished: boolean;
  slug: string;
  courseId: string;
  lectures: Lecture[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string;
}
