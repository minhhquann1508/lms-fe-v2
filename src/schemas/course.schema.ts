import { z } from 'zod/v4';

export const courseSchema = z.object({
  name: z.string().min(1, 'Tên khoá học là bắt buộc'),
  description: z.string().min(1, 'Mô tả là bắt buộc'),
  thumbnail: z.string().optional(),
  price: z.number().min(0, 'Giá phải >= 0'),
  isPublic: z.boolean().optional(),
});

export type CourseFormValues = z.infer<typeof courseSchema>;
