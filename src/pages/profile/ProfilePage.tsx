import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, Card, Form, Input, Pagination, Typography, Upload, message } from 'antd';
import { BookOutlined, CameraOutlined, UserOutlined } from '@ant-design/icons';
import { CourseCard, EmptyState, ErrorState, LoadingSkeleton, PageHeader } from '@/components';
import { queryKeys } from '@/config/query-keys';
import { authService, enrollmentService, uploadService, userService } from '@/services';
import { useAuthStore } from '@/store/auth.store';
import { usePageTitle, usePagination } from '@/hooks';
import type { UpdateProfilePayload } from '@/services/user.service';

const { Paragraph, Text, Title } = Typography;

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
  const [avatarUploading, setAvatarUploading] = useState(false);

  const profileQuery = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => (await authService.getMe()).data,
    initialData: user ?? undefined,
  });

  const enrollmentsQuery = useQuery({
    queryKey: queryKeys.enrollments.my({
      page: pagination.current,
      limit: pagination.pageSize,
    }),
    queryFn: () =>
      enrollmentService.getMyEnrollments({
        page: pagination.current,
        limit: pagination.pageSize,
      }),
  });

  const profile = profileQuery.data ?? user;
  const avatarValue = Form.useWatch('avatar', form);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setUser(profile);
    form.setFieldsValue({
      fullName: profile.fullName,
      avatar: profile.avatar ?? '',
    });
  }, [form, profile, setUser]);

  const updateProfileMutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => userService.updateMe(payload),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.setQueryData(queryKeys.auth.me, updatedUser);
      form.setFieldsValue({
        fullName: updatedUser.fullName,
        avatar: updatedUser.avatar ?? '',
      });
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

    if (nextFullName !== currentFullName) {
      payload.fullName = nextFullName;
    }

    if (nextAvatar !== currentAvatar) {
      payload.avatar = nextAvatar || null;
    }

    updateProfileMutation.mutate(payload);
  };

  const handleAvatarUpload = async (file: File) => {
    setAvatarUploading(true);

    try {
      const uploadedUrl = await uploadService.uploadImage(file);
      form.setFieldValue('avatar', uploadedUrl);
      message.success('Ảnh đại diện đã được tải lên');
    } catch {
      message.error('Tải ảnh đại diện thất bại');
    } finally {
      setAvatarUploading(false);
    }

    return false;
  };

  const joinedAt = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('vi-VN', {
        month: 'long',
        year: 'numeric',
      })
    : null;
  const enrolledCount = enrollmentsQuery.data?.total ?? 0;
  const avatarPreview = avatarValue || profile?.avatar || '';

  return (
    <div>
      <PageHeader
        subtitle="Cập nhật thông tin cá nhân và giữ hình ảnh hồ sơ của bạn nhất quán trên toàn bộ nền tảng."
        title="Hồ sơ của tôi"
      />

      <section className="lms-profile-section">
        <Card className="lms-profile-card lms-profile-card--summary">
          <div className="lms-profile-summary">
            <div className="lms-profile-summary__hero">
              <Upload
                accept="image/*"
                beforeUpload={(file) => handleAvatarUpload(file as File)}
                showUploadList={false}
              >
                <button
                  className={`lms-profile-summary__avatar-button ${avatarUploading ? 'lms-profile-summary__avatar-button--loading' : ''}`}
                  disabled={avatarUploading}
                  type="button"
                >
                  <Avatar
                    className="lms-profile-summary__avatar"
                    icon={!avatarPreview ? <UserOutlined /> : undefined}
                    size={72}
                    src={avatarPreview || undefined}
                  />
                  <span className="lms-profile-summary__avatar-badge">
                    <CameraOutlined />
                  </span>
                </button>
              </Upload>

              <div className="lms-profile-summary__copy">
                <Title className="lms-profile-summary__title" level={3}>
                  {profile?.fullName ?? 'Tài khoản LMS'}
                </Title>
                <Text className="lms-profile-summary__email" type="secondary">
                  {profile?.email}
                </Text>
                <div className="lms-profile-summary__badge-row">
                  <span className="lms-profile-summary__badge">
                    {profile?.roleCode === 'super_admin' || profile?.roleCode === 'admin'
                      ? 'Quản trị viên'
                      : 'Học viên'}
                  </span>
                  <span className="lms-profile-summary__enrolled-badge">
                    {enrolledCount} khoá học đã đăng ký
                  </span>
                  {joinedAt ? (
                    <Text className="lms-profile-summary__meta" type="secondary">
                      Tham gia từ {joinedAt}
                    </Text>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="lms-profile-card lms-profile-card--form">
          <div className="lms-profile-form__header">
            <Title className="lms-profile-form__title" level={4}>
              Cập nhật thông tin
            </Title>
            <Paragraph className="lms-profile-form__subtitle">
              Điều chỉnh tên hiển thị hoặc ảnh đại diện để hồ sơ trông gọn gàng và nhất quán hơn.
            </Paragraph>
          </div>

          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              label="Họ và tên"
              name="fullName"
              rules={[
                { required: true, message: 'Vui lòng nhập họ và tên' },
                { min: 2, message: 'Họ và tên cần tối thiểu 2 ký tự' },
                { max: 255, message: 'Họ và tên quá dài' },
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

            <Text className="lms-profile-form__hint" type="secondary">
              Ảnh đại diện được đổi bằng cách bấm trực tiếp vào avatar bên trái, sau đó nhấn cập
              nhật để lưu.
            </Text>

            <div className="lms-profile-form__actions">
              <Button htmlType="submit" loading={updateProfileMutation.isPending} type="primary">
                Lưu thay đổi
              </Button>
            </div>
          </Form>
        </Card>
      </section>

      <PageHeader
        subtitle="Theo dõi tiến độ và quay lại bài học gần nhất của bạn."
        title="Khoá học của tôi"
      />

      {enrollmentsQuery.isLoading ? <LoadingSkeleton count={4} variant="card" /> : null}
      {enrollmentsQuery.isError ? <ErrorState onRetry={() => enrollmentsQuery.refetch()} /> : null}

      {!enrollmentsQuery.isLoading &&
      !enrollmentsQuery.isError &&
      !enrollmentsQuery.data?.items?.length ? (
        <EmptyState
          action={{ label: 'Khám phá khoá học', onClick: () => navigate('/') }}
          description="Bạn chưa đăng ký khoá học nào. Chọn một khoá học phù hợp để bắt đầu."
          icon={<BookOutlined />}
          title="Chưa có khoá học"
        />
      ) : null}

      {!enrollmentsQuery.isLoading &&
      !enrollmentsQuery.isError &&
      enrollmentsQuery.data?.items?.length ? (
        <>
          <div className="lms-grid lms-grid--courses">
            {enrollmentsQuery.data.items.map((enrollment, index) => (
              <div key={enrollment.id} style={{ animationDelay: `${Math.min(index, 20) * 50}ms` }}>
                <CourseCard
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
              </div>
            ))}
          </div>

          {(enrollmentsQuery.data.total ?? 0) > pagination.pageSize ? (
            <div
              style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--spacing-7)' }}
            >
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
  );
}
