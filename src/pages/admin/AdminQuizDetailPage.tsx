import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Card, Collapse, Result, Spin, Tag, Typography, Space } from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components';
import { queryKeys } from '@/config/query-keys';
import { quizService } from '@/services';
import { usePageTitle } from '@/hooks';
import { colors } from '@/config/theme';

const { Text, Paragraph } = Typography;

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function AdminQuizDetailPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const {
    data: quiz,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.quizzes.detail(quizId!),
    queryFn: () => quizService.getById(quizId!),
    enabled: !!quizId,
  });

  usePageTitle(quiz?.title ?? 'Chi tiết bài kiểm tra');

  const fullQuestions = (quiz?.questions ?? []).sort((a, b) => a.order - b.order);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }
  if (isError) {
    return (
      <Result
        extra={<Button onClick={() => refetch()}>Thử lại</Button>}
        status="error"
        title="Không thể tải bài kiểm tra"
      />
    );
  }
  if (!quiz) {
    return <Result status="404" title="Không tìm thấy bài kiểm tra" />;
  }

  const collapseItems = fullQuestions.map((question, index) => ({
    key: question.id,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', minWidth: 0 }}>
        <span
          style={{
            background: colors['brand-blue'],
            color: '#fff',
            borderRadius: 999,
            padding: '2px 10px',
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {index + 1}
        </span>
        <Text style={{ flex: 1, minWidth: 0 }} ellipsis={{ tooltip: question.content }}>
          {question.content}
        </Text>
        <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>
          {question.points} điểm
        </Text>
        <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>
          {question.options?.length ?? 0} lựa chọn
        </Text>
      </div>
    ),
    children: (
      <div style={{ padding: '8px 4px' }}>
        {!question.options || question.options.length === 0 ? (
          <Text type="secondary" style={{ fontStyle: 'italic' }}>
            Chưa có lựa chọn nào
          </Text>
        ) : (
          [...question.options]
            .sort((a, b) => a.order - b.order)
            .map((opt, idx) => (
              <div
                key={opt.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 0',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <Text
                  style={{
                    fontWeight: 700,
                    width: 28,
                    flexShrink: 0,
                    fontSize: 13,
                    color: colors['brand-blue'],
                  }}
                >
                  {OPTION_LABELS[idx] || idx + 1}
                </Text>
                {opt.isCorrect ? (
                  <CheckCircleFilled style={{ color: '#16a34a', fontSize: 16, flexShrink: 0 }} />
                ) : (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 16,
                      height: 16,
                      border: '2px solid #d9d9d9',
                      borderRadius: '50%',
                      flexShrink: 0,
                    }}
                  />
                )}
                <Text style={{ flex: 1, minWidth: 0 }} ellipsis={{ tooltip: opt.content }}>
                  {opt.content}
                </Text>
              </div>
            ))
        )}
      </div>
    ),
  }));

  return (
    <div>
      <PageHeader
        actions={[
          {
            key: 'edit-quiz',
            node: (
              <Button
                icon={<SettingOutlined />}
                onClick={() => navigate(`/admin/quizzes/${quizId}/edit`)}
                size="large"
              >
                Chỉnh sửa
              </Button>
            ),
          },
        ]}
        breadcrumb={
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/admin/quizzes')}
            style={{ padding: 0 }}
            type="link"
          >
            Danh sách bài kiểm tra
          </Button>
        }
        subtitle={quiz.description || undefined}
        title={quiz.title}
      />

      <Space size={[8, 8]} wrap style={{ marginBottom: 20 }}>
        <Tag color={quiz.type === 'coding' ? 'purple' : 'blue'} style={{ margin: 0 }}>
          {quiz.type === 'coding' ? 'Coding' : 'Trắc nghiệm'}
        </Tag>
        <Tag icon={<QuestionCircleOutlined />} color="default" style={{ margin: 0 }}>
          {fullQuestions.length} câu hỏi
        </Tag>
        {quiz.duration ? (
          <Tag icon={<ClockCircleOutlined />} color="default" style={{ margin: 0 }}>
            {Math.round(quiz.duration / 60)} phút
          </Tag>
        ) : null}
        {quiz.passingScore ? (
          <Tag color="green" style={{ margin: 0 }}>
            Đạt {quiz.passingScore}%
          </Tag>
        ) : null}
        <Badge
          status={quiz.isPublished ? 'success' : 'default'}
          text={quiz.isPublished ? 'Đã xuất bản' : 'Nháp'}
        />
      </Space>

      <Card
        className="lms-admin-quiz-detail__questions-card"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <QuestionCircleOutlined />
            <span>Danh sách câu hỏi</span>
            <Tag style={{ borderRadius: 999 }}>{fullQuestions.length}</Tag>
          </div>
        }
      >
        {fullQuestions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <QuestionCircleOutlined
              style={{ fontSize: 48, color: colors.steel, marginBottom: 16 }}
            />
            <Paragraph type="secondary">Bài kiểm tra chưa có câu hỏi nào.</Paragraph>
          </div>
        ) : (
          <Collapse
            className="lms-admin-quiz-detail__collapse"
            expandIconPosition="end"
            items={collapseItems}
          />
        )}
      </Card>
    </div>
  );
}
