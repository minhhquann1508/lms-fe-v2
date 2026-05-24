import { useMemo, useState, useCallback, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Avatar,
  Button,
  Card,
  Collapse,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Result,
  Space,
  Spin,
  Switch,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
  InboxOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  TeamOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { EmptyState, ErrorState, PageHeader } from '@/components';
import { useBreakpoint, usePageTitle } from '@/hooks';
import { queryKeys } from '@/config/query-keys';
import {
  chapterService,
  courseService,
  enrollmentService,
  lectureService,
} from '@/services';
import type { Chapter, Course, Enrollment, Lecture } from '@/types';

const { Paragraph, Text, Title } = Typography;

interface ChapterFormValues {
  name: string;
  description?: string;
  isPublished?: boolean;
}

interface LectureFormValues {
  name: string;
  description?: string;
  isPublished?: boolean;
}

function formatMinutes(duration = 0) {
  return `${Math.round(duration / 60)} phút`;
}

function formatDate(value?: string) {
  if (!value) {
    return '--';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function renderFieldLabel(icon: ReactNode, label: string, hint?: string) {
  return (
    <span className="lms-admin-course-detail__field-label">
      <span className="lms-admin-course-detail__field-label-icon">{icon}</span>
      <span>{label}</span>
      {hint ? (
        <Tooltip title={hint}>
          <InfoCircleOutlined className="lms-admin-course-detail__field-label-hint" />
        </Tooltip>
      ) : null}
    </span>
  );
}

function renderModalTitle(icon: ReactNode, title: string, subtitle: string) {
  return (
    <div className="lms-admin-course-detail__modal-title">
      <span className="lms-admin-course-detail__modal-title-icon">{icon}</span>
      <div>
        <div className="lms-admin-course-detail__modal-title-text">{title}</div>
        <div className="lms-admin-course-detail__modal-title-subtitle">{subtitle}</div>
      </div>
    </div>
  );
}

function renderLectureAsset(lecture: Lecture) {
  if (lecture.videoUrl) {
    return (
      <Tag className="lms-badge-success" icon={<CheckCircleOutlined />}>
        Sẵn sàng
      </Tag>
    );
  }

  if (lecture.attributes?.videoGuid) {
    return (
      <Tag className="lms-badge-info" icon={<VideoCameraOutlined />}>
        Đang xử lý
      </Tag>
    );
  }

  return (
    <Tag className="lms-badge-neutral" icon={<InboxOutlined />}>
      Chưa có video
    </Tag>
  );
}

function buildCourseStats(course: Course, chapters: Chapter[]) {
  const lectureCount = chapters.reduce(
    (total, chapter) => total + (chapter.lectures?.length ?? 0),
    0,
  );
  const readyVideos = chapters.reduce(
    (total, chapter) =>
      total + (chapter.lectures?.filter((lecture) => Boolean(lecture.videoUrl)).length ?? 0),
    0,
  );
  const publishedItems = chapters.reduce(
    (total, chapter) =>
      total + (chapter.lectures?.filter((lecture) => lecture.isPublished).length ?? 0),
    0,
  );

  return [
    {
      icon: <FolderOpenOutlined />,
      label: 'Chương',
      value: `${chapters.length}`,
      tone: 'primary',
    },
    {
      icon: <PlayCircleOutlined />,
      label: 'Bài giảng',
      value: `${lectureCount}`,
      tone: 'info',
    },
    {
      icon: <VideoCameraOutlined />,
      label: 'Video sẵn sàng',
      value: `${readyVideos}`,
      tone: 'success',
    },
    {
      icon: <ClockCircleOutlined />,
      label: 'Thời lượng',
      value: formatMinutes(course.duration ?? 0),
      tone: 'warning',
    },
    {
      icon: <CheckCircleOutlined />,
      label: 'Đang công khai',
      value: `${publishedItems}`,
      tone: 'success',
    },
  ];
}

export default function AdminCourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const queryClient = useQueryClient();
  const breakpoint = useBreakpoint();
  const [chapterModal, setChapterModal] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [lectureModal, setLectureModal] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [dragLectureId, setDragLectureId] = useState<string | null>(null);
  const [chapterForm] = Form.useForm<ChapterFormValues>();
  const [lectureForm] = Form.useForm<LectureFormValues>();

  const courseQuery = useQuery({
    queryKey: queryKeys.courses.adminDetail(courseId!),
    queryFn: () => courseService.getAdminById(courseId!),
    enabled: !!courseId,
  });
  const course = courseQuery.data;
  const enrollmentsQuery = useQuery({
    queryKey: queryKeys.enrollments.course(courseId!, {
      page: 1,
      limit: 50,
    }),
    queryFn: () =>
      enrollmentService.getByCourse(courseId!, {
        page: 1,
        limit: 50,
      }),
    enabled: !!courseId,
  });

  usePageTitle(course?.name ? `${course.name} | Admin` : 'Chi tiết khoá học');

  const refreshCourse = () => {
    if (!courseId) {
      return;
    }

    void queryClient.invalidateQueries({
      queryKey: queryKeys.courses.adminDetail(courseId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.courses.detail(courseId),
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
  };

  const chapters = useMemo(
    () =>
      (course?.chapters ?? [])
        .slice()
        .sort((first, second) => first.order - second.order)
        .map((chapter) => ({
          ...chapter,
          lectures: (chapter.lectures ?? [])
            .slice()
            .sort((first, second) => first.order - second.order),
        })),
    [course?.chapters],
  );

  const courseStats = course ? buildCourseStats(course, chapters) : [];
  const lectureCount = chapters.reduce(
    (total, chapter) => total + (chapter.lectures?.length ?? 0),
    0,
  );
  const readyVideos = chapters.reduce(
    (total, chapter) =>
      total + (chapter.lectures?.filter((lecture) => Boolean(lecture.videoUrl)).length ?? 0),
    0,
  );
  const courseEnrollments = enrollmentsQuery.data?.items ?? [];
  const pendingApprovalCount = courseEnrollments.filter(
    (enrollment) => enrollment.status === 'pending',
  ).length;

  const createChapter = useMutation({
    mutationFn: (values: ChapterFormValues & { courseId: string }) => chapterService.create(values),
    onSuccess: () => {
      message.success('Tạo chương thành công');
      setChapterModal(false);
      chapterForm.resetFields();
      refreshCourse();
    },
    onError: () => message.error('Tạo chương thất bại'),
  });

  const updateChapter = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ChapterFormValues }) =>
      chapterService.update(id, data),
    onSuccess: () => {
      message.success('Cập nhật chương thành công');
      setChapterModal(false);
      setEditingChapter(null);
      chapterForm.resetFields();
      refreshCourse();
    },
    onError: () => message.error('Cập nhật chương thất bại'),
  });

  const deleteChapter = useMutation({
    mutationFn: (id: string) => chapterService.delete(id),
    onSuccess: () => {
      message.success('Xoá chương thành công');
      refreshCourse();
    },
    onError: () => message.error('Xoá chương thất bại'),
  });

  const createLecture = useMutation({
    mutationFn: async (values: LectureFormValues) => {
      if (!activeChapterId || !videoFile) {
        throw new Error('LECTURE_FILE_REQUIRED');
      }

      const currentLectures = chapters.find((ch) => ch.id === activeChapterId)?.lectures ?? [];
      const nextOrder = currentLectures.length > 0
        ? Math.max(...currentLectures.map((l) => l.order)) + 1
        : 1;

      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('chapterId', activeChapterId);
      formData.append('description', values.description ?? '');
      formData.append('isPublished', String(Boolean(values.isPublished)));
      formData.append('order', String(nextOrder));
      formData.append('file', videoFile);

      await lectureService.create(formData);
    },
    onSuccess: () => {
      message.success('Tạo bài giảng thành công');
      setLectureModal(false);
      setVideoFile(null);
      lectureForm.resetFields();
      refreshCourse();
    },
    onError: (error) => {
      if ((error as Error).message === 'LECTURE_FILE_REQUIRED') {
        message.error('Vui lòng chọn video cho bài giảng mới');
        return;
      }

      message.error('Tạo bài giảng thất bại');
    },
  });

  const updateLecture = useMutation({
    mutationFn: async (values: LectureFormValues) => {
      if (!editingLecture) {
        throw new Error('LECTURE_NOT_SELECTED');
      }

      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('chapterId', editingLecture.chapterId);
      formData.append('description', values.description ?? '');
      formData.append('isPublished', String(Boolean(values.isPublished)));
      formData.append('order', String(editingLecture.order));

      if (videoFile) {
        formData.append('file', videoFile);
      }

      await lectureService.update(editingLecture.id, formData);
    },
    onSuccess: () => {
      message.success('Cập nhật bài giảng thành công');
      setLectureModal(false);
      setEditingLecture(null);
      setVideoFile(null);
      lectureForm.resetFields();
      refreshCourse();
    },
    onError: () => message.error('Cập nhật bài giảng thất bại'),
  });

  const toggleLecturePublished = useMutation({
    mutationFn: ({ lecture, isPublished }: { lecture: Lecture; isPublished: boolean }) => {
      const formData = new FormData();
      formData.append('name', lecture.name);
      formData.append('chapterId', lecture.chapterId);
      formData.append('description', lecture.description ?? '');
      formData.append('isPublished', String(Boolean(isPublished)));
      formData.append('order', String(lecture.order));
      return lectureService.update(lecture.id, formData);
    },
    onSuccess: () => {
      message.success('Đã cập nhật trạng thái bài giảng');
      refreshCourse();
    },
    onError: () => message.error('Không thể cập nhật trạng thái bài giảng'),
  });

  const deleteLecture = useMutation({
    mutationFn: (id: string) => lectureService.delete(id),
    onSuccess: () => {
      message.success('Xoá bài giảng thành công');
      refreshCourse();
    },
    onError: () => message.error('Xoá bài giảng thất bại'),
  });

  const reviewEnrollment = useMutation({
    mutationFn: ({
      enrollmentId,
      status,
    }: {
      enrollmentId: string;
      status: 'active' | 'rejected';
    }) => enrollmentService.review(enrollmentId, { status }),
    onSuccess: (_, variables) => {
      message.success(
        variables.status === 'active'
          ? 'Đã duyệt ghi danh và gửi phản hồi'
          : 'Đã từ chối ghi danh và gửi phản hồi',
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      void enrollmentsQuery.refetch();
    },
    onError: () => message.error('Không thể cập nhật trạng thái ghi danh'),
  });

  const handleDragStart = (lectureId: string) => {
    setDragLectureId(lectureId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = useCallback(
    (targetLecture: Lecture, chapterLectures: Lecture[]) => {
      if (!dragLectureId || dragLectureId === targetLecture.id) {
        setDragLectureId(null);
        return;
      }

      const sorted = [...chapterLectures].sort((a, b) => a.order - b.order);
      const dragIndex = sorted.findIndex((l) => l.id === dragLectureId);
      const targetIndex = sorted.findIndex((l) => l.id === targetLecture.id);

      if (dragIndex === -1 || targetIndex === -1) {
        setDragLectureId(null);
        return;
      }

      const reordered = [...sorted];
      const [movedItem] = reordered.splice(dragIndex, 1);
      reordered.splice(targetIndex, 0, movedItem);

      const reorderItems = reordered.map((lecture, index) => ({
        id: lecture.id,
        order: (index + 1) * 10,
      }));
      lectureService.reorder(reorderItems).then(() => {
        refreshCourse();
      }).catch(() => {
        message.error('Không thể sắp xếp bài giảng');
      });

      setDragLectureId(null);
    },
    [dragLectureId],
  );

  const openCreateChapter = () => {
    setEditingChapter(null);
    chapterForm.resetFields();
    chapterForm.setFieldsValue({ isPublished: true });
    setChapterModal(true);
  };

  const openEditChapter = (chapter: Chapter) => {
    setEditingChapter(chapter);
    chapterForm.setFieldsValue({
      description: chapter.description,
      isPublished: chapter.isPublished,
      name: chapter.name,
    });
    setChapterModal(true);
  };

  const openCreateLecture = (chapterId: string) => {
    setActiveChapterId(chapterId);
    setEditingLecture(null);
    setVideoFile(null);
    lectureForm.resetFields();
    lectureForm.setFieldsValue({ isPublished: true });
    setLectureModal(true);
  };

  const openEditLecture = (lecture: Lecture) => {
    setActiveChapterId(lecture.chapterId);
    setEditingLecture(lecture);
    setVideoFile(null);
    lectureForm.setFieldsValue({
      description: lecture.description,
      isPublished: lecture.isPublished,
      name: lecture.name,
    });
    setLectureModal(true);
  };

  const handleChapterSubmit = async () => {
    const values = await chapterForm.validateFields();

    if (editingChapter) {
      updateChapter.mutate({ id: editingChapter.id, data: values });
      return;
    }

    createChapter.mutate({ ...values, courseId: courseId! });
  };

  const handleLectureSubmit = async () => {
    const values = await lectureForm.validateFields();

    if (editingLecture) {
      updateLecture.mutate(values);
      return;
    }

    createLecture.mutate(values);
  };

  if (courseQuery.isLoading) {
    return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  }

  if (courseQuery.isError) {
    return <ErrorState onRetry={() => courseQuery.refetch()} />;
  }

  if (!course) {
    return <Result status="404" title="Không tìm thấy khoá học" />;
  }

  return (
    <div className="lms-admin-course-detail">
      <PageHeader
        actions={[
          {
            key: 'back',
            node: (
              <Tooltip title="Quay về danh sách khoá học">
                <Link to="/admin/courses">
                  <Button icon={<ArrowLeftOutlined />}>
                    <span className="lms-btn-text-responsive">Danh sách</span>
                  </Button>
                </Link>
              </Tooltip>
            ),
          },
          {
            key: 'create-chapter',
            node: (
              <Tooltip title="Tạo chương mới">
                <Button icon={<PlusOutlined />} onClick={openCreateChapter} type="primary">
                  <span className="lms-btn-text-responsive">Chương mới</span>
                </Button>
              </Tooltip>
            ),
          },
        ]}
        subtitle="Quản lý nội dung khoá học: chương, bài giảng và duyệt ghi danh."
        title={course.name}
      />

      <section className="lms-admin-course-detail__hero">
        <div className="lms-admin-course-detail__media">
          {course.thumbnail ? (
            <img
              alt={course.name}
              className="lms-admin-course-detail__thumbnail"
              src={course.thumbnail}
            />
          ) : (
            <div className="lms-admin-course-detail__thumbnail-placeholder">
              <BookOutlined />
            </div>
          )}
        </div>

        <div className="lms-admin-course-detail__hero-main">
          <div className="lms-admin-course-detail__hero-top">
            <div className="lms-admin-course-detail__hero-copy">
              <Text className="lms-admin-course-detail__eyebrow">Quản lý khoá học</Text>
              <Title className="lms-admin-course-detail__hero-title" level={3}>
                {course.name}
              </Title>
              <Paragraph
                className="lms-admin-course-detail__hero-description"
                ellipsis={
                  course.description
                    ? {
                        rows: 3,
                        tooltip: course.description,
                      }
                    : false
                }
              >
                {course.description ||
                  'Khoá học này chưa có mô tả. Nên thêm mô tả ngắn để admin và học viên đọc nhanh hơn.'}
              </Paragraph>
            </div>

            <div className="lms-admin-course-detail__hero-pills">
              <Tag className={course.isPublished ? 'lms-badge-success' : 'lms-badge-draft'}>
                {course.isPublished ? 'Đã xuất bản' : 'Bản nháp'}
              </Tag>
              <Tag className="lms-badge-info">
                {course.price > 0 ? `${course.price.toLocaleString()}đ` : 'Miễn phí'}
              </Tag>
              <Tag className="lms-badge-neutral">Cập nhật {formatDate(course.updatedAt)}</Tag>
            </div>
          </div>

          <div className="lms-admin-course-detail__hero-meta">
            <div className="lms-admin-course-detail__meta-card">
              <div className="lms-admin-course-detail__meta-card-icon">
                <TeamOutlined />
              </div>
              <div className="lms-admin-course-detail__meta-card-copy">
                <Text className="lms-admin-course-detail__meta-card-label">Phụ trách</Text>
                <div className="lms-admin-course-detail__meta-card-value">
                  <Avatar
                    icon={!course.author?.avatar ? <TeamOutlined /> : undefined}
                    size={28}
                    src={course.author?.avatar}
                  />
                  <span>{course.author?.fullName || 'Chưa gán'}</span>
                </div>
              </div>
            </div>

            <div className="lms-admin-course-detail__meta-card">
              <div className="lms-admin-course-detail__meta-card-icon">
                <VideoCameraOutlined />
              </div>
              <div className="lms-admin-course-detail__meta-card-copy">
                <Text className="lms-admin-course-detail__meta-card-label">Tình trạng video</Text>
                <div className="lms-admin-course-detail__meta-card-value">
                  <span>{readyVideos}</span>
                  <Text type="secondary">/ {lectureCount} bài đã sẵn sàng</Text>
                </div>
              </div>
            </div>
          </div>

          <div className="lms-admin-course-detail__stats-grid">
            {courseStats.map((stat) => (
              <div
                key={stat.label}
                className={`lms-admin-course-detail__stat-card lms-admin-course-detail__stat-card--${stat.tone}`}
              >
                <span className="lms-admin-course-detail__stat-icon">{stat.icon}</span>
                <div>
                  <div className="lms-admin-course-detail__stat-value">{stat.value}</div>
                  <div className="lms-admin-course-detail__stat-label">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Card className="lms-admin-course-detail__workspace" bordered={false}>
        <div className="lms-admin-course-detail__workspace-head">
          <div>
            <Title className="lms-admin-course-detail__workspace-title" level={4}>
              Nội dung khoá học
            </Title>
            <Text className="lms-admin-course-detail__workspace-subtitle">
              Kéo thả bài giảng để sắp xếp thứ tự. Bấm vào chương để mở rộng.
            </Text>
          </div>

          <div className="lms-admin-course-detail__workspace-actions">
            <Tag className="lms-badge-neutral">{chapters.length} chương</Tag>
            <Tag className="lms-badge-neutral">{lectureCount} bài</Tag>
            <Button icon={<PlusOutlined />} onClick={openCreateChapter} type="primary">
              <span className="lms-btn-text-responsive">Thêm chương</span>
            </Button>
          </div>
        </div>

        {chapters.length ? (
          <Collapse
            bordered={false}
            className="lms-curriculum-collapse"
            expandIconPosition="end"
            items={chapters.map((chapter) => {
              const chapterLectureCount = chapter.lectures?.length ?? 0;
              const chapterReadyVideos =
                chapter.lectures?.filter((lecture) => Boolean(lecture.videoUrl)).length ?? 0;
              const chapterPublishedLectures =
                chapter.lectures?.filter((lecture) => lecture.isPublished).length ?? 0;

              return {
                key: chapter.id,
                label: (
                  <div className="lms-admin-course-detail__chapter-head">
                    <span className="lms-admin-course-detail__chapter-icon">
                      <FolderOpenOutlined />
                    </span>
                    <div className="lms-admin-course-detail__chapter-copy">
                      <Text className="lms-admin-course-detail__chapter-title" strong>
                        {chapter.name}
                      </Text>
                      <div className="lms-admin-course-detail__chapter-meta">
                        <Tag className="lms-badge-neutral">{chapterLectureCount} bài</Tag>
                        {breakpoint !== 'mobile' ? (
                          <Tag className="lms-badge-info">{chapterReadyVideos} video sẵn sàng</Tag>
                        ) : null}
                        <Tag
                          className={chapter.isPublished ? 'lms-badge-success' : 'lms-badge-draft'}
                        >
                          {chapter.isPublished ? 'Đã xuất bản' : 'Bản nháp'}
                        </Tag>
                      </div>
                    </div>
                  </div>
                ),
                extra: (
                  <div
                    className="lms-admin-course-detail__chapter-header-switch"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Tooltip title={chapter.isPublished ? 'Ẩn chương' : 'Xuất bản chương'}>
                      <Switch
                        checked={chapter.isPublished}
                        className="lms-custom-switch"
                        loading={updateChapter.isPending}
                        onChange={(checked) =>
                          updateChapter.mutate({
                            id: chapter.id,
                            data: {
                              description: chapter.description,
                              isPublished: checked,
                              name: chapter.name,
                            },
                          })
                        }
                      />
                    </Tooltip>
                  </div>
                ),
                children: (
                  <div className="lms-admin-course-detail__chapter-body">
                    <div className="lms-admin-course-detail__chapter-toolbar">
                      <div className="lms-admin-course-detail__chapter-summary">
                        <div className="lms-admin-course-detail__chapter-summary-item">
                          <PlayCircleOutlined />
                          <span>{chapterLectureCount} bài</span>
                        </div>
                        <div className="lms-admin-course-detail__chapter-summary-item">
                          <CheckCircleOutlined />
                          <span>{chapterPublishedLectures} công khai</span>
                        </div>
                        <div className="lms-admin-course-detail__chapter-summary-item">
                          <VideoCameraOutlined />
                          <span>{chapterReadyVideos} sẵn sàng</span>
                        </div>
                      </div>

                      <Space className="lms-admin-course-detail__chapter-actions" size={8} wrap>
                        <Tooltip title="Thêm bài giảng">
                          <Button
                            aria-label="Thêm bài giảng"
                            icon={<PlusOutlined />}
                            onClick={() => openCreateLecture(chapter.id)}
                            size="small"
                            type="primary"
                          >
                            {breakpoint === 'desktop' ? 'Thêm bài' : null}
                          </Button>
                        </Tooltip>
                        <Tooltip title="Sửa chương">
                          <Button
                            aria-label="Sửa chương"
                            icon={<EditOutlined />}
                            onClick={() => openEditChapter(chapter)}
                            size="small"
                          >
                            {breakpoint === 'desktop' ? 'Sửa' : null}
                          </Button>
                        </Tooltip>
                        <Popconfirm
                          description="Các bài giảng trong chương cũng sẽ bị xoá mềm."
                          onConfirm={() => deleteChapter.mutate(chapter.id)}
                          title="Xoá chương?"
                        >
                          <Tooltip title="Xoá chương">
                            <Button
                              aria-label="Xoá chương"
                              danger
                              icon={<DeleteOutlined />}
                              loading={deleteChapter.isPending}
                              size="small"
                            >
                              {breakpoint === 'desktop' ? 'Xoá' : null}
                            </Button>
                          </Tooltip>
                        </Popconfirm>
                      </Space>
                    </div>

                    {chapter.description ? (
                      <Paragraph
                        className="lms-admin-course-detail__chapter-description"
                        ellipsis={{ rows: 2, tooltip: chapter.description }}
                      >
                        {chapter.description}
                      </Paragraph>
                    ) : null}

                    {chapterLectureCount ? (
                      <div className="lms-admin-course-detail__lecture-list">
                        {chapter.lectures?.map((lecture) => (
                          <div
                            key={lecture.id}
                            className={`lms-admin-course-detail__lecture-row ${dragLectureId === lecture.id ? 'lms-admin-course-detail__lecture-row--dragging' : ''}`}
                            draggable
                            onDragStart={() => handleDragStart(lecture.id)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(lecture, chapter.lectures)}
                          >
                            <Tooltip title="Kéo để sắp xếp">
                              <span className="lms-drag-handle">
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                  <circle cx="5" cy="3" r="1.5" />
                                  <circle cx="11" cy="3" r="1.5" />
                                  <circle cx="5" cy="8" r="1.5" />
                                  <circle cx="11" cy="8" r="1.5" />
                                  <circle cx="5" cy="13" r="1.5" />
                                  <circle cx="11" cy="13" r="1.5" />
                                </svg>
                              </span>
                            </Tooltip>

                            <span className="lms-admin-course-detail__lecture-row-order">
                              {lecture.order}
                            </span>

                            <div className="lms-admin-course-detail__lecture-row-info">
                              <Text strong>{lecture.name}</Text>
                              <div className="lms-admin-course-detail__lecture-row-meta">
                                {lecture.isPublished ? (
                                  <Tag className="lms-badge-success" style={{ fontSize: 11 }}>Công khai</Tag>
                                ) : (
                                  <Tag className="lms-badge-draft" style={{ fontSize: 11 }}>Bản nháp</Tag>
                                )}
                                {renderLectureAsset(lecture)}
                                {lecture.duration > 0 ? (
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {formatMinutes(lecture.duration)}
                                  </Text>
                                ) : null}
                              </div>
                            </div>

                            <Switch
                              checked={lecture.isPublished}
                              className="lms-custom-switch"
                              loading={toggleLecturePublished.isPending}
                              onChange={(checked) =>
                                toggleLecturePublished.mutate({ isPublished: checked, lecture })
                              }
                              size="small"
                            />

                            <Space size={4}>
                              <Tooltip title={lecture.videoUrl ? 'Xem video' : 'Chưa có video'}>
                                <span>
                                  <Button
                                    aria-label="Xem video"
                                    disabled={!lecture.videoUrl}
                                    href={lecture.videoUrl || undefined}
                                    icon={<EyeOutlined />}
                                    size="small"
                                    target="_blank"
                                    type="text"
                                  />
                                </span>
                              </Tooltip>
                              <Tooltip title="Sửa">
                                <Button
                                  aria-label="Sửa bài giảng"
                                  icon={<EditOutlined />}
                                  onClick={() => openEditLecture(lecture)}
                                  size="small"
                                  type="text"
                                />
                              </Tooltip>
                              <Popconfirm onConfirm={() => deleteLecture.mutate(lecture.id)} title="Xoá bài giảng?">
                                <Tooltip title="Xoá">
                                  <Button
                                    aria-label="Xoá bài giảng"
                                    danger
                                    icon={<DeleteOutlined />}
                                    loading={deleteLecture.isPending}
                                    size="small"
                                    type="text"
                                  />
                                </Tooltip>
                              </Popconfirm>
                            </Space>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty
                        description="Chương này chưa có bài giảng."
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )}
                  </div>
                ),
              };
            })}
          />
        ) : (
          <EmptyState
            action={{ label: 'Thêm chương đầu tiên', onClick: openCreateChapter }}
            description="Tạo chương trước, sau đó thêm bài giảng và upload video."
            title="Khoá học chưa có nội dung"
          />
        )}
      </Card>

      <Card className="lms-admin-course-detail__workspace" bordered={false}>
        <div className="lms-admin-course-detail__workspace-head">
          <div>
            <Title className="lms-admin-course-detail__workspace-title" level={4}>
              Duyệt ghi danh
            </Title>
            <Text className="lms-admin-course-detail__workspace-subtitle">
              Học viên chỉ vào được trang học sau khi được duyệt.
            </Text>
          </div>

          <div className="lms-admin-course-detail__workspace-actions">
            <Tag className="lms-badge-neutral">{courseEnrollments.length} yêu cầu</Tag>
            <Tag className="lms-badge-info">{pendingApprovalCount} chờ duyệt</Tag>
          </div>
        </div>

        {enrollmentsQuery.isLoading ? <Spin size="large" /> : null}
        {enrollmentsQuery.isError ? (
          <ErrorState inline onRetry={() => enrollmentsQuery.refetch()} />
        ) : null}

        {!enrollmentsQuery.isLoading && !enrollmentsQuery.isError && !courseEnrollments.length ? (
          <EmptyState
            description="Khi học viên gửi yêu cầu ghi danh, danh sách sẽ xuất hiện tại đây."
            title="Chưa có yêu cầu ghi danh"
          />
        ) : null}

        {!enrollmentsQuery.isLoading && !enrollmentsQuery.isError && courseEnrollments.length ? (
          <div className="lms-admin-course-detail__approval-list">
            {courseEnrollments.map((enrollment: Enrollment) => (
              <article key={enrollment.id} className="lms-admin-course-detail__approval-card">
                <div className="lms-admin-course-detail__approval-head">
                  <div className="lms-admin-course-detail__approval-user">
                    <Avatar
                      icon={!enrollment.user?.avatar ? <UserOutlined /> : undefined}
                      src={enrollment.user?.avatar ?? undefined}
                    />
                    <div>
                      <div className="lms-admin-course-detail__approval-name">
                        {enrollment.user?.fullName || enrollment.fullName || 'Học viên'}
                      </div>
                      <Text type="secondary">
                        {enrollment.user?.email || enrollment.phone || 'Chưa có liên hệ'}
                      </Text>
                    </div>
                  </div>

                  <Tag
                    className={
                      enrollment.status === 'active'
                        ? 'lms-badge-success'
                        : enrollment.status === 'rejected'
                          ? 'lms-badge-draft'
                          : 'lms-badge-info'
                    }
                  >
                    {enrollment.status === 'active'
                      ? 'Đã duyệt'
                      : enrollment.status === 'rejected'
                        ? 'Từ chối'
                        : 'Chờ duyệt'}
                  </Tag>
                </div>

                <div className="lms-admin-course-detail__approval-meta">
                  <span>Gửi lúc {formatDate(enrollment.createdAt)}</span>
                  {enrollment.approvedAt ? (
                    <span>Duyệt lúc {formatDate(enrollment.approvedAt)}</span>
                  ) : null}
                </div>

                {enrollment.notes ? (
                  <Paragraph className="lms-admin-course-detail__approval-note">
                    {enrollment.notes}
                  </Paragraph>
                ) : null}

                {enrollment.reviewNote ? (
                  <Paragraph className="lms-admin-course-detail__approval-note lms-admin-course-detail__approval-note--muted">
                    Phản hồi trước đó: {enrollment.reviewNote}
                  </Paragraph>
                ) : null}

                <Space className="lms-admin-course-detail__approval-actions" size={8} wrap>
                  <Button
                    disabled={enrollment.status === 'active'}
                    loading={
                      reviewEnrollment.isPending &&
                      reviewEnrollment.variables?.enrollmentId === enrollment.id &&
                      reviewEnrollment.variables?.status === 'active'
                    }
                    onClick={() =>
                      reviewEnrollment.mutate({
                        enrollmentId: enrollment.id,
                        status: 'active',
                      })
                    }
                    type="primary"
                  >
                    Duyệt vào học
                  </Button>
                  <Button
                    danger
                    disabled={enrollment.status === 'rejected'}
                    loading={
                      reviewEnrollment.isPending &&
                      reviewEnrollment.variables?.enrollmentId === enrollment.id &&
                      reviewEnrollment.variables?.status === 'rejected'
                    }
                    onClick={() =>
                      reviewEnrollment.mutate({
                        enrollmentId: enrollment.id,
                        status: 'rejected',
                      })
                    }
                  >
                    Từ chối
                  </Button>
                </Space>
              </article>
            ))}
          </div>
        ) : null}
      </Card>

      <Modal
        className="lms-admin-course-detail__modal"
        confirmLoading={createChapter.isPending || updateChapter.isPending}
        okText={editingChapter ? 'Lưu chương' : 'Tạo chương'}
        onCancel={() => {
          setChapterModal(false);
          setEditingChapter(null);
        }}
        onOk={() => void handleChapterSubmit()}
        open={chapterModal}
        title={renderModalTitle(
          <FolderOpenOutlined />,
          editingChapter ? 'Cập nhật chương' : 'Tạo chương mới',
          'Tên ngắn, mô tả gọn và trạng thái rõ ràng.',
        )}
        width={520}
      >
        <Form className="lms-admin-course-detail__form" form={chapterForm} layout="vertical">
          <Form.Item
            label={renderFieldLabel(
              <FolderOpenOutlined />,
              'Tên chương',
              'Ngắn gọn, dễ quét khi xem danh sách',
            )}
            name="name"
            rules={[{ message: 'Bắt buộc', required: true }]}
          >
            <Input placeholder="Ví dụ: Khởi động dự án" size="large" />
          </Form.Item>

          <Form.Item
            label={renderFieldLabel(
              <FileTextOutlined />,
              'Mô tả',
              'Chỉ cần 1-2 ý chính cho admin và học viên',
            )}
            name="description"
          >
            <Input.TextArea placeholder="Tóm tắt nội dung chương..." rows={3} />
          </Form.Item>

          <Form.Item
            className="lms-admin-course-detail__switch-item"
            label={renderFieldLabel(<CheckCircleOutlined />, 'Xuất bản')}
            name="isPublished"
            style={{ margin: 0 }}
            valuePropName="checked"
          >
            <Switch
              checkedChildren="Công khai"
              className="lms-custom-switch"
              unCheckedChildren="Bản nháp"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        className="lms-admin-course-detail__modal"
        confirmLoading={createLecture.isPending || updateLecture.isPending}
        okText={editingLecture ? 'Lưu bài giảng' : 'Tạo bài giảng'}
        onCancel={() => {
          setLectureModal(false);
          setEditingLecture(null);
          setVideoFile(null);
        }}
        onOk={() => void handleLectureSubmit()}
        open={lectureModal}
        title={renderModalTitle(
          <PlayCircleOutlined />,
          editingLecture ? 'Cập nhật bài giảng' : 'Tạo bài giảng mới',
          'Thứ tự bài giảng sẽ tự động sắp xếp. Kéo thả sau khi tạo để thay đổi.',
        )}
        width={640}
      >
        <Form className="lms-admin-course-detail__form" form={lectureForm} layout="vertical">
          <Form.Item
            label={renderFieldLabel(<PlayCircleOutlined />, 'Tên bài giảng')}
            name="name"
            rules={[{ message: 'Bắt buộc', required: true }]}
          >
            <Input placeholder="Ví dụ: Tổng quan hệ thống" size="large" />
          </Form.Item>

          <Form.Item
            label={renderFieldLabel(<FileTextOutlined />, 'Mô tả ngắn')}
            name="description"
          >
            <Input.TextArea placeholder="Tóm tắt nhanh nội dung bài giảng..." rows={3} />
          </Form.Item>

          <div className="lms-admin-course-detail__form-row" style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <Form.Item
                className="lms-admin-course-detail__switch-item"
                label={renderFieldLabel(<CheckCircleOutlined />, 'Trạng thái')}
                name="isPublished"
                style={{ margin: 0 }}
                valuePropName="checked"
              >
                <Switch
                  checkedChildren="Công khai"
                  className="lms-custom-switch"
                  unCheckedChildren="Bản nháp"
                />
              </Form.Item>
            </div>
          </div>

          <Form.Item
            extra={
              editingLecture?.videoUrl
                ? 'Video hiện tại vẫn được giữ nguyên nếu không chọn file mới.'
                : 'Chấp nhận video bài giảng, ưu tiên MP4 để xử lý ổn định hơn.'
            }
            label={renderFieldLabel(
              <VideoCameraOutlined />,
              'Video bài giảng',
              'Upload ngay trong form để giữ luồng thao tác liên tục',
            )}
          >
            <Upload.Dragger
              accept="video/*"
              beforeUpload={(file) => {
                setVideoFile(file as File);
                return false;
              }}
              className="lms-admin-course-detail__upload"
              maxCount={1}
              onRemove={() => setVideoFile(null)}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="lms-admin-course-detail__upload-title">
                {videoFile
                  ? videoFile.name
                  : editingLecture?.videoUrl
                    ? 'Thả file để thay video'
                    : 'Kéo thả hoặc bấm để chọn video'}
              </p>
              <p className="lms-admin-course-detail__upload-hint">
                {editingLecture?.videoUrl
                  ? 'Chỉ upload khi cần thay mới.'
                  : 'Một file cho mỗi bài giảng.'}
              </p>
            </Upload.Dragger>
          </Form.Item>

        </Form>
      </Modal>
    </div>
  );
}
