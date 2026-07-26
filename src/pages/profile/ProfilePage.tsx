import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Avatar, Form, Input, Pagination, Upload, message } from 'antd';
import { BookOutlined, CameraOutlined, UserOutlined } from '@ant-design/icons';
import { CourseCard, EmptyState, ErrorState, LoadingSkeleton } from '@/components';
import { queryKeys } from '@/config/query-keys';
import { authService, enrollmentService, uploadService, userService } from '@/services';
import { useAuthStore } from '@/store/auth.store';
import { usePageTitle, usePagination } from '@/hooks';
import type { UpdateProfilePayload } from '@/services/user.service';

interface ProfileFormValues {
  fullName: string;
  avatar: string;
}

export default function ProfilePage() {
  usePageTitle('Hồ sơ');

  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pagination = usePagination(1, 8);
  const [form] = Form.useForm<ProfileFormValues>();
  const profileQuery = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => (await authService.getMe()).data,
    initialData: user ?? undefined,
  });

  const enrollmentsQuery = useQuery({
    queryKey: queryKeys.enrollments.my({ page: pagination.current, limit: pagination.pageSize }),
    queryFn: () =>
      enrollmentService.getMyEnrollments({ page: pagination.current, limit: pagination.pageSize }),
  });

  const profile = profileQuery.data ?? user;
  const avatarValue = Form.useWatch('avatar', form);

  useEffect(() => {
    if (!profile) return;
    setUser(profile);
    form.setFieldsValue({ fullName: profile.fullName, avatar: profile.avatar ?? '' });
  }, [form, profile, setUser]);

  const updateProfileMutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => userService.updateMe(payload),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.setQueryData(queryKeys.auth.me, updatedUser);
      form.setFieldsValue({ fullName: updatedUser.fullName, avatar: updatedUser.avatar ?? '' });
      message.success('Cập nhật hồ sơ thành công');
    },
    onError: () => {
      message.error('Không thể cập nhật hồ sơ lúc này');
    },
  });

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const nextFullName = values.fullName.trim();
    const nextAvatar = values.avatar.trim();
    const currentFullName = profile?.fullName.trim() ?? '';
    const currentAvatar = profile?.avatar?.trim() ?? '';
    if (nextFullName === currentFullName && nextAvatar === currentAvatar) {
      message.info('Thông tin hồ sơ hiện chưa thay đổi');
      return;
    }
    const payload: UpdateProfilePayload = {};
    if (nextFullName !== currentFullName) payload.fullName = nextFullName;
    if (nextAvatar !== currentAvatar) payload.avatar = nextAvatar || null;
    updateProfileMutation.mutate(payload);
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      const uploadedUrl = await uploadService.uploadImage(file);
      form.setFieldValue('avatar', uploadedUrl);
      message.success('Ảnh đại diện đã được tải lên');
    } catch {
      message.error('Tải ảnh đại diện thất bại');
    }
    return false;
  };

  const joinedAt = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
    : null;
  const enrolledCount = enrollmentsQuery.data?.total ?? 0;
  const avatarPreview = avatarValue || profile?.avatar || '';

  return (
    <div className="lms-profile-page">
      <div className="lms-shell">
        <h1 className="lms-profile-title">Hồ sơ của tôi</h1>
        <p className="lms-profile-subtitle">
          Cập nhật thông tin cá nhân và quản lý khoá học của bạn.
        </p>

        {/* Profile Summary */}
        <div className="lms-profile-card">
          <div className="lms-profile-summary">
            <div className="lms-profile-summary__avatar-wrap">
              <Upload
                accept="image/*"
                beforeUpload={(file) => handleAvatarUpload(file as File)}
                showUploadList={false}
              >
                <div style={{ cursor: 'pointer' }}>
                  <Avatar
                    className="lms-profile-summary__avatar"
                    icon={!avatarPreview ? <UserOutlined /> : undefined}
                    size={80}
                    src={avatarPreview || undefined}
                  />
                  <div className="lms-profile-summary__avatar-badge">
                    <CameraOutlined />
                  </div>
                </div>
              </Upload>
            </div>
            <div className="lms-profile-summary__copy">
              <h2 className="lms-profile-summary__name">{profile?.fullName ?? 'Tài khoản LMS'}</h2>
              <p className="lms-profile-summary__email">{profile?.email}</p>
              <div className="lms-profile-summary__meta">
                <span
                  className={`lms-profile-summary__badge ${profile?.roleCode === 'super_admin' || profile?.roleCode === 'admin' ? 'lms-profile-summary__badge--admin' : ''}`}
                >
                  {profile?.roleCode === 'super_admin' || profile?.roleCode === 'admin'
                    ? 'Quản trị viên'
                    : 'Học viên'}
                </span>
                <span className="lms-profile-summary__count">
                  {enrolledCount} khoá học đã đăng ký
                </span>
                {joinedAt && (
                  <span className="lms-profile-summary__date">Tham gia từ {joinedAt}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="lms-profile-card lms-profile-form">
          <div className="lms-profile-form__body">
            <h3 className="lms-profile-form__title">Cập nhật thông tin</h3>
            <p className="lms-profile-form__subtitle">
              Điều chỉnh tên hiển thị hoặc ảnh đại diện để hồ sơ trông gọn gàng hơn.
            </p>
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item
                label="Họ và tên"
                name="fullName"
                rules={[
                  { required: true, message: 'Vui lòng nhập họ và tên' },
                  { min: 2, message: 'Họ và tên cần tối thiểu 2 ký tự' },
                ]}
              >
                <Input placeholder="Nhập tên hiển thị của bạn" />
              </Form.Item>
              <Form.Item label="Email">
                <Input readOnly value={profile?.email} />
              </Form.Item>
              <Form.Item hidden name="avatar">
                <Input />
              </Form.Item>
              <p className="lms-profile-form__hint">
                Ảnh đại diện được đổi bằng cách bấm vào biểu tượng máy ảnh bên trên, sau đó nhấn Lưu
                thay đổi.
              </p>
              <div className="lms-profile-form__actions">
                <button
                  className="lms-profile-save-btn"
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </Form>
          </div>
        </div>

        {/* My Courses */}
        <div className="lms-profile-section">
          <h2 className="lms-profile-section__title">Khoá học của tôi</h2>
          <p className="lms-profile-section__subtitle">
            Theo dõi tiến độ và quay lại bài học gần nhất.
          </p>

          {enrollmentsQuery.isLoading ? <LoadingSkeleton count={4} variant="card" /> : null}
          {enrollmentsQuery.isError ? (
            <ErrorState onRetry={() => enrollmentsQuery.refetch()} />
          ) : null}

          {!enrollmentsQuery.isLoading &&
          !enrollmentsQuery.isError &&
          !enrollmentsQuery.data?.items?.length ? (
            <EmptyState
              action={{ label: 'Khám phá khoá học', onClick: () => navigate('/') }}
              description="Bạn chưa đăng ký khoá học nào."
              icon={<BookOutlined />}
              title="Chưa có khoá học"
            />
          ) : null}

          {!enrollmentsQuery.isLoading &&
          !enrollmentsQuery.isError &&
          enrollmentsQuery.data?.items?.length ? (
            <>
              <div className="lms-course-grid">
                {enrollmentsQuery.data.items.map((enrollment) => (
                  <CourseCard
                    key={enrollment.id}
                    course={enrollment.course}
                    href={
                      enrollment.status === 'active'
                        ? `/learning/${enrollment.id}`
                        : `/courses/${enrollment.courseId}`
                    }
                    progress={enrollment.progress}
                    statusLabel={
                      enrollment.status === 'pending'
                        ? 'Chờ duyệt'
                        : enrollment.status === 'rejected'
                          ? 'Chưa được duyệt'
                          : enrollment.completedAt
                            ? 'Hoàn thành'
                            : 'Đang học'
                    }
                  />
                ))}
              </div>
              {(enrollmentsQuery.data.total ?? 0) > pagination.pageSize ? (
                <div className="lms-pagination">
                  <Pagination
                    current={pagination.current}
                    onChange={pagination.onChange}
                    pageSize={pagination.pageSize}
                    showSizeChanger={false}
                    total={enrollmentsQuery.data.total}
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
