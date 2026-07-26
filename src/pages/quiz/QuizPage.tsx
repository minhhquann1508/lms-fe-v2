import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  Progress,
  Radio,
  Result,
  Spin,
  Typography,
  message as antMessage,
} from 'antd';
import {
  ClockCircleOutlined,
  LeftOutlined,
  RightOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { queryKeys } from '@/config/query-keys';
import { quizService } from '@/services';
import { usePageTitle } from '@/hooks';
import type { Quiz, QuizAttempt } from '@/types';

const { Title, Text, Paragraph } = Typography;

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface FlatQuestion {
  id: string;
  number: number;
  text: string;
  options: Array<{ id: string; label: string; text: string }>;
}

interface ResultDetails {
  attempt: QuizAttempt;
  questions: FlatQuestion[];
  correctMap: Record<string, string>;
}

function transformQuizData(quiz: Quiz): FlatQuestion[] {
  const sortedQuestions = (quiz.questions ?? []).slice().sort((a, b) => a.order - b.order);
  return sortedQuestions.map((q, idx) => ({
    id: q.id,
    number: idx + 1,
    text: q.content,
    options: (q.options ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((o, oIdx) => ({
        id: o.id,
        label: OPTION_LABELS[oIdx] || `${oIdx + 1}`,
        text: o.content,
      })),
  }));
}

function buildCorrectMap(quiz: Quiz): Record<string, string> {
  const map: Record<string, string> = {};
  for (const q of quiz.questions ?? []) {
    const correct = q.options?.find((o) => o.isCorrect);
    if (correct) {
      map[q.id] = correct.id;
    }
  }
  return map;
}

function QuestionNavigator({
  total,
  current,
  answers,
  questionIds,
  onNavigate,
}: {
  total: number;
  current: number;
  answers: Record<string, string>;
  questionIds: string[];
  onNavigate: (index: number) => void;
}) {
  return (
    <div className="lms-quiz-navigator">
      {Array.from({ length: total }, (_, i) => {
        const qNum = i + 1;
        const isAnswered = answers[questionIds[i]];
        const isActive = qNum === current;
        return (
          <button
            key={qNum}
            className={`lms-quiz-navigator__item ${isActive ? 'lms-quiz-navigator__item--active' : ''} ${isAnswered ? 'lms-quiz-navigator__item--answered' : ''}`}
            onClick={() => onNavigate(qNum)}
            type="button"
          >
            {isAnswered ? <CheckCircleOutlined /> : qNum}
          </button>
        );
      })}
    </div>
  );
}

function ResultScreen({
  result,
  durationMinutes,
}: {
  result: ResultDetails;
  durationMinutes: number;
}) {
  const navigate = useNavigate();
  const { attempt, questions, correctMap } = result;
  const totalQuestions = questions.length;
  const correctCount = attempt.answers.filter((a) => a.isCorrect === true).length;

  return (
    <div className="lms-quiz-result">
      <Card className="lms-quiz-result__card">
        <div className="lms-quiz-result__icon">
          {attempt.scorePercentage !== null && attempt.scorePercentage >= 50 ? (
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 64 }} />
          ) : (
            <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 64 }} />
          )}
        </div>
        <Title level={2} className="lms-quiz-result__title">
          {attempt.scorePercentage !== null && attempt.scorePercentage >= 50
            ? 'Chúc mừng bạn đã vượt qua!'
            : 'Bài kiểm tra chưa đạt yêu cầu'}
        </Title>
        <div className="lms-quiz-result__score">
          <Text
            style={{
              fontSize: 48,
              fontWeight: 700,
              color:
                attempt.scorePercentage !== null && attempt.scorePercentage >= 50
                  ? '#52c41a'
                  : '#ff4d4f',
            }}
          >
            {attempt.scorePercentage !== null ? `${attempt.scorePercentage}%` : '--'}
          </Text>
        </div>
        <div className="lms-quiz-result__stats">
          <div className="lms-quiz-result__stat">
            <Text className="lms-quiz-result__stat-value">
              {correctCount}/{totalQuestions}
            </Text>
            <Text className="lms-quiz-result__stat-label">Câu đúng</Text>
          </div>
          <div className="lms-quiz-result__stat">
            <Text className="lms-quiz-result__stat-value">
              {attempt.score}/{attempt.totalPoints}
            </Text>
            <Text className="lms-quiz-result__stat-label">Điểm</Text>
          </div>
          <div className="lms-quiz-result__stat">
            <Text className="lms-quiz-result__stat-value">{durationMinutes} phút</Text>
            <Text className="lms-quiz-result__stat-label">Thời gian</Text>
          </div>
        </div>

        <div style={{ marginTop: 24, textAlign: 'left' }}>
          <Title level={4}>Chi tiết câu hỏi</Title>
          {questions.map((q, idx) => {
            const answer = attempt.answers.find((a) => a.questionId === q.id);
            const correctOptionId = correctMap[q.id];
            const isCorrect = answer?.isCorrect === true;
            return (
              <Card
                key={q.id}
                size="small"
                style={{
                  marginBottom: 12,
                  borderLeft: `4px solid ${isCorrect ? '#52c41a' : '#ff4d4f'}`,
                }}
              >
                <Text strong>
                  Câu {q.number}: {q.text}
                </Text>
                <div style={{ marginTop: 8 }}>
                  {q.options.map((opt) => {
                    const isSelected = answer?.selectedOptionId === opt.id;
                    const isRight = correctOptionId === opt.id;
                    let color = undefined;
                    if (isRight) color = '#52c41a';
                    else if (isSelected && !isRight) color = '#ff4d4f';
                    return (
                      <div
                        key={opt.id}
                        style={{
                          padding: '4px 8px',
                          marginBottom: 4,
                          borderRadius: 4,
                          background: isSelected || isRight ? '#f5f5f5' : undefined,
                          color,
                          fontWeight: isRight ? 600 : undefined,
                        }}
                      >
                        {opt.label}. {opt.text}
                        {isRight && <CheckCircleOutlined style={{ marginLeft: 8 }} />}
                        {isSelected && !isRight && (
                          <CloseCircleOutlined style={{ marginLeft: 8 }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>

        <Button
          className="lms-quiz-result__btn"
          type="primary"
          onClick={() => navigate(-1)}
          style={{ marginTop: 16 }}
        >
          Quay lại
        </Button>
      </Card>
    </div>
  );
}

export default function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  usePageTitle('Bài kiểm tra');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ResultDetails | null>(null);
  const [totalSeconds, setTotalSeconds] = useState(0);

  const {
    data: apiQuiz,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.quizzes.detail(quizId!),
    queryFn: () => quizService.getById(quizId!),
    enabled: !!quizId,
    retry: 1,
  });

  const startAttemptMutation = useMutation({
    mutationFn: () => quizService.startAttempt(quizId!),
    onError: () => {
      antMessage.error('Không thể bắt đầu bài kiểm tra');
    },
  });

  const submitMutation = useMutation({
    mutationFn: (payload: { questionId: string; selectedOptionId: string }[]) =>
      quizService.submitAttempt(quizId!, startAttemptMutation.data!.id, payload),
    onSuccess: (attempt) => {
      if (!apiQuiz) return;
      const questions = transformQuizData(apiQuiz);
      const correctMap = buildCorrectMap(apiQuiz);
      setResult({ attempt, questions, correctMap });
    },
    onError: () => {
      antMessage.error('Không thể nộp bài kiểm tra');
    },
  });

  useEffect(() => {
    if (quizId && !startAttemptMutation.data && !startAttemptMutation.isPending) {
      startAttemptMutation.mutate();
    }
  }, [quizId]);

  const questions = useMemo(() => {
    if (!apiQuiz) return [];
    return transformQuizData(apiQuiz);
  }, [apiQuiz]);

  const durationMinutes = useMemo(() => {
    if (!apiQuiz?.duration) return 0;
    return Math.round(apiQuiz.duration / 60);
  }, [apiQuiz]);

  useEffect(() => {
    if (durationMinutes > 0) {
      setTotalSeconds(durationMinutes * 60);
    }
  }, [durationMinutes]);

  useEffect(() => {
    if (totalSeconds <= 0 || result) return;
    const timer = setInterval(() => {
      setTotalSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [totalSeconds, result]);

  useEffect(() => {
    if (totalSeconds === 0 && durationMinutes > 0 && !result && startAttemptMutation.data) {
      const allAnswers = questions.map((q) => ({
        questionId: q.id,
        selectedOptionId: answers[q.id] || '',
      }));
      submitMutation.mutate(allAnswers);
    }
  }, [totalSeconds]);

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handleSubmit = useCallback(() => {
    if (!startAttemptMutation.data) return;
    const allAnswers = questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: answers[q.id] || '',
    }));
    submitMutation.mutate(allAnswers);
  }, [questions, answers, startAttemptMutation.data]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (isLoading || startAttemptMutation.isPending) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError || !apiQuiz) {
    return (
      <Result
        status="error"
        subTitle="Không thể tải bài kiểm tra. Vui lòng thử lại sau."
        title="Có lỗi xảy ra"
      />
    );
  }

  if (result) {
    return <ResultScreen result={result} durationMinutes={durationMinutes} />;
  }

  if (!currentQuestion) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="lms-quiz">
      <div className="lms-quiz__header">
        <div className="lms-quiz__header-left">
          <Title level={3} className="lms-quiz__title">
            {apiQuiz.title}
          </Title>
          <div className="lms-quiz__progress-label">
            Câu {currentQuestion.number} / {questions.length}
          </div>
        </div>
        <div className="lms-quiz__header-right">
          {durationMinutes > 0 ? (
            <div className="lms-quiz__timer">
              <ClockCircleOutlined />
              <span
                className={`lms-quiz__timer-value ${totalSeconds < 120 ? 'lms-quiz__timer-value--warning' : ''}`}
              >
                {formatTime(totalSeconds)}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="lms-quiz__layout">
        <div className="lms-quiz__main">
          <Card className="lms-quiz__question-card">
            <div className="lms-quiz__question-number">Câu {currentQuestion.number}</div>
            <Paragraph className="lms-quiz__question-text">{currentQuestion.text}</Paragraph>

            <Radio.Group
              className="lms-quiz__options"
              onChange={(e) => handleSelectOption(currentQuestion.id, e.target.value)}
              value={answers[currentQuestion.id]}
            >
              {currentQuestion.options.map((option) => (
                <div key={option.id} className="lms-quiz__option">
                  <Radio className="lms-quiz__option-radio" value={option.id}>
                    <span className="lms-quiz__option-label">{option.label}.</span>
                    <span className="lms-quiz__option-text">{option.text}</span>
                  </Radio>
                </div>
              ))}
            </Radio.Group>

            <div className="lms-quiz__nav">
              <Button
                disabled={currentIndex === 0}
                icon={<LeftOutlined />}
                onClick={handlePrev}
                size="large"
              >
                Câu trước
              </Button>
              {currentIndex < questions.length - 1 ? (
                <Button icon={<RightOutlined />} onClick={handleNext} size="large" type="primary">
                  Câu sau
                </Button>
              ) : (
                <Button
                  className="lms-quiz__submit-btn"
                  disabled={answeredCount < questions.length}
                  loading={submitMutation.isPending}
                  onClick={handleSubmit}
                  size="large"
                  type="primary"
                >
                  Nộp bài
                </Button>
              )}
            </div>
          </Card>
        </div>

        <div className="lms-quiz__sidebar">
          <Card className="lms-quiz__sidebar-card" title="Điều hướng">
            <div className="lms-quiz__sidebar-progress">
              <Text type="secondary">
                Đã trả lời:{' '}
                <strong>
                  {answeredCount}/{questions.length}
                </strong>
              </Text>
              <Progress
                percent={Math.round((answeredCount / questions.length) * 100)}
                showInfo={false}
                size="small"
              />
            </div>
            <QuestionNavigator
              answers={answers}
              current={currentQuestion.number}
              questionIds={questions.map((q) => q.id)}
              total={questions.length}
              onNavigate={(num) => setCurrentIndex(num - 1)}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
