import { z } from 'zod/v4';

export const chapterSchema = z.object({
  name: z.string().min(1, 'Tên chương là bắt buộc'),
  description: z.string().optional(),
  isPublished: z.boolean().optional().default(true),
});

export type ChapterFormValues = z.infer<typeof chapterSchema>;
