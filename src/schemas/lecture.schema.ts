import { z } from 'zod/v4';

export const lectureSchema = z.object({
  name: z.string().min(1, 'Tên bài giảng là bắt buộc'),
  chapterId: z.string().min(1),
  description: z.string().optional(),
  isPublished: z.boolean().optional().default(true),
  file: z.any().refine((file) => file instanceof File, 'File video là bắt buộc'),
});

export const updateLectureSchema = z.object({
  name: z.string().min(1, 'Tên bài giảng là bắt buộc'),
  chapterId: z.string().min(1),
  description: z.string().optional(),
  isPublished: z.boolean().optional().default(true),
  file: z.union([z.instanceof(File), z.string()]).optional(),
});

export const patchLectureSchema = z.object({
  id: z.string(),
  order: z.number(),
});

export type LectureFormValues = z.infer<typeof lectureSchema>;
export type UpdateLectureFormValues = z.infer<typeof updateLectureSchema>;
export type PatchLectureFormValues = z.infer<typeof patchLectureSchema>;
