import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Badge, Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Switch, Tag, Typography, message, Alert } from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import { saveAs } from 'file-saver';
import { DataTable, AdminListPageShell, AdminSearchInput, AdminFilterSelect, AdminButton } from '@/components';
import { queryKeys } from '@/config/query-keys';
import { courseService, quizService } from '@/services';
import { useDebounce, usePageTitle } from '@/hooks';
import type { QuizType } from '@/types';

const { Text } = Typography;

interface QuizFormValues {
  title: string;
  description?: string;
  type: QuizType;
  duration?: number;
  passingScore?: number;
  isPublished: boolean;
  courseId?: string | null;
  chapterId?: string | null;
}

export default function AdminQuizzesPage() {
  usePageTitle('Quản lý bài kiểm tra');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<string | null>(null);
  const [form] = Form.useForm();

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    created: number;
    skipped: number;
    errors: { row: number; message: string }[];
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.quizzes.list({ search: debouncedSearch, type: typeFilter, page }),
    queryFn: () =>
      quizService.getAll({ search: debouncedSearch, type: typeFilter, page, limit: 20 }),
  });

  const coursesQuery = useQuery({
    queryKey: queryKeys.courses.list({ page: 1, limit: 100 }),
    queryFn: () => courseService.getAll({ page: 1, limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: (values: QuizFormValues) => quizService.create(values),
    onSuccess: () => {
      message.success('Tạo bài kiểm tra thành công');
      setModalOpen(false);
      form.resetFields();
      void queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
    },
    onError: () => {
      message.error('Không thể tạo bài kiểm tra');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: QuizFormValues }) =>
      quizService.update(id, values),
    onSuccess: () => {
      message.success('Cập nhật bài kiểm tra thành công');
      setModalOpen(false);
      setEditingQuiz(null);
      form.resetFields();
      void queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
    },
    onError: () => {
      message.error('Không thể cập nhật bài kiểm tra');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => quizService.delete(id),
    onSuccess: () => {
      message.success('Xoá bài kiểm tra thành công');
      void queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
    },
    onError: () => {
      message.error('Không thể xoá bài kiểm tra');
    },
  });

  const exportListMutation = useMutation({
    mutationFn: (params?: { search?: string; type?: string; courseId?: string }) =>
      quizService.exportList(params),
    onSuccess: (blob) => {
      const filename = `quizzes-${new Date().toISOString().slice(0, 10)}.xlsx`;
      saveAs(blob, filename);
      message.success('Xuất file Excel thành công');
    },
    onError: () => {
      message.error('Không thể xuất file Excel');
    },
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => quizService.importQuizzes(file),
    onSuccess: (result) => {
      setImportResult(result);
      setImporting(false);
      if (result.created > 0) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
        message.success(`Đã nhập ${result.created} bài kiểm tra`);
      } else if (result.skipped > 0) {
        message.warning('Không có bài kiểm tra mới nào được tạo');
      }
    },
    onError: (err) => {
      setImporting(false);
      setImportError((err as Error).message || 'Import thất bại');
    },
  });

  const openEditModal = (quiz: {
    id: string;
    title: string;
    description?: string;
    type: string;
    duration?: number | null;
    passingScore?: number | null;
    isPublished: boolean;
    courseId?: string | null;
  }) => {
    setEditingQuiz(quiz.id);
    form.setFieldsValue({
      title: quiz.title,
      description: quiz.description,
      type: quiz.type,
      duration: quiz.duration ?? undefined,
      passingScore: quiz.passingScore ?? undefined,
      isPublished: quiz.isPublished,
      courseId: quiz.courseId,
    });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingQuiz) {
        updateMutation.mutate({ id: editingQuiz, values });
      } else {
        createMutation.mutate(values);
      }
    });
  };

  const handleExportList = () => {
    exportListMutation.mutate({
      search: debouncedSearch || undefined,
      type: typeFilter,
    });
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await quizService.downloadTemplate();
      saveAs(blob, 'quiz-import-template.xlsx');
      message.success('Đã tải template');
    } catch {
      message.error('Không thể tải template');
    }
  };

  const handleImport = () => {
    if (!selectedFile) {
      message.warning('Vui lòng chọn file Excel để nhập');
      return;
    }
    setImporting(true);
    setImportResult(null);
    setImportError(null);
    importMutation.mutate(selectedFile);
  };

  const openImportModal = () => {
    setImportModalOpen(true);
    setSelectedFile(null);
    setImportResult(null);
    setImportError(null);
  };

  const columns = [
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      width: 180,
      headerAlign: 'center' as const,
      render: (title: string, record: { id: string }) => (
        <Link to={`/admin/quizzes/${record.id}`}>
          <Text ellipsis={{ tooltip: true }} style={{ color: 'inherit' }}>
            {title}
          </Text>
        </Link>
      ),
    },
    {
      title: 'Khóa học',
      dataIndex: 'course',
      key: 'course',
      width: 140,
      headerAlign: 'center' as const,
      render: (course: { name: string } | null) =>
        course ? (
          <Text ellipsis={{ tooltip: true }} type="secondary">
            {course.name}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: 150,
      headerAlign: 'center' as const,
      render: (type: string) => (
        <Tag color={type === 'coding' ? 'purple' : 'blue'} style={{ margin: 0 }}>
          {type === 'coding' ? 'Coding' : 'Trắc nghiệm'}
        </Tag>
      ),
    },
    {
      title: 'Thời gian',
      dataIndex: 'duration',
      key: 'duration',
      width: 120,
      headerAlign: 'center' as const,
      render: (duration: number | null) => (
        <Text type="secondary">{duration ? `${Math.round(duration / 60)} phút` : '—'}</Text>
      ),
    },
    {
      title: 'Điểm đạt',
      dataIndex: 'passingScore',
      key: 'passingScore',
      width: 120,
      headerAlign: 'center' as const,
      render: (score: number | null) => <Text type="secondary">{score ? `${score}%` : '—'}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isPublished',
      key: 'isPublished',
      width: 150,
      headerAlign: 'center' as const,
      render: (published: boolean) => (
        <Badge
          status={published ? 'success' : 'default'}
          text={published ? 'Đã xuất bản' : 'Nháp'}
        />
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      headerAlign: 'center' as const,
      render: (date: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(date).toLocaleDateString('vi-VN')}
        </Text>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 160,
      headerAlign: 'center' as const,
      render: (
        _: unknown,
        record: {
          id: string;
          title: string;
          description?: string;
          type: string;
          duration?: number | null;
          passingScore?: number | null;
          isPublished: boolean;
          courseId?: string | null;
        },
      ) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <Link to={`/admin/quizzes/${record.id}/edit`}>
            <Button icon={<EditOutlined />} size="small" type="text" />
          </Link>
          <Popconfirm
            cancelText="Huỷ"
            okText="Xoá"
            okType="danger"
            onConfirm={() => deleteMutation.mutate(record.id)}
            title={`Xoá "${record.title}"?`}
          >
            <Button danger icon={<DeleteOutlined />} size="small" type="text" />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <AdminListPageShell
      title="Bài kiểm tra"
      subtitle="Quản lý các bài kiểm tra trắc nghiệm và coding"
      filters={
        <>
          <AdminSearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Tìm kiếm bài kiểm tra..."
          />
          <AdminFilterSelect
            value={typeFilter ?? ''}
            onChange={(v) => { setTypeFilter(v || undefined); setPage(1); }}
            options={[
              { label: 'Tất cả loại', value: '' },
              { label: 'Trắc nghiệm', value: 'multiple_choice' },
              { label: 'Coding', value: 'coding' },
            ]}
            ariaLabel="Lọc theo loại"
          />
        </>
      }
      actions={
        <>
          <AdminButton
            variant="outline"
            icon={<UploadOutlined />}
            onClick={openImportModal}
          >
            Nhập Excel
          </AdminButton>
          <AdminButton
            variant="outline"
            icon={<DownloadOutlined />}
            onClick={handleExportList}
            loading={exportListMutation.isPending}
          >
            Xuất Excel
          </AdminButton>
          <AdminButton
            variant="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/admin/quizzes/create')}
          >
            Tạo bài kiểm tra
          </AdminButton>
        </>
      }
    >

      <DataTable
        columns={columns}
        dataSource={data?.items ?? []}
        loading={isLoading}
        locale={{ emptyText: 'Chưa có bài kiểm tra nào' }}
        onChange={(p) => setPage(p.current ?? 1)}
        pagination={{
          current: page,
          pageSize: 20,
          showSizeChanger: false,
          total: data?.total ?? 0,
        }}
      />

      <Modal
        cancelText="Huỷ"
        okText={editingQuiz ? 'Cập nhật' : 'Tạo mới'}
        onCancel={() => {
          setModalOpen(false);
          setEditingQuiz(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        open={modalOpen}
        title={editingQuiz ? 'Chỉnh sửa bài kiểm tra' : 'Tạo bài kiểm tra mới'}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="Tiêu đề"
            name="title"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
          >
            <Input placeholder="Nhập tiêu đề bài kiểm tra" />
          </Form.Item>

          <Form.Item label="Mô tả" name="description">
            <Input.TextArea placeholder="Mô tả bài kiểm tra (không bắt buộc)" rows={3} />
          </Form.Item>

          <Form.Item
            label="Loại bài kiểm tra"
            name="type"
            rules={[{ required: true, message: 'Vui lòng chọn loại' }]}
          >
            <Select>
              <Select.Option value="multiple_choice">Trắc nghiệm</Select.Option>
              <Select.Option value="coding">Coding</Select.Option>
            </Select>
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item label="Thời gian (giây)" name="duration">
              <InputNumber min={0} placeholder="vd: 900" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Điểm đạt" name="passingScore">
              <InputNumber min={0} placeholder="vd: 80" style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item label="Liên kết khoá học" name="courseId">
            <Select allowClear placeholder="Chọn khoá học (không bắt buộc)">
              {(coursesQuery.data?.items ?? []).map((c) => (
                <Select.Option key={c.id} value={c.id}>
                  {c.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Xuất bản" name="isPublished" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        footer={null}
        onCancel={() => {
          setImportModalOpen(false);
          setSelectedFile(null);
          setImportResult(null);
          setImportError(null);
        }}
        open={importModalOpen}
        title="Nhập danh sách bài kiểm tra từ Excel"
        width={600}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate} type="link">
              Tải template mẫu
            </Button>
          </div>

          <div
            style={{
              border: '2px dashed #d9d9d9',
              borderRadius: 8,
              padding: 32,
              textAlign: 'center',
              background: '#fafafa',
            }}
          >
            <UploadOutlined
              style={{ fontSize: 32, color: '#999', marginBottom: 8, display: 'block' }}
            />
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              Kéo thả file Excel (.xlsx, .xls) vào đây hoặc click để chọn file
            </Text>
            <input
              accept=".xlsx,.xls"
              id="quiz-import-file"
              style={{ display: 'none' }}
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setSelectedFile(file);
                  setImportResult(null);
                  setImportError(null);
                }
              }}
            />
            <label htmlFor="quiz-import-file">
              <Button icon={<FileExcelOutlined />} type="primary" ghost>
                Chọn file
              </Button>
            </label>
            {selectedFile && (
              <div style={{ marginTop: 12 }}>
                <Tag color="green" icon={<FileExcelOutlined />}>
                  {selectedFile.name}
                </Tag>
              </div>
            )}
          </div>

          {importError && <Alert message={importError} showIcon type="error" />}

          {importResult && (
            <div>
              <Alert
                message={`Đã nhập thành công ${importResult.created} bài kiểm tra`}
                showIcon
                type="success"
                style={{ marginBottom: 8 }}
              />
              {importResult.skipped > 0 && (
                <Alert
                  message={`Đã bỏ qua ${importResult.skipped} bài (trùng tiêu đề)`}
                  showIcon
                  type="warning"
                  style={{ marginBottom: 8 }}
                />
              )}
              {importResult.errors.length > 0 && (
                <Alert
                  message={
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        {importResult.errors.length} lỗi:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {importResult.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>
                            Dòng {err.row}: {err.message}
                          </li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>...và {importResult.errors.length - 5} lỗi khác</li>
                        )}
                      </ul>
                    </div>
                  }
                  showIcon
                  type="error"
                />
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button
              onClick={() => {
                setImportModalOpen(false);
                setSelectedFile(null);
                setImportResult(null);
                setImportError(null);
              }}
            >
              Đóng
            </Button>
            <Button
              icon={<UploadOutlined />}
              loading={importing}
              onClick={handleImport}
              type="primary"
              disabled={!selectedFile}
            >
              Bắt đầu nhập
            </Button>
          </div>
        </div>
      </Modal>
    </AdminListPageShell>
  );
}
