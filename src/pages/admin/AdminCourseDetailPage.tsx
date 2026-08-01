import { useMemo, useState, useCallback, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Result,
  Segmented,
  Spin,
  Tooltip,
  Upload,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  BookOutlined,
  CaretDownOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  HolderOutlined,
  InboxOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  UploadOutlined,
  UserAddOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { EmptyState, ErrorState, ItemPickerModal, AdminButton } from '@/components';
import { useBreakpoint, usePageTitle } from '@/hooks';
import { queryKeys } from '@/config/query-keys';
import { chapterService, courseService, enrollmentService, lectureService, userService } from '@/services';
import { shouldShowEnrollmentReviewActions } from './enrollment-actions';
import type { Chapter, Enrollment, Lecture } from '@/types';
import type { PickerItem } from '@/components/admin/ItemPickerModal';

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

type VideoSourceType = 'upload' | 'url';

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
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          display: 'inline-grid',
          placeItems: 'center',
          width: 26,
          height: 26,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-surface)',
          color: 'var(--color-ink)',
          fontSize: 13,
        }}
      >
        {icon}
      </span>
      <span>{label}</span>
      {hint ? (
        <Tooltip title={hint}>
          <InfoCircleOutlined style={{ color: 'rgb(148 163 184)', cursor: 'help', fontSize: 13 }} />
        </Tooltip>
      ) : null}
    </span>
  );
}

function renderModalTitle(icon: ReactNode, title: string, subtitle: string) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <span
        style={{
          display: 'inline-grid',
          placeItems: 'center',
          width: 44,
          height: 44,
          borderRadius: 14,
          background: 'var(--color-surface)',
          color: 'var(--color-ink)',
          fontSize: 18,
        }}
      >
        {icon}
      </span>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.35, color: 'rgb(15 23 42)' }}>
          {title}
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 13,
            lineHeight: 1.6,
            color: 'rgb(100 116 139)',
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}

