import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Spin } from 'antd';
import { PageTransition } from '@/components';

/* Layouts */
import PublicLayout from '@/layouts/PublicLayout';
import AuthLayout from '@/layouts/AuthLayout';
import AdminLayout from '@/layouts/AdminLayout';

/* Guards */
import AuthGuard from '@/components/guards/AuthGuard';
import AdminGuard from '@/components/guards/AdminGuard';

/* Lazy pages */
const AuthPage = lazy(() => import('@/pages/auth/AuthPage'));
const GoogleCallbackPage = lazy(() => import('@/pages/auth/GoogleCallbackPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const HomePage = lazy(() => import('@/pages/home/HomePage'));
const CourseDetailPage = lazy(() => import('@/pages/course/CourseDetailPage'));
const QuizPage = lazy(() => import('@/pages/quiz/QuizPage'));
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));
const LearningPage = lazy(() => import('@/pages/learning/LearningPage'));
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'));
const AdminCoursesPage = lazy(() => import('@/pages/admin/AdminCoursesPage'));
const CourseCreatePage = lazy(() => import('@/pages/admin/CourseCreatePage'));
const AdminCourseDetailPage = lazy(() => import('@/pages/admin/AdminCourseDetailPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminEnrollmentsPage = lazy(() => import('@/pages/admin/AdminEnrollmentsPage'));
const AdminQuizzesPage = lazy(() => import('@/pages/admin/AdminQuizzesPage'));
const AdminQuizDetailPage = lazy(() => import('@/pages/admin/AdminQuizDetailPage'));
const QuizCreatePage = lazy(() => import('@/pages/admin/QuizCreatePage'));
const AdminQuizEditPage = lazy(() => import('@/pages/admin/AdminQuizEditPage'));
const NotFoundPage = lazy(() => import('@/pages/not-found/NotFoundPage'));

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
    element: (
      <LazyWrap>
        <GoogleCallbackPage />
      </LazyWrap>
    ),
  },
  {
    path: '/:locale/auth/google/callback',
    element: (
      <LazyWrap>
        <GoogleCallbackPage />
      </LazyWrap>
    ),
  },
  /* Reset password (standalone) */
  {
    path: '/auth/reset-password',
    element: (
      <LazyWrap>
        <ResetPasswordPage />
      </LazyWrap>
    ),
  },

  /* ── Public routes ── */
  {
    element: <PublicLayout />,
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
        ],
      },
    ],
  },
  {
    path: '*',
    element: (
      <LazyWrap>
        <NotFoundPage />
      </LazyWrap>
    ),
  },
]);
