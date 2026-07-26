import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Upload,
  message,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { CourseCard, EmptyState, ErrorState, LoadingSkeleton, PageHeader } from '@/components';
import { courseService, categoryService, uploadService } from '@/services';
import { queryKeys } from '@/config/query-keys';
import { useBreakpoint, useDebounce, usePageTitle } from '@/hooks';
import type { Course } from '@/types';
import type { CourseFormData } from '@/services/course.service';

function statusLabel(isPublished: boolean) {
  return isPublished ? 'Đã xuất bản' : 'Bản nháp';
}

function formatDate(value?: string) {
  if (!value) return '--';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return '--';
  }
}

export default function AdminCoursesPage() {
  usePageTitle('Quản lý khoá học');

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const breakpoint = useBreakpoint();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isPublishedFilter, setIsPublishedFilter] = useState<boolean | undefined>();
  const debouncedSearch = useDebounce(search, 300);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [form] = Form.useForm();
  const thumbnail = Form.useWatch('thumbnail', form);
  const limit = 10;

  const { data: categories } = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => categoryService.getAll(),
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.courses.list({
      page,
      limit,
      search: debouncedSearch,
      isPublished: isPublishedFilter,
    }),
    queryFn: () =>
      courseService.getAll({
        page,
        limit,
        search: debouncedSearch,
        isPublished: isPublishedFilter,
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: values }: { id: string; data: CourseFormData }) =>
      courseService.update(id, values),
    onSuccess: () => {
      message.success('Cập nhật thành công');
      setEditModalOpen(false);
      setEditingCourse(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
    },
    onError: () => message.error('Cập nhật thất bại'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => courseService.delete(id),
    onSuccess: () => {
      message.success('Xoá thành công');
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
    },
    onError: () => message.error('Xoá thất bại'),
  });

  const openEdit = (course: Course) => {
    setEditingCourse(course);
    form.setFieldsValue({
      name: course.name,
      description: course.description,
      price: course.price,
      thumbnail: course.thumbnail,
      isPublished: course.isPublished,
      categoryId: course.categoryId,
    });
    setEditModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingCourse) {
      updateMutation.mutate({ id: editingCourse.id, data: values });
    }
  };

  const handleThumbnailUpload = async (file: File) => {
    try {
      const url = await uploadService.uploadImage(file);
      form.setFieldValue('thumbnail', url);
      message.success('Upload thành công');
    } catch {
      message.error('Upload thất bại');
    }
    return false;
  };

  const columns = [
    { title: 'Tên', dataIndex: 'name', key: 'name', ellipsis: true, width: 200 },
    {
      title: 'Tác giả',
      key: 'author',
      width: 140,
      ellipsis: true,
      render: (_: unknown, record: Course) => record.author?.fullName || '--',
    },
    {
      title: 'Số bài học',
      key: 'lectureCount',
      width: 100,
      render: (_: unknown, record: Course) => record.lectureCount ?? '--',
    },
    {
      title: 'Giá',
      dataIndex: 'price',
      key: 'price',
      render: (value: number) => `${(value || 0).toLocaleString()}đ`,
      width: 100,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isPublished',
      key: 'isPublished',
      render: (value: boolean) => (
        <Tag color={value ? 'green' : 'default'}>{statusLabel(value)}</Tag>
      ),
      width: 110,
    },
    {
      title: 'Ngày tạo',
      key: 'createdAt',
      width: 110,
      render: (_: unknown, record: Course) => formatDate(record.createdAt),
    },
    {
      title: 'Cập nhật',
      key: 'updatedAt',
      width: 110,
      render: (_: unknown, record: Course) => formatDate(record.updatedAt),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 160,
      fixed: 'right',
      render: (_: unknown, record: Course) => (
        <Space size="small">
          <Link to={`/admin/courses/${record.id}`}>
            <Tooltip title="Xem nội dung">
              <Button aria-label="Xem khoá học" icon={<EyeOutlined />} size="small" type="text" />
            </Tooltip>
          </Link>
          <Tooltip title="Sửa thông tin">
            <Button
              aria-label="Sửa khoá học"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
              size="small"
              type="text"
            />
          </Tooltip>
          <Popconfirm title="Xoá khoá học?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Tooltip title="Xoá">
              <Button
                aria-label="Xoá khoá học"
                danger
                icon={<DeleteOutlined />}
                loading={deleteMutation.isPending}
                size="small"
                type="text"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        actions={[
          {
            key: 'create',
            node: (
              <Button
                icon={<PlusOutlined />}
                id="create-course"
                onClick={() => navigate('/admin/courses/create')}
                type="primary"
              >
                <span className="lms-btn-text-responsive">Thêm khoá học</span>
              </Button>
            ),
          },
        ]}
        subtitle="Tạo, cập nhật và kiểm tra trạng thái xuất bản của các khoá học."
        title="Quản lý khoá học"
      />

      <Space
        size="middle"
        style={{ alignItems: 'center', flexWrap: 'wrap', marginBottom: 'var(--spacing-4)' }}
      >
        <Input
          allowClear
          id="course-search-admin"
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Tìm kiếm..."
          prefix={<SearchOutlined />}
          style={{ width: 360 }}
          value={search}
        />
        <Select
          aria-label="Lọc trạng thái xuất bản"
          onChange={(value) => {
            setIsPublishedFilter(value === 'all' ? undefined : value === 'published');
            setPage(1);
          }}
          options={[
            { label: 'Tất cả trạng thái', value: 'all' },
            { label: 'Đã xuất bản', value: 'published' },
            { label: 'Bản nháp', value: 'draft' },
          ]}
          placeholder="Trạng thái"
          style={{ minWidth: 180 }}
          value={
            isPublishedFilter === undefined ? 'all' : isPublishedFilter ? 'published' : 'draft'
          }
        />
      </Space>

      {isError ? <ErrorState inline onRetry={() => refetch()} /> : null}

      {isLoading ? <LoadingSkeleton count={8} variant="table-row" /> : null}

      {!isLoading && !isError && !data?.items?.length ? (
        <EmptyState
          action={{ label: 'Tạo khoá học', onClick: () => navigate('/admin/courses/create') }}
          title="Không có khoá học phù hợp"
          description="Thử đổi từ khóa hoặc trạng thái xuất bản để mở rộng kết quả."
        />
      ) : null}

      {!isLoading && !isError && data?.items?.length ? (
        breakpoint === 'mobile' ? (
          <div className="lms-grid lms-grid--courses">
            {data.items.map((course) => (
              <CourseCard
                actions={
                  <Space>
                    <Button
                      aria-label="Sửa khoá học"
                      icon={<EditOutlined />}
                      onClick={() => openEdit(course)}
                      size="small"
                    />
                    <Popconfirm
                      title="Xoá khoá học?"
                      onConfirm={() => deleteMutation.mutate(course.id)}
                    >
                      <Button
                        aria-label="Xoá khoá học"
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                      />
                    </Popconfirm>
                  </Space>
                }
                course={course}
                href={`/admin/courses/${course.id}`}
                key={course.id}
                statusLabel={statusLabel(course.isPublished)}
              />
            ))}
          </div>
        ) : (
          <Table<Course>
            columns={columns}
            dataSource={data.items}
            pagination={{
              current: page,
              onChange: setPage,
              pageSize: limit,
              showSizeChanger: false,
              total: data.total,
            }}
            rowKey="id"
            scroll={{ x: 1200 }}
          />
        )
      ) : null}

      <Modal
        confirmLoading={updateMutation.isPending}
        okText="Cập nhật"
        onCancel={() => {
          setEditModalOpen(false);
          setEditingCourse(null);
        }}
        onOk={handleSubmit}
        open={editModalOpen}
        title="Sửa khoá học"
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 'var(--spacing-4)' }}>
          <Form.Item
            label="Tên khoá học"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
          >
            <Input placeholder="VD: Khóa học Lập trình Web" size="large" />
          </Form.Item>

          <Form.Item
            label="Mô tả"
            name="description"
            rules={[{ required: true, message: 'Vui lòng nhập mô tả' }]}
          >
            <Input.TextArea placeholder="Mô tả tóm tắt nội dung khóa học..." rows={4} />
          </Form.Item>

          <Form.Item label="Danh mục" name="categoryId">
            <Select
              allowClear
              options={categories?.map((c) => ({ label: c.name, value: c.id })) ?? []}
              placeholder="Chọn danh mục khoá học"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Giá bán (VND)"
            name="price"
            rules={[{ required: true, message: 'Vui lòng nhập giá bán' }]}
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              size="large"
              placeholder="VD: 500,000"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => Number(value?.replace(/,/g, '')) as unknown as string}
            />
          </Form.Item>

          <Form.Item label="Ảnh đại diện (Thumbnail)" name="thumbnail">
            <div className="lms-thumbnail-upload-container">
              {thumbnail ? (
                <div className="lms-thumbnail-preview-wrapper">
                  <img
                    src={thumbnail}
                    alt="Course thumbnail preview"
                    className="lms-thumbnail-preview"
                  />
                  <div className="lms-thumbnail-preview-overlay">
                    <Upload
                      beforeUpload={(file) => handleThumbnailUpload(file as File)}
                      showUploadList={false}
                    >
                      <Button type="primary" ghost icon={<UploadOutlined />}>
                        Thay đổi
                      </Button>
                    </Upload>
                    <Button
                      danger
                      type="primary"
                      icon={<UploadOutlined />}
                      onClick={() => form.setFieldValue('thumbnail', '')}
                    >
                      Xóa
                    </Button>
                  </div>
                </div>
              ) : (
                <Upload.Dragger
                  beforeUpload={(file) => handleThumbnailUpload(file as File)}
                  showUploadList={false}
                  className="lms-thumbnail-dragger"
                >
                  <p className="ant-upload-drag-icon" style={{ marginBottom: 12 }}>
                    <UploadOutlined style={{ color: 'var(--color-primary)', fontSize: 32 }} />
                  </p>
                  <p className="ant-upload-text" style={{ fontSize: 14, fontWeight: 600 }}>
                    Bấm hoặc kéo thả ảnh vào đây để tải lên
                  </p>
                  <p
                    className="ant-upload-hint"
                    style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}
                  >
                    Định dạng hỗ trợ: JPG, PNG, WEBP, tối đa 5MB
                  </p>
                </Upload.Dragger>
              )}
            </div>
          </Form.Item>

          <Form.Item
            name="isPublished"
            valuePropName="checked"
            style={{ marginBottom: 0, marginTop: 24 }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'var(--color-surface-muted)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Trạng thái xuất bản</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Cho phép học viên tìm thấy và đăng ký khoá học này
                </div>
              </div>
              <Switch className="lms-custom-switch" />
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
