import type { Category } from './category.type';
import type { Chapter } from './chapter.type';

export interface Author {
  id: string;
  fullName: string;
  avatar: string;
}

export interface Course {
  id: string;
  name: string;
  thumbnail: string;
  description: string;
  duration: number;
  isPublished: boolean;
  slug: string;
  authorId: string;
  author: Author;
  createdAt: string;
  updatedAt: string;
  deletedAt: string;
  chapters: Chapter[];
  price: number;
  categoryId: string | null;
  category: Category | null;
  lectureCount?: number;
}
