import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Upload,
  message,
} from 'antd';
import { UploadOutlined, InboxOutlined } from '@ant-design/icons';
import { PageHeader } from '@/components';
import { courseService, categoryService, uploadService } from '@/services';
import { queryKeys } from '@/config/query-keys';
import { usePageTitle } from '@/hooks';
import type { CourseFormData } from '@/services/course.service';

export default function CourseCreatePage() {
  usePageTitle('Tạo khoá học mới');

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const thumbnail = Form.useWatch('thumbnail', form);

  const { data: categories } = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => categoryService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (values: CourseFormData) => courseService.create(values),
    onSuccess: (newCourse) => {
      message.success('Tạo khoá học thành công');
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
      navigate(`/admin/courses/${newCourse.id}`);
    },
    onError: () => message.error('Tạo khoá học thất bại'),
  });

  const handleSubmit = async () => {
    const values = await form.validateFields();
    createMutation.mutate(values);
  };

  const handleThumbnailUpload = async (file: File) => {
    try {
      const url = await uploadService.uploadImage(file);
      form.setFieldValue('thumbnail', url);
      message.success('Upload ảnh thành công');
    } catch {
      message.error('Upload ảnh thất bại');
    }
    return false;
  };

  return (
    <div className="lms-course-create">
      <PageHeader
        actions={[
          {
            key: 'cancel',
            node: (
              <Button onClick={() => navigate('/admin/courses')}>
                Huỷ
              </Button>
            ),
          },
        ]}
        subtitle="Điền thông tin cơ bản để tạo khoá học. Bạn có thể chỉnh sửa sau."
        title="Tạo khoá học mới"
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ price: 0, isPublished: false }}
      >
        <div className="lms-course-create__grid">
          <div className="lms-course-create__col">
            <Card className="lms-admin-card" title="Thông tin cơ bản">
              <Form.Item
                label="Tên khoá học"
                name="name"
                rules={[{ required: true, message: 'Vui lòng nhập tên khoá học' }]}
              >
                <Input placeholder="VD: Khoá học Lập trình Web" size="large" />
              </Form.Item>

              <Form.Item
                label="Mô tả"
                name="description"
                rules={[{ required: true, message: 'Vui lòng nhập mô tả' }]}
              >
                <Input.TextArea placeholder="Mô tả tóm tắt nội dung khoá học..." rows={5} />
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
                  size="large"
                  style={{ width: '100%' }}
                  placeholder="VD: 500,000"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => Number(value?.replace(/,/g, '')) as unknown as string}
                />
              </Form.Item>
            </Card>
          </div>

          <div className="lms-course-create__col">
            <Card className="lms-admin-card" title="Ảnh đại diện">
              <Form.Item name="thumbnail">
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
                          Xoá
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
                        <InboxOutlined style={{ color: 'var(--color-primary)', fontSize: 32 }} />
                      </p>
                      <p className="ant-upload-text" style={{ fontSize: 14, fontWeight: 600 }}>
                        Bấm hoặc kéo thả ảnh vào đây
                      </p>
                      <p className="ant-upload-hint" style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        JPG, PNG, WEBP • tối đa 5MB
                      </p>
                    </Upload.Dragger>
                  )}
                </div>
              </Form.Item>
            </Card>

            <Card className="lms-admin-card" title="Trạng thái xuất bản" style={{ marginTop: 16 }}>
              <Form.Item name="isPublished" valuePropName="checked" style={{ margin: 0 }}>
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
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Công khai khoá học</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      Cho phép học viên tìm thấy và đăng ký
                    </div>
                  </div>
                  <Switch className="lms-custom-switch" />
                </div>
              </Form.Item>
            </Card>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
            marginTop: 24,
            padding: '16px 0',
          }}
        >
          <Button size="large" onClick={() => navigate('/admin/courses')}>
            Huỷ
          </Button>
          <Button
            htmlType="submit"
            loading={createMutation.isPending}
            size="large"
            type="primary"
          >
            Tạo khoá học
          </Button>
        </div>
      </Form>
    </div>
  );
}
