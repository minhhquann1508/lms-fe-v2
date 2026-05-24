import type { Chapter } from './chapter.type';
import type { Course } from './course.type';

export type QuizType = 'multiple_choice' | 'coding';

export interface Quiz {
  id: string;
  title: string;
  description: string;
  type: QuizType;
  duration: number | null;
  passingScore: number | null;
  isPublished: boolean;
  slug: string;
  courseId: string | null;
  course: Course | null;
  chapterId: string | null;
  chapter: Chapter | null;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string;
}

export interface Question {
  id: string;
  quizId: string;
  content: string;
  type: QuizType;
  order: number;
  points: number;
  codeTemplate: string | null;
  options: QuestionOption[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string;
}

export interface QuestionOption {
  id: string;
  questionId: string;
  content: string;
  isCorrect: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ImportError {
  row: number;
  message: string;
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: ImportError[];
}

export type QuizAttemptStatus = 'in_progress' | 'completed';

export interface QuizAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean | null;
  pointsEarned: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  status: QuizAttemptStatus;
  score: number | null;
  totalPoints: number;
  scorePercentage: number | null;
  startedAt: string;
  completedAt: string | null;
  answers: QuizAnswer[];
  createdAt: string;
  updatedAt: string;
}
