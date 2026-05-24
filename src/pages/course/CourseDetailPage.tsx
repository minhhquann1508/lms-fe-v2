import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
  Button,
  Card,
  Collapse,
  Divider,
  Result,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { CourseCard, EmptyState, ErrorState, LoadingSkeleton } from '@/components';
import { queryKeys } from '@/config/query-keys';
import { courseService, enrollmentService } from '@/services';
import { useAuthStore } from '@/store/auth.store';
import { usePageTitle } from '@/hooks';
import { isApiError } from '@/utils/api-error';

const { Title, Text, Paragraph } = Typography;

function formatMinutes(duration = 0) {
  return `${Math.round(duration / 60)} phút`;
}

function getEnrollmentTone(status?: string | null) {
  switch (status) {
    case 'active':
      return {
        label: 'Đã được duyệt',
        className: 'lms-course-detail__status-badge lms-course-detail__status-badge--active',
      };
    case 'pending':
      return {
        label: 'Đang chờ duyệt',
        className: 'lms-course-detail__status-badge lms-course-detail__status-badge--pending',
      };
    case 'rejected':
      return {
        label: 'Chưa được duyệt',
        className: 'lms-course-detail__status-badge lms-course-detail__status-badge--rejected',
      };
    default:
      return {
        label: 'Chưa ghi danh',
        className: 'lms-course-detail__status-badge',
      };
  }
}

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
  const totalLectures = chapters.reduce((sum, chapter) => sum + (chapter.lectures?.length || 0), 0);
  const enrollment = enrollmentQuery.data;
  const enrollmentStatus = getEnrollmentTone(enrollment?.status);
  const canEnterLearning = enrollment?.status === 'active';
  const isPendingApproval = enrollment?.status === 'pending';

  return (
    <div className="lms-course-detail">
      <section className="lms-course-detail__hero">
        <div className="lms-course-detail__hero-main">
          <div className="lms-course-detail__hero-copy">
            <span className="lms-course-detail__eyebrow">Course Overview</span>
            <Title className="lms-course-detail__hero-title" level={1}>
              {course.name}
            </Title>
            <Paragraph className="lms-course-detail__hero-description">
              {course.description ||
                'Khoá học đang được cập nhật mô tả. Bạn vẫn có thể gửi yêu cầu ghi danh để được duyệt vào học.'}
            </Paragraph>

            <div className="lms-course-detail__hero-tags">
              <Tag className="lms-course-detail__hero-tag">
                <ClockCircleOutlined />
                {formatMinutes(course.duration || 0)}
              </Tag>
              <Tag className="lms-course-detail__hero-tag">
                <BookOutlined />
                {chapters.length} chương
              </Tag>
              <Tag className="lms-course-detail__hero-tag">
                <PlayCircleOutlined />
                {totalLectures} bài giảng
              </Tag>
            </div>
          </div>

          <div className="lms-course-detail__hero-side">
            {course.thumbnail ? (
              <img
                alt={course.name}
                className="lms-course-detail__hero-image"
                src={course.thumbnail}
              />
            ) : null}
          </div>
        </div>
      </section>

      <div className="lms-course-detail__layout">
        <div className="lms-course-detail__main">
          <Card className="lms-course-detail__content-card" title="Nội dung khoá học">
            {chapters.length === 0 ? (
              <EmptyState icon={<BookOutlined />} title="Chưa có nội dung" />
            ) : (
              <Collapse
                className="lms-course-detail__collapse"
                expandIconPosition="end"
                items={chapters.map((chapter, index) => ({
                  key: chapter.id,
                  label: (
                    <div className="lms-course-detail__chapter-label">
                      <div className="lms-course-detail__chapter-number">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <Text className="lms-course-detail__chapter-title" strong>
                        {chapter.name}
                      </Text>
                      <Tag className="lms-course-detail__chapter-tag">
                        {chapter.lectures?.length || 0} bài
                      </Tag>
                    </div>
                  ),
                  children: (
                    <div className="lms-course-detail__lecture-list">
                      {chapter.lectures?.map((lecture) => (
                        <div className="lms-course-detail__lecture" key={lecture.id}>
                          <span className="lms-course-detail__lecture-icon">
                            <PlayCircleOutlined />
                          </span>
                          <Text className="lms-course-detail__lecture-title">{lecture.name}</Text>
                          {lecture.duration > 0 ? (
                            <Text className="lms-course-detail__lecture-duration" type="secondary">
                              {formatMinutes(lecture.duration)}
                            </Text>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ),
                }))}
              />
            )}
          </Card>
        </div>

        <Card className="lms-course-detail__aside">
          <div className="lms-course-detail__aside-instructor">
            <Avatar
              icon={!course.author?.avatar ? <UserOutlined /> : undefined}
              size={44}
              src={course.author?.avatar}
            />
            <div>
              <Text className="lms-course-detail__aside-instructor-label">Giảng viên phụ trách</Text>
              <div className="lms-course-detail__aside-instructor-name">
                {course.author?.fullName || 'Đang cập nhật'}
              </div>
            </div>
          </div>

          <Divider />
          <div className="lms-course-detail__price-block">
            <Text className="lms-course-detail__price-label">Hình thức tham gia</Text>
            <Title className="lms-course-detail__price-value" level={3}>
              {course.price > 0 ? `${course.price.toLocaleString()}đ` : 'Miễn phí'}
            </Title>
            <Paragraph className="lms-course-detail__price-note">
              Bạn cần gửi yêu cầu ghi danh. Sau khi được duyệt, hệ thống sẽ mở quyền vào trang học.
            </Paragraph>
          </div>

          <Divider />

          <div className="lms-course-detail__benefits">
            <div className="lms-course-detail__benefit-item">
              <CheckCircleOutlined />
              <span>{chapters.length} chương học có cấu trúc rõ ràng</span>
            </div>
            <div className="lms-course-detail__benefit-item">
              <TeamOutlined />
              <span>Giảng viên/đội ngũ quản trị duyệt thủ công</span>
            </div>
            <div className="lms-course-detail__benefit-item">
              <ClockCircleOutlined />
              <span>Thông báo kết quả qua noti và email phản hồi</span>
            </div>
          </div>

          {enrollment ? (
            <>
              <Divider />
              <div className="lms-course-detail__request-state">
                <Text className="lms-course-detail__request-state-label">Trạng thái ghi danh</Text>
                <Tag className={enrollmentStatus.className}>{enrollmentStatus.label}</Tag>
                {enrollment.reviewNote ? (
                  <Paragraph className="lms-course-detail__request-note">
                    {enrollment.reviewNote}
                  </Paragraph>
                ) : null}
              </div>
            </>
          ) : null}

          <Divider />

          {canEnterLearning ? (
            <Button
              block
              id="enroll-button"
              onClick={() => navigate(`/learning/${enrollment.id}`)}
              size="large"
              type="primary"
            >
              Vào học ngay
            </Button>
          ) : (
            <Tooltip
              title={
                !user
                  ? 'Đăng nhập để gửi yêu cầu ghi danh'
                  : isPendingApproval
                    ? 'Yêu cầu của bạn đang chờ giảng viên duyệt'
                    : undefined
              }
            >
              <Button
                block
                disabled={isPendingApproval}
                id="enroll-button"
                loading={enrollMutation.isPending}
                onClick={() => {
                  if (!user) {
                    navigate('/auth');
                    return;
                  }

                  enrollMutation.mutate();
                }}
                size="large"
                type="primary"
              >
                {!user
                  ? 'Đăng nhập để ghi danh'
                  : isPendingApproval
                      ? 'Đã đăng ký - đang chờ duyệt'
                    : enrollment?.status === 'rejected'
                      ? 'Gửi lại yêu cầu'
                      : enrollMutation.isPending
                        ? 'Đang gửi yêu cầu...'
                        : 'Gửi yêu cầu ghi danh'}
              </Button>
            </Tooltip>
          )}
        </Card>
      </div>

      {relatedQuery.data?.items ? (
        <section className="lms-course-detail__related">
          <Title level={3} className="lms-course-detail__related-heading">Khoá học liên quan</Title>
          <div className="lms-course-detail__related-grid">
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
        </section>
      ) : null}
    </div>
  );
}
