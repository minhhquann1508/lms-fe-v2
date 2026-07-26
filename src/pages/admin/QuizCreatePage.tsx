import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Checkbox,
  Collapse,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
  Typography,
  message,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components';
import { queryKeys } from '@/config/query-keys';
import { courseService, quizService, chapterService } from '@/services';
import { usePageTitle } from '@/hooks';

const { Text } = Typography;
const { TextArea } = Input;

interface QuestionInput {
  id?: string;
  content: string;
  points: number;
  options: { id?: string; content: string; isCorrect: boolean }[];
}

export default function QuizCreatePage() {
  usePageTitle('Tạo bài kiểm tra mới');

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [questions, setQuestions] = useState<QuestionInput[]>([]);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [questionForm] = Form.useForm();
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>();

  const { data: courses } = useQuery({
    queryKey: queryKeys.courses.list({ limit: 100 }),
    queryFn: () => courseService.getAll({ limit: 100 }),
  });

  const { data: chapters } = useQuery({
    queryKey: queryKeys.chapters.list({ courseId: selectedCourseId, page: 1, limit: 100 }),
    queryFn: () => chapterService.getAll({ courseId: selectedCourseId!, page: 1, limit: 100 }),
    enabled: !!selectedCourseId,
  });

  const createMutation = useMutation({
    mutationFn: async (values: {
      title: string;
      description?: string;
      type: string;
      duration?: number;
      isPublished: boolean;
      courseId?: string | null;
      chapterId?: string | null;
    }) => {
      return quizService.bulkCreate({
        ...values,
        duration: values.duration ? values.duration * 60 : undefined,
        passingScore: 100,
        questions: questions.map((q) => ({
          content: q.content,
          points: q.points,
          options: q.options.map((o) => ({
            content: o.content,
            isCorrect: o.isCorrect,
          })),
        })),
      });
    },
    onSuccess: (quiz) => {
      message.success('Tạo bài kiểm tra thành công');
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
      navigate(`/admin/quizzes/${quiz.id}`);
    },
    onError: () => message.error('Tạo bài kiểm tra thất bại'),
  });

  const handleSubmit = async () => {
    const values = await form.validateFields();
    createMutation.mutate(values);
  };

  const openCreateQuestion = () => {
    setEditingQuestionIndex(null);
    questionForm.setFieldsValue({
      content: '',
      points: 1,
      options: [
        { content: '', isCorrect: true },
        { content: '', isCorrect: false },
      ],
    });
    setQuestionModalOpen(true);
  };

  const openEditQuestion = (index: number) => {
    setEditingQuestionIndex(index);
    const q = questions[index];
    questionForm.setFieldsValue({
      content: q.content,
      points: q.points,
      options: q.options,
    });
    setQuestionModalOpen(true);
  };

  const handleQuestionSubmit = () => {
    questionForm.validateFields().then((values) => {
      const questionData: QuestionInput = {
        content: values.content,
        points: values.points,
        options: values.options || [],
      };

      if (editingQuestionIndex !== null) {
        const updated = [...questions];
        updated[editingQuestionIndex] = questionData;
        setQuestions(updated);
      } else {
        setQuestions([...questions, questionData]);
      }
      setQuestionModalOpen(false);
    });
  };

  const deleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

  const questionCollapseItems = questions.map((q, index) => ({
    key: index,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
        <span
          style={{
            background: '#1890ff',
            color: '#fff',
            borderRadius: 999,
            padding: '2px 8px',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {index + 1}
        </span>
        <Text style={{ flex: 1 }} ellipsis={{ tooltip: q.content }}>
          {q.content}
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {q.points} điểm
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {q.options.length} lựa chọn
        </Text>
        <Button
          icon={<EditOutlined />}
          size="small"
          type="text"
          onClick={(e) => {
            e.stopPropagation();
            openEditQuestion(index);
          }}
        />
        <Button
          danger
          icon={<DeleteOutlined />}
          size="small"
          type="text"
          onClick={(e) => {
            e.stopPropagation();
            deleteQuestion(index);
          }}
        />
      </div>
    ),
    children: (
      <div>
        {q.options.map((opt, optIdx) => (
          <div
            key={optIdx}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}
          >
            <Text style={{ fontWeight: 600, width: 24 }}>{OPTION_LABELS[optIdx]}</Text>
            {opt.isCorrect ? (
              <CheckCircleFilled style={{ color: '#16a34a' }} />
            ) : (
              <span style={{ color: '#d9d9d9' }}>○</span>
            )}
            <Text>{opt.content}</Text>
          </div>
        ))}
      </div>
    ),
  }));

  return (
    <div className="lms-quiz-create">
      <PageHeader
        actions={[
          {
            key: 'back',
            node: (
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/quizzes')}>
                Quay lại
              </Button>
            ),
          },
        ]}
        subtitle="Điền thông tin và thêm câu hỏi để tạo bài kiểm tra"
        title="Tạo bài kiểm tra mới"
      />

      <Form form={form} layout="vertical">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 380px',
            gap: 16,
            alignItems: 'start',
          }}
        >
          <div>
            <Card title="Thông tin bài kiểm tra" className="lms-admin-card">
              <Form.Item
                label="Tiêu đề"
                name="title"
                rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
              >
                <Input placeholder="VD: Bài kiểm tra chương 1 - JavaScript cơ bản" size="large" />
              </Form.Item>

              <Form.Item label="Mô tả" name="description">
                <TextArea placeholder="Mô tả bài kiểm tra (không bắt buộc)" rows={3} />
              </Form.Item>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Form.Item
                  label="Loại bài kiểm tra"
                  name="type"
                  rules={[{ required: true, message: 'Vui lòng chọn loại' }]}
                  initialValue="multiple_choice"
                >
                  <Select size="large">
                    <Select.Option value="multiple_choice">Trắc nghiệm</Select.Option>
                    <Select.Option value="coding">Coding</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item label="Thời gian (phút)" name="duration">
                  <InputNumber
                    min={0}
                    placeholder="VD: 15"
                    style={{ width: '100%' }}
                    size="large"
                  />
                </Form.Item>
              </div>

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
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Công khai bài kiểm tra</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    Cho phép học viên tìm thấy và làm bài kiểm tra
                  </div>
                </div>
                <Form.Item
                  name="isPublished"
                  valuePropName="checked"
                  initialValue={false}
                  style={{ margin: 0, flexShrink: 0 }}
                >
                  <Switch className="lms-custom-switch" />
                </Form.Item>
              </div>
            </Card>

            <Card
              title="Câu hỏi"
              className="lms-admin-card"
              style={{ marginTop: 16 }}
              extra={
                <Button icon={<PlusOutlined />} onClick={openCreateQuestion} type="primary">
                  Thêm câu hỏi
                </Button>
              }
            >
              {questions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Text type="secondary">
                    Chưa có câu hỏi nào. Hãy thêm câu hỏi cho bài kiểm tra.
                  </Text>
                </div>
              ) : (
                <Collapse items={questionCollapseItems} expandIconPosition="end" />
              )}
            </Card>
          </div>

          <div>
            <Card title="Liên kết" className="lms-admin-card">
              <Form.Item label="Khoá học" name="courseId">
                <Select
                  allowClear
                  placeholder="Chọn khoá học (không bắt buộc)"
                  size="large"
                  onChange={(val) => {
                    setSelectedCourseId(val);
                    form.setFieldValue('chapterId', undefined);
                  }}
                >
                  {(courses?.items ?? []).map((c) => (
                    <Select.Option key={c.id} value={c.id}>
                      {c.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label="Chương" name="chapterId">
                <Select
                  allowClear
                  placeholder="Chọn chương (không bắt buộc)"
                  size="large"
                  disabled={!selectedCourseId}
                >
                  {(chapters?.items ?? []).map((ch) => (
                    <Select.Option key={ch.id} value={ch.id}>
                      {ch.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Card>

            <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <Button size="large" onClick={() => navigate('/admin/quizzes')}>
                Huỷ
              </Button>
              <Button
                htmlType="button"
                loading={createMutation.isPending}
                onClick={handleSubmit}
                size="large"
                type="primary"
              >
                Tạo bài kiểm tra
              </Button>
            </div>
          </div>
        </div>
      </Form>

      <Modal
        cancelText="Huỷ"
        okText={editingQuestionIndex !== null ? 'Cập nhật' : 'Thêm'}
        onCancel={() => setQuestionModalOpen(false)}
        onOk={handleQuestionSubmit}
        open={questionModalOpen}
        title={editingQuestionIndex !== null ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới'}
        width={640}
      >
        <Form form={questionForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="Điểm số"
            name="points"
            rules={[{ required: true, message: 'Vui lòng nhập điểm' }]}
            initialValue={1}
            style={{ marginBottom: 12 }}
          >
            <InputNumber min={1} style={{ width: 120 }} />
          </Form.Item>

          <Form.Item
            label="Nội dung câu hỏi"
            name="content"
            rules={[{ required: true, message: 'Vui lòng nhập nội dung câu hỏi' }]}
          >
            <Input placeholder="Nhập nội dung câu hỏi" />
          </Form.Item>

          <div style={{ marginBottom: 8, fontWeight: 500, marginTop: 16 }}>Lựa chọn</div>
          <Form.List name="options">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <div
                    key={key}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}
                  >
                    <Form.Item
                      {...restField}
                      name={[name, 'content']}
                      rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}
                      style={{ flex: 1, margin: 0 }}
                    >
                      <Input placeholder="Nhập nội dung lựa chọn" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'isCorrect']}
                      valuePropName="checked"
                      style={{ margin: 0 }}
                    >
                      <Checkbox>
                        <CheckCircleOutlined style={{ color: '#16a34a' }} />
                      </Checkbox>
                    </Form.Item>
                    {fields.length > 2 && (
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                        onClick={() => remove(name)}
                      />
                    )}
                  </div>
                ))}
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => add({ content: '', isCorrect: false })}
                  style={{ width: '100%' }}
                >
                  Thêm lựa chọn
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}
