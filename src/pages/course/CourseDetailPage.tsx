import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Result, Typography, message } from 'antd';
import {
  BookOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { CourseCard, EmptyState, ErrorState, LoadingSkeleton } from '@/components';
import { queryKeys } from '@/config/query-keys';
import { courseService, enrollmentService } from '@/services';
import { useAuthStore } from '@/store/auth.store';
import { usePageTitle } from '@/hooks';
import { isApiError } from '@/utils/api-error';

const { Title } = Typography;

function formatMinutes(duration = 0) {
  return `${Math.round(duration / 60)} phút`;
}

const UserPlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const {
    data: course,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.courses.detail(courseId!),
    queryFn: () => courseService.getById(courseId!),
    enabled: !!courseId,
  });

  const enrollmentQuery = useQuery({
    queryKey: queryKeys.enrollments.myCourse(courseId!),
    queryFn: () => enrollmentService.getMineByCourse(courseId!),
    enabled: !!courseId && !!user,
  });

  usePageTitle(course?.name ?? 'Chi tiết khoá học');

  const enrollMutation = useMutation({
    mutationFn: () =>
      enrollmentService.create({
        courseId: courseId!,
        fullName: user?.fullName,
      }),
    onSuccess: () => {
      message.success('Yêu cầu ghi danh đã được gửi. Vui lòng chờ giảng viên duyệt.');
      void queryClient.invalidateQueries({
        queryKey: queryKeys.enrollments.myCourse(courseId!),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.enrollments.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },
    onError: (error) => {
      if (isApiError(error)) {
        if (error.code === 'ENROLLMENT_PENDING_APPROVAL') {
          message.info('Bạn đã gửi yêu cầu ghi danh trước đó và đang chờ duyệt.');
          void queryClient.invalidateQueries({
            queryKey: queryKeys.enrollments.myCourse(courseId!),
          });
          return;
        }
        if (error.code === 'ENROLLMENT_ALREADY_EXISTS') {
          message.info('Bạn đã được duyệt vào khoá học này rồi.');
          void queryClient.invalidateQueries({
            queryKey: queryKeys.enrollments.myCourse(courseId!),
          });
          return;
        }
      }
      message.error('Không thể gửi yêu cầu ghi danh lúc này');
    },
  });

  const courseCategoryId = course?.category?.id ?? course?.categoryId;

  const relatedQuery = useQuery({
    queryKey: queryKeys.courses.list({
      categoryId: courseCategoryId ?? undefined,
      limit: 5,
    }),
    queryFn: () =>
      courseService.getAll({
        categoryId: courseCategoryId ?? undefined,
        page: 1,
        limit: 5,
        isPublished: true,
        sortBy: courseCategoryId ? undefined : 'createdAt',
        sortOrder: courseCategoryId ? undefined : 'DESC',
      }),
    enabled: !!course,
  });

  if (isLoading) return <LoadingSkeleton variant="page-content" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!course) return <Result status="404" title="Không tìm thấy khoá học" />;

  const chapters = course.chapters || [];
  const totalLectures = chapters.reduce((sum, ch) => sum + (ch.lectures?.length || 0), 0);
  const enrollment = enrollmentQuery.data;
  const canEnterLearning = enrollment?.status === 'active';
  const isPendingApproval = enrollment?.status === 'pending';

  return (
    <div>
      {/* ── Hero ── */}
      <section className="lms-course-hero">
        <div className="lms-shell">
          <div className="lms-course-hero__inner">
            <div>
              <span className="lms-course-hero__eyebrow">Course Overview</span>
              <h1 className="lms-course-hero__title">{course.name}</h1>
              <p className="lms-course-hero__desc">
                {course.description ||
                  'Khoá học đang được cập nhật mô tả. Bạn vẫn có thể gửi yêu cầu ghi danh để được duyệt vào học.'}
              </p>
              <div className="lms-course-hero__tags">
                <span className="lms-course-hero__tag">
                  <ClockCircleOutlined className="lms-course-hero__tag-icon" />
                  {formatMinutes(course.duration || 0)}
                </span>
                <span className="lms-course-hero__tag">
                  <BookOutlined className="lms-course-hero__tag-icon" />
                  {chapters.length} chương
                </span>
                <span className="lms-course-hero__tag">
                  <PlayCircleOutlined className="lms-course-hero__tag-icon" />
                  {totalLectures} bài giảng
                </span>
              </div>
              <div className="lms-course-hero__instructor">
                <div className="lms-course-hero__inst-avatar">
                  {course.author?.avatar ? (
                    <img alt={course.author.fullName} src={course.author.avatar} />
                  ) : (
                    <UserOutlined />
                  )}
                </div>
                <div>
                  <div className="lms-course-hero__inst-name">
                    {course.author?.fullName || 'Đang cập nhật'}
                  </div>
                  <div className="lms-course-hero__inst-label">Giảng viên</div>
                </div>
              </div>
            </div>

            <div className="lms-course-hero__card">
              {course.thumbnail ? (
                <img
                  alt={course.name}
                  className="lms-course-hero__card-img"
                  src={course.thumbnail}
                />
              ) : (
                <div
                  className="lms-course-hero__card-img"
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--color-primary)',
                    fontSize: '40px',
                  }}
                >
                  <BookOutlined />
                </div>
              )}
              <div className="lms-course-hero__card-body">
                <span className="lms-course-hero__price-label">Học phí</span>
                <span
                  className={`lms-course-hero__price${course.price > 0 ? '' : ' lms-course-hero__price--free'}`}
                >
                  {course.price > 0 ? `${course.price.toLocaleString()}đ` : 'Miễn phí'}
                </span>
                <p className="lms-course-hero__card-note">
                  Gửi yêu cầu ghi danh. Sau khi được duyệt, hệ thống sẽ mở quyền vào trang học.
                </p>

                {canEnterLearning ? (
                  <button
                    className="lms-course-hero__btn"
                    id="enroll-button"
                    onClick={() => navigate(`/learning/${enrollment!.id}`)}
                  >
                    Vào học ngay
                  </button>
                ) : (
                  <button
                    className="lms-course-hero__btn"
                    disabled={isPendingApproval || enrollMutation.isPending}
                    id="enroll-button"
                    onClick={() => {
                      if (!user) {
                        navigate('/auth');
                        return;
                      }
                      enrollMutation.mutate();
                    }}
                  >
                    <UserPlusIcon />
                    {!user
                      ? 'Đăng nhập để ghi danh'
                      : isPendingApproval
                        ? 'Đã đăng ký - đang chờ duyệt'
                        : enrollment?.status === 'rejected'
                          ? 'Gửi lại yêu cầu'
                          : enrollMutation.isPending
                            ? 'Đang gửi yêu cầu...'
                            : 'Gửi yêu cầu ghi danh'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Chapters ── */}
      <section className="lms-course-chapters">
        <div className="lms-shell">
          <div className="lms-course-chapter-card">
            <div className="lms-course-chapter-card__header">📖 Nội dung khoá học</div>
            {chapters.length === 0 ? (
              <EmptyState icon={<BookOutlined />} title="Chưa có nội dung" />
            ) : (
              chapters.map((chapter, index) => (
                <div className="lms-course-chapter" key={chapter.id}>
                  <button
                    className="lms-course-chapter__trigger"
                    onClick={(e) => {
                      const el = e.currentTarget.parentElement!;
                      el.classList.toggle('lms-course-chapter--open');
                    }}
                  >
                    <div className="lms-course-chapter__left">
                      <span className="lms-course-chapter__num">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="lms-course-chapter__title">{chapter.name}</span>
                    </div>
                    <span className="lms-course-chapter__count">
                      {chapter.lectures?.length || 0} bài
                    </span>
                    <span className="lms-course-chapter__caret">▼</span>
                  </button>
                  <div className="lms-course-chapter__lectures">
                    {chapter.lectures?.map((lecture) => (
                      <div className="lms-course-lecture" key={lecture.id}>
                        <span className="lms-course-lecture__icon">
                          <PlayCircleOutlined />
                        </span>
                        <span className="lms-course-lecture__name">{lecture.name}</span>
                        {lecture.duration > 0 ? (
                          <span className="lms-course-lecture__dur">
                            {formatMinutes(lecture.duration)}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── Related Courses ── */}
      {relatedQuery.data?.items ? (
        <section className="lms-course-related">
          <div className="lms-shell">
            <Title level={3} className="lms-course-related__heading">
              Khoá học liên quan
            </Title>
            <div className="lms-course-related__grid">
              {relatedQuery.data.items
                .filter((c) => c.id !== course.id)
                .slice(0, 4)
                .map((relatedCourse) => (
                  <CourseCard
                    key={relatedCourse.id}
                    course={relatedCourse}
                    href={`/courses/${relatedCourse.id}`}
                  />
                ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
