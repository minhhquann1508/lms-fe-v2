import { z } from 'zod/v4';

export const quizSchema = z.object({
  title: z.string().min(1, 'Tiêu đề bài kiểm tra là bắt buộc'),
  description: z.string().optional(),
  type: z.string().default('multiple_choice'),
  duration: z.coerce.number().int().positive().optional(),
  passingScore: z.coerce.number().int().min(0).optional(),
  isPublished: z.boolean().optional().default(true),
  courseId: z.string().uuid().optional().nullable(),
  chapterId: z.string().uuid().optional().nullable(),
});

export const questionSchema = z.object({
  content: z.string().min(1, 'Nội dung câu hỏi là bắt buộc'),
  type: z.string().default('multiple_choice'),
  points: z.coerce.number().int().positive().default(1),
  order: z.coerce.number().int().positive().optional(),
});

export const questionOptionSchema = z.object({
  content: z.string().min(1, 'Nội dung lựa chọn là bắt buộc'),
  isCorrect: z.boolean().optional().default(false),
  order: z.coerce.number().int().positive().optional(),
});

export type QuizFormValues = z.infer<typeof quizSchema>;
export type QuestionFormValues = z.infer<typeof questionSchema>;
export type QuestionOptionFormValues = z.infer<typeof questionOptionSchema>;