function renderLectureBadge(lecture: Lecture) {
  if (lecture.videoUrl) {
    return (
      <span className="lms-admin-badge lms-admin-badge--success">
        <CheckCircleOutlined />
        Sẵn sàng
      </span>
    );
  }

  if (lecture.attributes?.videoGuid) {
    return (
      <span className="lms-admin-badge lms-admin-badge--info">
        <VideoCameraOutlined />
        Đang xử lý
      </span>
    );
  }

  return (
    <span className="lms-admin-badge lms-admin-badge--neutral">
      <InboxOutlined />
      Chưa có video
    </span>
  );
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
  const [openChapterIds, setOpenChapterIds] = useState<Set<string>>(new Set());
  const [videoSourceType, setVideoSourceType] = useState<VideoSourceType>('url');
  const [videoUrlInput, setVideoUrlInput] = useState('');
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
      if (!activeChapterId) {
        throw new Error('LECTURE_NOT_SELECTED');
      }

      const currentLectures = chapters.find((ch) => ch.id === activeChapterId)?.lectures ?? [];
      const nextOrder =
        currentLectures.length > 0 ? Math.max(...currentLectures.map((l) => l.order)) + 1 : 1;

      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('chapterId', activeChapterId);
      formData.append('description', values.description ?? '');
      formData.append('isPublished', String(Boolean(values.isPublished)));
      formData.append('order', String(nextOrder));

      if (videoSourceType === 'upload' && videoFile) {
        formData.append('file', videoFile);
      } else if (videoSourceType === 'url' && videoUrlInput) {
        formData.append('videoUrl', videoUrlInput);
      }

      await lectureService.create(formData);
    },
    onSuccess: () => {
      message.success('Tạo bài giảng thành công');
      setLectureModal(false);
      setVideoFile(null);
      setVideoUrlInput('');
      setVideoSourceType('upload');
      lectureForm.resetFields();
      refreshCourse();
    },
    onError: () => {
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

      if (videoSourceType === 'upload' && videoFile) {
        formData.append('file', videoFile);
      } else if (videoSourceType === 'url' && videoUrlInput) {
        formData.append('videoUrl', videoUrlInput);
      }

      await lectureService.update(editingLecture.id, formData);
    },
    onSuccess: () => {
      message.success('Cập nhật bài giảng thành công');
      setLectureModal(false);
      setEditingLecture(null);
      setVideoFile(null);
      setVideoUrlInput('');
      setVideoSourceType('upload');
      lectureForm.resetFields();
      refreshCourse();
    },
    onError: () => message.error('Cập nhật bài giảng thất bại'),
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

  const [pickerOpen, setPickerOpen] = useState(false);

  const addUsersMutation = useMutation({
    mutationFn: (userIds: string[]) => {
      if (!courseId) throw new Error('COURSE_NOT_SELECTED');
      return enrollmentService.addDirect(courseId, userIds);
    },
    onSuccess: (res) => {
      message.success(`Đã thêm ${res.created} học viên`);
      if (res.skipped > 0) {
        message.info(`${res.skipped} học viên đã có trong khoá học`);
      }
      setPickerOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });
      void enrollmentsQuery.refetch();
    },
    onError: () => message.error('Không thể thêm học viên'),
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
      lectureService
        .reorder(reorderItems)
        .then(() => {
          refreshCourse();
        })
        .catch(() => {
          message.error('Không thể sắp xếp bài giảng');
        });

      setDragLectureId(null);
    },
    [dragLectureId],
  );

  const toggleChapter = (chapterId: string) => {
    setOpenChapterIds((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

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
    setVideoUrlInput('');
    setVideoSourceType('upload');
    lectureForm.resetFields();
    lectureForm.setFieldsValue({ isPublished: true });
    setLectureModal(true);
  };

  const openEditLecture = (lecture: Lecture) => {
    setActiveChapterId(lecture.chapterId);
    setEditingLecture(lecture);
    setVideoFile(null);
    setVideoUrlInput(lecture.videoUrl ?? '');
    setVideoSourceType('upload');
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
    <div style={{ display: 'grid', gap: 20, minWidth: 0 }}>
      {/* ── Page Header ── */}
      <div className="lms-admin-page-head">
        <div className="lms-admin-page-head__left">
          <Link to="/admin/courses">
            <button className="lms-admin-btn lms-admin-btn--ghost">
              <ArrowLeftOutlined />
              {breakpoint === 'desktop' ? 'Danh sách' : null}
            </button>
          </Link>
          <h1 className="lms-admin-page-head__title">{course.name}</h1>
        </div>
        {/* <button className="lms-admin-btn lms-admin-btn--primary" onClick={openCreateChapter}>
          <PlusOutlined />
          {breakpoint === 'desktop' ? 'Chương mới' : 'Chương'}
        </button> */}
      </div>

      {/* ── Hero ── */}
      <section className="lms-admin-hero">
        <div className="lms-admin-hero__thumb">
          {course.thumbnail ? <img src={course.thumbnail} alt={course.name} /> : <BookOutlined />}
        </div>

        <div className="lms-admin-hero__body">
          <span className="lms-admin-hero__eyebrow">Quản lý khoá học</span>
          <h2 className="lms-admin-hero__title">{course.name}</h2>
          {course.description ? <p className="lms-admin-hero__desc">{course.description}</p> : null}

          <div className="lms-admin-hero__bar">
            <span
              className={`lms-admin-badge ${course.isPublished ? 'lms-admin-badge--success' : 'lms-admin-badge--draft'}`}
            >
              {course.isPublished ? 'Đã xuất bản' : 'Bản nháp'}
            </span>
            <span className="lms-admin-badge lms-admin-badge--info">
              {course.price > 0 ? `${course.price.toLocaleString()}đ` : 'Miễn phí'}
            </span>
            <span className="lms-admin-badge lms-admin-badge--neutral">
              Cập nhật {formatDate(course.updatedAt)}
            </span>
          </div>
        </div>
      </section>

      {/* ── Chapters ── */}
      <div className="lms-admin-block">
        <div className="lms-admin-block__head">
          <div>
            <div className="lms-admin-block__title">Nội dung khoá học</div>
            <div className="lms-admin-block__subtitle">
              Kéo thả bài giảng để sắp xếp thứ tự. Bấm vào chương để mở rộng.
            </div>
          </div>
          <div className="lms-admin-block__actions">
            <button
              className="lms-admin-btn lms-admin-btn--primary lms-admin-btn--sm"
              onClick={openCreateChapter}
            >
              <PlusOutlined />
              Thêm chương
            </button>
          </div>
        </div>

        {chapters.length ? (
          chapters.map((chapter) => {
            const chapterLectureCount = chapter.lectures?.length ?? 0;
            const chapterReadyVideos =
              chapter.lectures?.filter((lecture) => Boolean(lecture.videoUrl)).length ?? 0;
            const chapterPublished =
              chapter.lectures?.filter((lecture) => lecture.isPublished).length ?? 0;
            const isOpen = openChapterIds.has(chapter.id);

            return (
              <div
                key={chapter.id}
                className={`lms-admin-chapter${isOpen ? ' lms-admin-chapter--open' : ''}`}
              >
                <div className="lms-admin-chapter__head" onClick={() => toggleChapter(chapter.id)}>
                  <div className="lms-admin-chapter__icon">
                    <FolderOpenOutlined />
                  </div>
                  <div className="lms-admin-chapter__info">
                    <div className="lms-admin-chapter__name">{chapter.name}</div>
                    <div className="lms-admin-chapter__meta">
                      <span className="lms-admin-badge lms-admin-badge--neutral">
                        {chapterLectureCount} bài
                      </span>
                      {breakpoint !== 'mobile' ? (
                        <span className="lms-admin-badge lms-admin-badge--info">
                          {chapterReadyVideos} video sẵn sàng
                        </span>
                      ) : null}
                      <span
                        className={`lms-admin-badge ${chapter.isPublished ? 'lms-admin-badge--success' : 'lms-admin-badge--draft'}`}
                      >
                        {chapter.isPublished ? 'Đã xuất bản' : 'Bản nháp'}
                      </span>
                    </div>
                  </div>

                  <button
                    className={`lms-admin-toggle ${chapter.isPublished ? 'lms-admin-toggle--on' : ''}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      updateChapter.mutate({
                        id: chapter.id,
                        data: {
                          description: chapter.description,
                          isPublished: !chapter.isPublished,
                          name: chapter.name,
                        },
                      });
                    }}
                    type="button"
                  />

                  <CaretDownOutlined className="lms-admin-chapter__caret" />
                </div>

                <div className="lms-admin-chapter__body">
                  <div className="lms-admin-chapter__toolbar">
                    <div className="lms-admin-chapter__toolbar-stats">
                      <span>
                        <PlayCircleOutlined /> {chapterLectureCount} bài
                      </span>
                      <span>
                        <CheckCircleOutlined /> {chapterPublished} công khai
                      </span>
                      <span>
                        <VideoCameraOutlined /> {chapterReadyVideos} sẵn sàng
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="lms-admin-btn lms-admin-btn--primary lms-admin-btn--sm"
                        onClick={() => openCreateLecture(chapter.id)}
                      >
                        <PlusOutlined />
                        {breakpoint === 'desktop' ? 'Thêm bài' : null}
                      </button>
                      <button
                        className="lms-admin-btn lms-admin-btn--outline lms-admin-btn--sm"
                        onClick={() => openEditChapter(chapter)}
                      >
                        <EditOutlined />
                        {breakpoint === 'desktop' ? 'Sửa' : null}
                      </button>
                      <Popconfirm
                        description="Các bài giảng trong chương cũng sẽ bị xoá mềm."
                        onConfirm={() => deleteChapter.mutate(chapter.id)}
                        title="Xoá chương?"
                      >
                        <button className="lms-admin-btn lms-admin-btn--danger-outline lms-admin-btn--sm">
                          <DeleteOutlined />
                          {breakpoint === 'desktop' ? 'Xoá' : null}
                        </button>
                      </Popconfirm>
                    </div>
                  </div>

                  {chapter.description ? (
                    <p
                      style={{
                        color: 'rgb(71 85 105)',
                        fontSize: 13,
                        margin: '0 0 12px',
                        lineHeight: 1.6,
                      }}
                    >
                      {chapter.description}
                    </p>
                  ) : null}

                  {chapterLectureCount ? (
                    chapter.lectures?.map((lecture) => (
                      <div
                        key={lecture.id}
                        className={`lms-admin-lecture${dragLectureId === lecture.id ? ' lms-admin-lecture--dragging' : ''}`}
                        draggable
                        onDragStart={() => handleDragStart(lecture.id)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(lecture, chapter.lectures)}
                        style={
                          dragLectureId === lecture.id
                            ? {
                                opacity: 0.4,
                                borderColor: 'var(--color-primary)',
                                borderStyle: 'dashed',
                                background: '#eff6ff',
                              }
                            : undefined
                        }
                      >
                        <Tooltip title="Kéo để sắp xếp">
                          <span className="lms-admin-lecture__handle">
                            <HolderOutlined />
                          </span>
                        </Tooltip>

                        <span className="lms-admin-lecture__order">{lecture.order}</span>

                        <div className="lms-admin-lecture__body">
                          <div className="lms-admin-lecture__name">{lecture.name}</div>
                          <div className="lms-admin-lecture__tags">
                            {lecture.isPublished ? (
                              <span className="lms-admin-badge lms-admin-badge--success">
                                Công khai
                              </span>
                            ) : (
                              <span className="lms-admin-badge lms-admin-badge--draft">
                                Bản nháp
                              </span>
                            )}
                            {renderLectureBadge(lecture)}
                            {lecture.duration > 0 ? (
                              <span style={{ fontSize: 12, color: 'var(--color-textSecondary)' }}>
                                {formatMinutes(lecture.duration)}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="lms-admin-lecture__actions">
                          <Tooltip title={lecture.videoUrl ? 'Xem video' : 'Chưa có video'}>
                            <a
                              className={`lms-admin-lecture__btn${!lecture.videoUrl ? ' lms-admin-lecture__btn--disabled' : ''}`}
                              href={lecture.videoUrl || undefined}
                              target={lecture.videoUrl ? '_blank' : undefined}
                              rel="noreferrer"
                              style={
                                !lecture.videoUrl
                                  ? { opacity: 0.35, pointerEvents: 'none' }
                                  : undefined
                              }
                              aria-label="Xem video"
                            >
                              <EyeOutlined />
                            </a>
                          </Tooltip>
                          <button
                            className="lms-admin-lecture__btn"
                            aria-label="Sửa bài giảng"
                            onClick={() => openEditLecture(lecture)}
                          >
                            <EditOutlined />
                          </button>
                          <Popconfirm
                            onConfirm={() => deleteLecture.mutate(lecture.id)}
                            title="Xoá bài giảng?"
                          >
                            <button
                              className="lms-admin-lecture__btn lms-admin-lecture__btn--danger"
                              aria-label="Xoá bài giảng"
                            >
                              <DeleteOutlined />
                            </button>
                          </Popconfirm>
                        </div>
                      </div>
                    ))
                  ) : (
                    <Empty
                      description="Chương này chưa có bài giảng."
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ padding: '40px 20px' }}>
            <EmptyState
              action={{ label: 'Thêm chương đầu tiên', onClick: openCreateChapter }}
              description="Tạo chương trước, sau đó thêm bài giảng và upload video."
              title="Khoá học chưa có nội dung"
            />
          </div>
        )}
      </div>

      {/* ── Enrollments ── */}
      <div className="lms-admin-block">
        <div className="lms-admin-block__head">
          <div>
            <div className="lms-admin-block__title">Duyệt ghi danh</div>
            <div className="lms-admin-block__subtitle">
              Học viên chỉ vào được trang học sau khi được duyệt.
            </div>
          </div>
          <div className="lms-admin-block__actions">
            <AdminButton
              variant="primary"
              size="sm"
              icon={<UserAddOutlined />}
              onClick={() => setPickerOpen(true)}
            >
              Thêm học viên
            </AdminButton>
            <span className="lms-admin-badge lms-admin-badge--neutral">
              {courseEnrollments.length} yêu cầu
            </span>
            <span className="lms-admin-badge lms-admin-badge--info">
              {pendingApprovalCount} chờ duyệt
            </span>
          </div>
        </div>

        {enrollmentsQuery.isLoading ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <Spin size="large" />
          </div>
        ) : null}
        {enrollmentsQuery.isError ? (
          <div style={{ padding: 24 }}>
            <ErrorState inline onRetry={() => enrollmentsQuery.refetch()} />
          </div>
        ) : null}

        {!enrollmentsQuery.isLoading && !enrollmentsQuery.isError && !courseEnrollments.length ? (
          <div style={{ padding: '40px 20px' }}>
            <EmptyState
              description="Khi học viên gửi yêu cầu ghi danh, danh sách sẽ xuất hiện tại đây."
              title="Chưa có yêu cầu ghi danh"
            />
          </div>
        ) : null}

        {!enrollmentsQuery.isLoading && !enrollmentsQuery.isError && courseEnrollments.length ? (
          <div style={{ padding: '12px 20px 20px' }}>
            {courseEnrollments.map((enrollment: Enrollment) => {
              const statusBadgeClass =
                enrollment.status === 'active'
                  ? 'lms-admin-badge--success'
                  : enrollment.status === 'rejected'
                    ? 'lms-admin-badge--draft'
                    : 'lms-admin-badge--info';
              const statusLabel =
                enrollment.status === 'active'
                  ? 'Đã duyệt'
                  : enrollment.status === 'rejected'
                    ? 'Từ chối'
                    : 'Chờ duyệt';

              return (
                <div key={enrollment.id} className="lms-admin-enroll">
                  <div className="lms-admin-enroll__user">
                    <div className="lms-admin-enroll__avatar">
                      {enrollment.user?.avatar ? (
                        <img src={enrollment.user.avatar} alt="" />
                      ) : (
                        <UserOutlined />
                      )}
                    </div>
                    <div>
                      <div className="lms-admin-enroll__name">
                        {enrollment.user?.fullName || enrollment.fullName || 'Học viên'}
                      </div>
                      <div className="lms-admin-enroll__email">
                        {enrollment.user?.email || enrollment.phone || 'Chưa có liên hệ'}
                      </div>
                      <div className="lms-admin-enroll__meta">
                        Gửi lúc {formatDate(enrollment.createdAt)}
                        {enrollment.approvedAt
                          ? ` · Duyệt lúc ${formatDate(enrollment.approvedAt)}`
                          : null}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className={`lms-admin-badge ${statusBadgeClass}`}>{statusLabel}</span>
                    {shouldShowEnrollmentReviewActions(enrollment.status) ? (
                      <>
                        <button
                          className="lms-admin-btn lms-admin-btn--primary lms-admin-btn--sm"
                          onClick={() =>
                            reviewEnrollment.mutate({
                              enrollmentId: enrollment.id,
                              status: 'active',
                            })
                          }
                        >
                          Duyệt vào học
                        </button>
                        <button
                          className="lms-admin-btn lms-admin-btn--danger lms-admin-btn--sm"
                          onClick={() =>
                            reviewEnrollment.mutate({
                              enrollmentId: enrollment.id,
                              status: 'rejected',
                            })
                          }
                        >
                          Từ chối
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* ── Chapter Modal ── */}
      <Modal
        className="lms-admin-modal"
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
        width={680}
      >
        <Form form={chapterForm} layout="vertical" style={{ display: 'grid', gap: 18 }}>
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
            label={renderFieldLabel(<CheckCircleOutlined />, 'Xuất bản')}
            name="isPublished"
            style={{ margin: 0 }}
            valuePropName="checked"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                className={`lms-admin-toggle ${chapterForm.getFieldValue('isPublished') ? 'lms-admin-toggle--on' : ''}`}
                type="button"
                onClick={() =>
                  chapterForm.setFieldValue(
                    'isPublished',
                    !chapterForm.getFieldValue('isPublished'),
                  )
                }
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-textSecondary)' }}>
                {chapterForm.getFieldValue('isPublished') ? 'Công khai' : 'Bản nháp'}
              </span>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Lecture Modal ── */}
      <Modal
        className="lms-admin-modal"
        confirmLoading={createLecture.isPending || updateLecture.isPending}
        okText={editingLecture ? 'Lưu bài giảng' : 'Tạo bài giảng'}
        onCancel={() => {
          setLectureModal(false);
          setEditingLecture(null);
          setVideoFile(null);
          setVideoUrlInput('');
          setVideoSourceType('upload');
        }}
        onOk={() => void handleLectureSubmit()}
        open={lectureModal}
        title={renderModalTitle(
          <PlayCircleOutlined />,
          editingLecture ? 'Cập nhật bài giảng' : 'Tạo bài giảng mới',
          'Thứ tự bài giảng sẽ tự động sắp xếp. Kéo thả sau khi tạo để thay đổi.',
        )}
        width={720}
      >
        <Form form={lectureForm} layout="vertical" style={{ display: 'grid', gap: 18 }}>
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

          <Form.Item
            label={renderFieldLabel(<CheckCircleOutlined />, 'Trạng thái')}
            name="isPublished"
            style={{ margin: 0 }}
            valuePropName="checked"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                className={`lms-admin-toggle ${lectureForm.getFieldValue('isPublished') ? 'lms-admin-toggle--on' : ''}`}
                type="button"
                onClick={() =>
                  lectureForm.setFieldValue(
                    'isPublished',
                    !lectureForm.getFieldValue('isPublished'),
                  )
                }
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-textSecondary)' }}>
                {lectureForm.getFieldValue('isPublished') ? 'Công khai' : 'Bản nháp'}
              </span>
            </div>
          </Form.Item>

          <div>
            <label
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--color-ink)',
                marginBottom: 8,
                display: 'block',
              }}
            >
              Nguồn video
            </label>
            <Segmented
              onChange={(value) => setVideoSourceType(value as VideoSourceType)}
              options={[
                { label: 'Iframe URL', value: 'url', icon: <LinkOutlined /> },
                { label: 'Upload', value: 'upload', icon: <UploadOutlined /> },
              ]}
              value={videoSourceType}
            />
          </div>

          {videoSourceType === 'upload' ? (
            <div>
              <Upload.Dragger
                accept="video/*"
                beforeUpload={(file) => {
                  setVideoFile(file as File);
                  return false;
                }}
                maxCount={1}
                onRemove={() => setVideoFile(null)}
                style={{
                  border: '2px dashed var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 28,
                }}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'rgb(15 23 42)' }}>
                  {videoFile
                    ? videoFile.name
                    : editingLecture?.videoUrl
                      ? 'Thả file để thay video'
                      : 'Kéo thả hoặc bấm để chọn video'}
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgb(100 116 139)' }}>
                  {editingLecture?.videoUrl
                    ? 'Chỉ upload khi cần thay mới.'
                    : 'Một file cho mỗi bài giảng.'}
                </p>
              </Upload.Dragger>
            </div>
          ) : (
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--color-textSecondary)',
                  marginBottom: 6,
                  display: 'block',
                }}
              >
                Iframe URL
              </label>
              <Input
                placeholder="https://iframe.mediadelivery.net/embed/..."
                size="large"
                value={videoUrlInput}
                onChange={(e) => setVideoUrlInput(e.target.value)}
              />
            </div>
          )}

          {!editingLecture && videoSourceType === 'upload' ? (
            <p style={{ fontSize: 12, color: 'var(--color-textDisabled)', margin: 0 }}>
              Video sẽ được xử lý sau khi tải lên. Bạn có thể nhập Iframe URL thủ công nếu muốn.
            </p>
          ) : null}
        </Form>
      </Modal>

      <ItemPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Thêm học viên vào khoá học"
        placeholder="Tìm theo tên hoặc email..."
        itemLabel="học viên"
        fetchItems={async ({ search: s, page: p, limit: l }) => {
          const res = await userService.getAll({ search: s, page: p, limit: l });
          return {
            items: res.items.map((u) => ({
              id: u.id,
              cells: [
                <span style={{ fontWeight: 600 }}>{u.fullName}</span>,
                <span style={{ color: 'var(--color-textSecondary)' }}>{u.email}</span>,
              ],
              cols: 2,
            } as PickerItem)),
            total: res.total,
          };
        }}
        onSubmit={async (ids) => {
          await addUsersMutation.mutateAsync(ids);
        }}
        loading={addUsersMutation.isPending}
      />
    </div>
  );
}
