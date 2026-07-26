import { createBrowserRouter, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import type { ComponentType } from 'react';
import { Button, Result, Spin } from 'antd';
import { PageTransition } from '@/components';

/* Layouts */
import PublicLayout from '@/layouts/PublicLayout';
import AuthLayout from '@/layouts/AuthLayout';
import AdminLayout from '@/layouts/AdminLayout';

/* Guards */
import AuthGuard from '@/components/guards/AuthGuard';
import AdminGuard from '@/components/guards/AdminGuard';

const CHUNK_RELOAD_KEY = 'lms:chunk-reload-url';

function isChunkLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return [
    'Failed to fetch dynamically imported module',
    'Importing a module script failed',
    'error loading dynamically imported module',
    'ChunkLoadError',
    'Loading chunk',
  ].some((pattern) => message.includes(pattern));
}

function lazyWithChunkRetry<T extends { default: ComponentType<unknown> }>(
  importer: () => Promise<T>,
) {
  return lazy(async () => {
    try {
      const module = await importer();
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      return module;
    } catch (error) {
      if (isChunkLoadError(error) && sessionStorage.getItem(CHUNK_RELOAD_KEY) !== location.href) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, location.href);
        location.reload();

        return new Promise<T>(() => undefined);
      }

      throw error;
    }
  });
}

function RouteErrorFallback() {
  const error = useRouteError();
  const isChunkError = isChunkLoadError(error);
  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : isChunkError
      ? 'Không thể tải phiên bản mới'
      : 'Đã có lỗi xảy ra';
  const subTitle = isChunkError
    ? 'Ứng dụng vừa được cập nhật. Tải lại trang để lấy bộ asset mới nhất.'
    : 'Vui lòng tải lại trang hoặc quay lại sau ít phút.';

  return (
    <Result
      extra={
        <Button onClick={() => location.reload()} type="primary">
          Tải lại trang
        </Button>
      }
      status={isChunkError ? 'warning' : 'error'}
      subTitle={subTitle}
      title={title}
    />
  );
}

/* Lazy pages */
const AuthPage = lazyWithChunkRetry(() => import('@/pages/auth/AuthPage'));
const GoogleCallbackPage = lazyWithChunkRetry(() => import('@/pages/auth/GoogleCallbackPage'));
const ResetPasswordPage = lazyWithChunkRetry(() => import('@/pages/auth/ResetPasswordPage'));
const HomePage = lazyWithChunkRetry(() => import('@/pages/home/HomePage'));
const CourseDetailPage = lazyWithChunkRetry(() => import('@/pages/course/CourseDetailPage'));
const QuizPage = lazyWithChunkRetry(() => import('@/pages/quiz/QuizPage'));
const ProfilePage = lazyWithChunkRetry(() => import('@/pages/profile/ProfilePage'));
const LearningPage = lazyWithChunkRetry(() => import('@/pages/learning/LearningPage'));
const DashboardPage = lazyWithChunkRetry(() => import('@/pages/admin/DashboardPage'));
const AdminCoursesPage = lazyWithChunkRetry(() => import('@/pages/admin/AdminCoursesPage'));
const CourseCreatePage = lazyWithChunkRetry(() => import('@/pages/admin/CourseCreatePage'));
const AdminCourseDetailPage = lazyWithChunkRetry(
  () => import('@/pages/admin/AdminCourseDetailPage'),
);
const AdminUsersPage = lazyWithChunkRetry(() => import('@/pages/admin/AdminUsersPage'));
const AdminEnrollmentsPage = lazyWithChunkRetry(() => import('@/pages/admin/AdminEnrollmentsPage'));
const AdminQuizzesPage = lazyWithChunkRetry(() => import('@/pages/admin/AdminQuizzesPage'));
const AdminQuizDetailPage = lazyWithChunkRetry(() => import('@/pages/admin/AdminQuizDetailPage'));
const QuizCreatePage = lazyWithChunkRetry(() => import('@/pages/admin/QuizCreatePage'));
const AdminQuizEditPage = lazyWithChunkRetry(() => import('@/pages/admin/AdminQuizEditPage'));
const SiteSettingsPage = lazyWithChunkRetry(() => import('@/pages/admin/SiteSettingsPage'));
const NotFoundPage = lazyWithChunkRetry(() => import('@/pages/not-found/NotFoundPage'));

