export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  courses: {
    all: ['courses'] as const,
    list: (params: Record<string, unknown>) => ['courses', 'list', params] as const,
    detail: (id: string) => ['courses', 'detail', id] as const,
    adminDetail: (id: string) => ['courses', 'adminDetail', id] as const,
  },
  chapters: {
    all: ['chapters'] as const,
    list: (params: Record<string, unknown>) => ['chapters', 'list', params] as const,
    lectures: (chapterId: string) => ['chapters', chapterId, 'lectures'] as const,
  },
  lectures: {
    all: ['lectures'] as const,
    detail: (id: string) => ['lectures', 'detail', id] as const,
  },
  enrollments: {
    all: ['enrollments'] as const,
    detail: (id: string) => ['enrollments', 'detail', id] as const,
    my: (params: Record<string, unknown>) => ['enrollments', 'my', params] as const,
    myCourse: (courseId: string) => ['enrollments', 'my-course', courseId] as const,
    course: (courseId: string, params: Record<string, unknown>) =>
      ['enrollments', 'course', courseId, params] as const,
    allAdmin: (params: Record<string, unknown>) => ['enrollments', 'all', params] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    my: (params: Record<string, unknown>) => ['notifications', 'my', params] as const,
  },
  progress: {
    enrollment: (enrollmentId: string) => ['progress', 'enrollment', enrollmentId] as const,
  },
  dashboard: {
    overview: ['dashboard', 'overview'] as const,
    courseHighlights: (limit?: number) => ['dashboard', 'courseHighlights', limit] as const,
  },
  users: {
    all: ['users'] as const,
    list: (params: Record<string, unknown>) => ['users', 'list', params] as const,
  },
  categories: {
    all: ['categories'] as const,
  },
  quizzes: {
    all: ['quizzes'] as const,
    list: (params: Record<string, unknown>) => ['quizzes', 'list', params] as const,
    detail: (id: string) => ['quizzes', 'detail', id] as const,
  },
  siteSettings: {
    all: ['siteSettings'] as const,
  },
} as const;