function LazyWrap({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 300,
          }}
        >
          <Spin size="large" />
        </div>
      }
    >
      <PageTransition>{children}</PageTransition>
    </Suspense>
  );
}

export const router = createBrowserRouter([
  /* ── Auth routes ── */
  {
    element: <AuthLayout />,
    errorElement: <RouteErrorFallback />,
    children: [
      {
        path: '/auth',
        element: (
          <LazyWrap>
            <AuthPage />
          </LazyWrap>
        ),
      },
    ],
  },
  /* Google callback (no layout) */
  {
    path: '/auth/google/callback',
    errorElement: <RouteErrorFallback />,
    element: (
      <LazyWrap>
        <GoogleCallbackPage />
      </LazyWrap>
    ),
  },
  {
    path: '/:locale/auth/google/callback',
    errorElement: <RouteErrorFallback />,
    element: (
      <LazyWrap>
        <GoogleCallbackPage />
      </LazyWrap>
    ),
  },
  /* Reset password (standalone) */
  {
    path: '/auth/reset-password',
    errorElement: <RouteErrorFallback />,
    element: (
      <LazyWrap>
        <ResetPasswordPage />
      </LazyWrap>
    ),
  },

  /* ── Public routes ── */
  {
    element: <PublicLayout />,
    errorElement: <RouteErrorFallback />,
    children: [
      {
        path: '/',
        element: (
          <LazyWrap>
            <HomePage />
          </LazyWrap>
        ),
      },
      {
        path: '/courses/:courseId',
        element: (
          <LazyWrap>
            <CourseDetailPage />
          </LazyWrap>
        ),
      },
      {
        path: '/quiz/:quizId',
        element: (
          <LazyWrap>
            <QuizPage />
          </LazyWrap>
        ),
      },
      /* Protected user routes */
      {
        element: <AuthGuard />,
        children: [
          {
            path: '/profile',
            element: (
              <LazyWrap>
                <ProfilePage />
              </LazyWrap>
            ),
          },
        ],
      },
    ],
  },

  /* ── Learning route (standalone layout) ── */
  {
    element: <AuthGuard />,
    errorElement: <RouteErrorFallback />,
    children: [
      {
        path: '/learning/:enrollmentId',
        element: (
          <LazyWrap>
            <LearningPage />
          </LazyWrap>
        ),
      },
    ],
  },

  /* ── Admin routes ── */
  {
    element: <AdminGuard />,
    errorElement: <RouteErrorFallback />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            path: '/admin/dashboard',
            element: (
              <LazyWrap>
                <DashboardPage />
              </LazyWrap>
            ),
          },
          {
            path: '/admin/courses',
            element: (
              <LazyWrap>
                <AdminCoursesPage />
              </LazyWrap>
            ),
          },
          {
            path: '/admin/courses/create',
            element: (
              <LazyWrap>
                <CourseCreatePage />
              </LazyWrap>
            ),
          },
          {
            path: '/admin/courses/:courseId',
            element: (
              <LazyWrap>
                <AdminCourseDetailPage />
              </LazyWrap>
            ),
          },
          {
            path: '/admin/enrollments',
            element: (
              <LazyWrap>
                <AdminEnrollmentsPage />
              </LazyWrap>
            ),
          },
          {
            path: '/admin/users',
            element: (
              <LazyWrap>
                <AdminUsersPage />
              </LazyWrap>
            ),
          },
          {
            path: '/admin/quizzes',
            element: (
              <LazyWrap>
                <AdminQuizzesPage />
              </LazyWrap>
            ),
          },
          {
            path: '/admin/quizzes/create',
            element: (
              <LazyWrap>
                <QuizCreatePage />
              </LazyWrap>
            ),
          },
          {
            path: '/admin/quizzes/:quizId',
            element: (
              <LazyWrap>
                <AdminQuizDetailPage />
              </LazyWrap>
            ),
          },
          {
            path: '/admin/quizzes/:quizId/edit',
            element: (
              <LazyWrap>
                <AdminQuizEditPage />
              </LazyWrap>
            ),
          },
          {
            path: '/admin/site-settings',
            element: (
              <LazyWrap>
                <SiteSettingsPage />
              </LazyWrap>
            ),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    errorElement: <RouteErrorFallback />,
    element: (
      <LazyWrap>
        <NotFoundPage />
      </LazyWrap>
    ),
  },
]);
