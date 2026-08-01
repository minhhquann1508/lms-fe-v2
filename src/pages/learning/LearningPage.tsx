import {
  startTransition,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Button, Drawer, Empty, Result, Typography, message } from 'antd';
import {
  BookOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  FileTextOutlined,
  MenuUnfoldOutlined,
  PlayCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { ErrorState } from '@/components';
import { queryKeys } from '@/config/query-keys';
import { useBreakpoint, usePageTitle } from '@/hooks';
import { enrollmentService, lectureProgressService, quizService } from '@/services';
import { isApiError } from '@/utils/api-error';
import { buildBunnyEmbedUrl } from './bunny-embed-url';
import type { UpdateEnrollmentLearningStatePayload } from '@/services/enrollment.service';
import type {
  Chapter,
  Enrollment,
  EnrollmentLearningNote,
  Lecture,
  EnrollmentLectureProgressSnapshot,
  LectureProgressAction,
  LectureProgressItem,
} from '@/types';

const { Text, Paragraph } = Typography;

const PLAYER_JS_URL = 'https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js';
const AUTO_ADVANCE_MESSAGE_KEY = 'learning-auto-advance';
const DEFAULT_LEARNING_STATE = { version: 1 as const, activeLectureId: null, notes: [] };

interface LearningLecture extends Lecture {
  chapterName: string;
  chapterOrder: number;
}

interface LearningChapter extends Chapter {
  lectures: LearningLecture[];
}

let playerScriptPromise: Promise<void> | null = null;

function loadBunnyPlayerScript(): Promise<void> {
  if (window.playerjs) return Promise.resolve();
  if (!playerScriptPromise) {
    playerScriptPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${PLAYER_JS_URL}"]`,
      );
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener(
          'error',
          () => reject(new Error('Không tải được Bunny player SDK.')),
          { once: true },
        );
        return;
      }
      const script = document.createElement('script');
      script.src = PLAYER_JS_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Không tải được Bunny player SDK.'));
      document.head.appendChild(script);
    }).catch((error) => {
      playerScriptPromise = null;
      throw error;
    });
  }
  return playerScriptPromise ?? Promise.resolve();
}

function formatTimestamp(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDurationLabel(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  if (seconds === 0) return 'Chưa có thời lượng';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} giờ ${m} phút`;
  if (m > 0) return `${m} phút`;
  return `${seconds} giây`;
}

function getCompletionThreshold(duration: number): number {
  if (duration <= 0) return Number.POSITIVE_INFINITY;
  return Math.max(duration - 5, duration * 0.95);
}

export function shouldSyncLectureTimeUpdate(
  watchedSeconds: number,
  duration: number,
  lastSyncedSeconds: number,
): boolean {
  const nextSeconds = Math.max(0, Math.floor(watchedSeconds));
  const nextDuration = Math.max(0, Math.floor(duration));
  if (nextSeconds === 0) return false;
  if (nextDuration > 0 && nextSeconds >= getCompletionThreshold(nextDuration)) return true;
  return nextSeconds >= nextDuration || nextSeconds - lastSyncedSeconds >= 10;
}

export function resolveInitialLectureId(
  lectures: LearningLecture[],
  activeLectureId: string | null | undefined,
  progressMap: Map<string, LectureProgressItem>,
): string | null {
  if (!lectures.length) return null;
  if (activeLectureId && lectures.some((l) => l.id === activeLectureId)) return activeLectureId;
  const firstInProgress = lectures.find((l) => {
    const p = progressMap.get(l.id);
    return p && !p.isCompleted && p.watchedSeconds > 0;
  });
  if (firstInProgress) return firstInProgress.id;
  const firstIncomplete = lectures.find((l) => !progressMap.get(l.id)?.isCompleted);
  return firstIncomplete?.id ?? lectures[0].id;
}

export default function LearningPage() {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const queryClient = useQueryClient();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';

  const [activeLectureId, setActiveLectureId] = useState<string | null>(null);
  const [lessonDrawerOpen, setLessonDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [noteDraft, setNoteDraft] = useState('');
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
  const [playerTelemetry, setPlayerTelemetry] = useState({ currentTime: 0, duration: 0 });

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerRef = useRef<BunnyPlayerInstance | null>(null);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const pendingSeekRef = useRef<{ lectureId: string; seconds: number } | null>(null);
  const resumedLectureIdsRef = useRef(new Set<string>());
  const lastSyncedSecondsRef = useRef(new Map<string, number>());

  const enrollmentQuery = useQuery({
    queryKey: queryKeys.enrollments.detail(enrollmentId!),
    queryFn: () => enrollmentService.getById(enrollmentId!),
    enabled: !!enrollmentId,
  });

  const progressQuery = useQuery({
    queryKey: queryKeys.progress.enrollment(enrollmentId!),
    queryFn: () => lectureProgressService.getByEnrollment(enrollmentId!),
    enabled: !!enrollmentId,
  });

  const enrollment = enrollmentQuery.data;
  const progressSnapshot = progressQuery.data;

  usePageTitle(enrollment?.course?.name ? `${enrollment.course.name} | Học tập` : 'Học tập');

  const learningStateMutation = useMutation({
    mutationFn: ({
      targetEnrollmentId,
      payload,
    }: {
      targetEnrollmentId: string;
      payload: UpdateEnrollmentLearningStatePayload;
    }) => enrollmentService.updateLearningState(targetEnrollmentId, payload),
    onSuccess: (updatedEnrollment) => {
      if (!enrollmentId) return;
      queryClient.setQueryData<Enrollment | undefined>(
        queryKeys.enrollments.detail(enrollmentId),
        (current) => {
          if (!current) return updatedEnrollment;
          const updatedHasLectures = updatedEnrollment.course?.chapters?.some(
            (c) => (c.lectures?.length ?? 0) > 0,
          );
          return {
            ...current,
            ...updatedEnrollment,
            course: updatedHasLectures ? updatedEnrollment.course : current.course,
          };
        },
      );
    },
  });

  const orderedChapters = useMemo<LearningChapter[]>(() => {
    return (enrollment?.course?.chapters ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((chapter) => ({
        ...chapter,
        lectures: (chapter.lectures ?? [])
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((lecture) => ({
            ...lecture,
            chapterName: chapter.name,
            chapterOrder: chapter.order,
          })),
      }));
  }, [enrollment]);

  const allLectures = useMemo(() => orderedChapters.flatMap((c) => c.lectures), [orderedChapters]);

  const progressMap = useMemo(() => {
    const map = new Map<string, LectureProgressItem>();
    progressSnapshot?.lectureProgresses.forEach((p) => map.set(p.lectureId, p));
    return map;
  }, [progressSnapshot]);

  const learningState = enrollment?.learningState ?? DEFAULT_LEARNING_STATE;
  const overallProgress = progressSnapshot?.progress ?? enrollment?.progress ?? 0;
  const completedLectureCount =
    progressSnapshot?.completedLectures ??
    Array.from(progressMap.values()).filter((p) => p.isCompleted).length;
  const totalLectures = progressSnapshot?.totalLectures ?? allLectures.length;

  useEffect(() => {
    if (!allLectures.length) return;
    if (activeLectureId && allLectures.some((l) => l.id === activeLectureId)) return;
    setActiveLectureId(
      resolveInitialLectureId(allLectures, learningState.activeLectureId, progressMap),
    );
  }, [activeLectureId, allLectures, learningState.activeLectureId, progressMap]);

  const currentLecture = useMemo(
    () => allLectures.find((l) => l.id === activeLectureId) ?? null,
    [activeLectureId, allLectures],
  );
  const bunnyEmbedUrl = useMemo(() => buildBunnyEmbedUrl(currentLecture), [currentLecture]);
  const currentLectureProgress = currentLecture ? progressMap.get(currentLecture.id) : undefined;

  const currentLectureSeconds = Math.max(
    currentLectureProgress?.watchedSeconds ?? 0,
    Math.floor(playerTelemetry.currentTime),
  );

  const syncMutation = useMutation({
    mutationFn: lectureProgressService.sync,
    onSuccess: (snapshot, variables) => {
      if (!enrollmentId) return;
      const previousSnapshot = queryClient.getQueryData<EnrollmentLectureProgressSnapshot>(
        queryKeys.progress.enrollment(enrollmentId),
      );
      const wasCompleted =
        previousSnapshot?.lectureProgresses.some(
          (p) => p.lectureId === variables.lectureId && p.isCompleted,
        ) ??
        progressMap.get(variables.lectureId)?.isCompleted ??
        false;
      const isNowCompleted = snapshot.lectureProgresses.some(
        (p) => p.lectureId === variables.lectureId && p.isCompleted,
      );
      queryClient.setQueryData(queryKeys.progress.enrollment(enrollmentId), snapshot);
      queryClient.setQueryData<Enrollment | undefined>(
        queryKeys.enrollments.detail(enrollmentId),
        (c) => (c ? { ...c, progress: snapshot.progress, completedAt: snapshot.completedAt } : c),
      );
      if (isNowCompleted && !wasCompleted) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.progress.enrollment(enrollmentId),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.enrollments.detail(enrollmentId),
        });
        if (variables.lectureId === currentLecture?.id) setAutoAdvanceCountdown(5);
      }
    },
    onError: (_e, v) => {
      if (v.action !== 'timeupdate') message.error('Không thể đồng bộ tiến độ bài học lúc này');
    },
  });

  const quizId = currentLecture?.quizId;
  const courseId = enrollment?.course?.id;

  const courseQuizzesQuery = useQuery({
    queryKey: queryKeys.quizzes.list({ courseId }),
    queryFn: () => quizService.getAll({ courseId, limit: 50 }),
    enabled: !!courseId,
  });
  const lectureQuizQuery = useQuery({
    queryKey: queryKeys.quizzes.detail(quizId!),
    queryFn: () => quizService.getById(quizId!),
    enabled: !!quizId,
  });
  const myAttemptsQuery = useQuery({
    queryKey: [...queryKeys.quizzes.all, 'attempts', 'my', quizId],
    queryFn: () => quizService.getMyAttempts(quizId!),
    enabled: !!quizId,
  });

  const lectureQuiz = quizId ? lectureQuizQuery.data : null;
  const courseQuizzes = courseQuizzesQuery.data?.items ?? [];
  const latestAttempt = myAttemptsQuery.data?.find((a) => a.status === 'completed');

  const persistLearningState = useCallback(
    async (
      payload: UpdateEnrollmentLearningStatePayload,
      options?: { successMessage?: string; showError?: boolean },
    ) => {
      if (!enrollmentId) return null;
      try {
        const updated = await learningStateMutation.mutateAsync({
          targetEnrollmentId: enrollmentId,
          payload,
        });
        if (options?.successMessage) message.success(options.successMessage);
        return updated;
      } catch {
        if (options?.showError ?? true) message.error('Không thể lưu trạng thái học lúc này');
        return null;
      }
    },
    [enrollmentId, learningStateMutation],
  );

  const selectLecture = useCallback(
    (lectureId: string) => {
      startTransition(() => setActiveLectureId(lectureId));
      setLessonDrawerOpen(false);
      setAutoAdvanceCountdown(null);
      void persistLearningState({ activeLectureId: lectureId }, { showError: false });
    },
    [persistLearningState],
  );

  const syncProgress = useCallback(
    (action: LectureProgressAction, watchedSeconds: number, duration?: number) => {
      if (!enrollmentId || !currentLecture) return;
      syncMutation.mutate({
        action,
        enrollmentId,
        lectureId: currentLecture.id,
        watchedSeconds: Math.max(0, Math.floor(watchedSeconds)),
        duration: duration && duration > 0 ? Math.floor(duration) : currentLecture.duration,
      });
    },
    [currentLecture, enrollmentId, syncMutation],
  );

  const maybeSyncTimeUpdate = useEffectEvent((watchedSeconds: number, duration: number) => {
    if (!currentLecture) return;
    const nextSeconds = Math.max(0, Math.floor(watchedSeconds));
    const lastSynced = lastSyncedSecondsRef.current.get(currentLecture.id) ?? 0;
    if (!shouldSyncLectureTimeUpdate(nextSeconds, duration, lastSynced)) return;
    lastSyncedSecondsRef.current.set(currentLecture.id, nextSeconds);
    syncProgress('timeupdate', nextSeconds, duration);
  });

  const handlePlayerReady = useEffectEvent((player: BunnyPlayerInstance) => {
    if (!currentLecture) return;
    setPlayerError(null);
    player.getDuration((reportedDuration) => {
      const nextDuration = Math.max(
        0,
        Math.floor(reportedDuration ?? currentLecture.duration ?? 0),
      );
      durationRef.current = nextDuration;
      setPlayerTelemetry((prev) => ({ ...prev, duration: nextDuration }));
      const pendingSeek = pendingSeekRef.current;
      if (pendingSeek?.lectureId === currentLecture.id) {
        player.setCurrentTime(pendingSeek.seconds);
        currentTimeRef.current = pendingSeek.seconds;
        setPlayerTelemetry((prev) => ({ ...prev, currentTime: pendingSeek.seconds }));
        pendingSeekRef.current = null;
        return;
      }
      if (
        currentLectureProgress?.watchedSeconds &&
        currentLectureProgress.watchedSeconds > 5 &&
        !currentLectureProgress.isCompleted &&
        !resumedLectureIdsRef.current.has(currentLecture.id)
      ) {
        const resumeAt = Math.min(
          currentLectureProgress.watchedSeconds,
          nextDuration > 3 ? Math.max(nextDuration - 3, 0) : currentLectureProgress.watchedSeconds,
        );
        player.setCurrentTime(resumeAt);
        currentTimeRef.current = resumeAt;
        setPlayerTelemetry((prev) => ({ ...prev, currentTime: resumeAt }));
        resumedLectureIdsRef.current.add(currentLecture.id);
      }
    });
  });

  const handlePlayerTimeUpdate = useEffectEvent((data?: BunnyPlayerTimeUpdateData) => {
    const t = Math.max(0, Math.floor(data?.seconds ?? currentTimeRef.current));
    const d = Math.max(0, Math.floor(data?.duration ?? durationRef.current));
    currentTimeRef.current = t;
    durationRef.current = d;
    setPlayerTelemetry((prev) => ({ ...prev, currentTime: t, duration: d || prev.duration }));
    maybeSyncTimeUpdate(t, d || currentLecture?.duration || 0);
  });

  const handlePlayerEnded = useEffectEvent(() => {
    const finishedDuration =
      durationRef.current || currentLecture?.duration || currentTimeRef.current;
    currentTimeRef.current = finishedDuration;
    setPlayerTelemetry((prev) => ({
      ...prev,
      currentTime: finishedDuration,
      duration: finishedDuration,
    }));
    syncProgress('ended', finishedDuration, finishedDuration);
  });

  useEffect(() => {
    if (!currentLecture) {
      setPlayerTelemetry({ currentTime: 0, duration: 0 });
      return;
    }
    currentTimeRef.current = currentLectureProgress?.watchedSeconds ?? 0;
    durationRef.current = currentLecture.duration ?? 0;
    setPlayerTelemetry({
      currentTime: currentLectureProgress?.watchedSeconds ?? 0,
      duration: currentLecture.duration ?? 0,
    });
    setPlayerError(null);
    setAutoAdvanceCountdown(null);
  }, [currentLecture?.id]);

  useEffect(() => {
    const iframeElement = iframeRef.current;
    if (!iframeElement || !bunnyEmbedUrl) {
      playerRef.current = null;
      return;
    }
    let isCancelled = false;
    let player: BunnyPlayerInstance | null = null;
    const attachPlayer = async () => {
      try {
        await loadBunnyPlayerScript();
        if (isCancelled || !iframeRef.current || !window.playerjs) return;
        player = new window.playerjs.Player(iframeRef.current);
        playerRef.current = player;
        player.on('ready', () => handlePlayerReady(player as BunnyPlayerInstance));
        player.on('timeupdate', handlePlayerTimeUpdate);
        player.on('ended', handlePlayerEnded);
      } catch (error) {
        if (isCancelled) return;
        setPlayerError(error instanceof Error ? error.message : 'Không thể khởi tạo video player.');
      }
    };
    void attachPlayer();
    return () => {
      isCancelled = true;
      if (player) {
        player.off('ready');
        player.off('timeupdate');
        player.off('ended');
      }
      if (playerRef.current === player) playerRef.current = null;
    };
  }, [
    bunnyEmbedUrl,
    currentLecture?.id,
    handlePlayerEnded,
    handlePlayerReady,
    handlePlayerTimeUpdate,
  ]);

  useEffect(() => {
    if (!autoAdvanceCountdown || !currentLecture) return;
    if (autoAdvanceCountdown <= 1) {
      const next = allLectures.find(
        (l) => l.id !== currentLecture.id && !progressMap.get(l.id)?.isCompleted,
      );
      if (next) selectLecture(next.id);
      return;
    }
    const timer = window.setTimeout(
      () => setAutoAdvanceCountdown((prev) => (prev ? prev - 1 : prev)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [autoAdvanceCountdown, currentLecture, allLectures, progressMap, selectLecture]);

  useEffect(() => {
    if (!autoAdvanceCountdown) {
      message.destroy(AUTO_ADVANCE_MESSAGE_KEY);
      return;
    }
    message.open({
      key: AUTO_ADVANCE_MESSAGE_KEY,
      type: 'success',
      content: `Sẽ chuyển bài sau ${autoAdvanceCountdown}...`,
      duration: 0,
    });
  }, [autoAdvanceCountdown]);

  useEffect(
    () => () => {
      message.destroy(AUTO_ADVANCE_MESSAGE_KEY);
    },
    [],
  );

  const currentLectureNotes = useMemo(
    () =>
      learningState.notes
        .filter((n) => n.lectureId === currentLecture?.id)
        .slice()
        .sort((a, b) => a.timestampSeconds - b.timestampSeconds),
    [currentLecture?.id, learningState.notes],
  );

  const otherLectureNotes = useMemo(
    () =>
      learningState.notes
        .filter((n) => n.lectureId !== currentLecture?.id)
        .slice()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [currentLecture?.id, learningState.notes],
  );

  const handleAddNote = async () => {
    if (!currentLecture) return;
    const content = noteDraft.trim();
    if (!content) {
      message.info('Thêm nội dung ghi chú trước khi lưu');
      return;
    }
    const now = new Date().toISOString();
    const nextNotes = [
      ...learningState.notes,
      {
        id: crypto.randomUUID(),
        lectureId: currentLecture.id,
        content,
        timestampSeconds: currentLectureSeconds,
        createdAt: now,
        updatedAt: now,
      },
    ];
    const updated = await persistLearningState(
      { activeLectureId: currentLecture.id, notes: nextNotes },
      { successMessage: 'Đã lưu ghi chú' },
    );
    if (updated) {
      setNoteDraft('');
      setActiveTab('notes');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const nextNotes = learningState.notes.filter((n) => n.id !== noteId);
    await persistLearningState(
      { activeLectureId: activeLectureId ?? undefined, notes: nextNotes },
      { successMessage: 'Đã xoá ghi chú' },
    );
  };

  const handleJumpToNote = (note: EnrollmentLearningNote) => {
    if (note.lectureId !== currentLecture?.id) {
      pendingSeekRef.current = { lectureId: note.lectureId, seconds: note.timestampSeconds };
      selectLecture(note.lectureId);
      return;
    }
    playerRef.current?.setCurrentTime(note.timestampSeconds);
    currentTimeRef.current = note.timestampSeconds;
    setPlayerTelemetry((prev) => ({ ...prev, currentTime: note.timestampSeconds }));
  };

  if (enrollmentQuery.isLoading)
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}
      >
        Đang tải...
      </div>
    );
  if (enrollmentQuery.isError) {
    if (isApiError(enrollmentQuery.error) && enrollmentQuery.error.statusCode === 403) {
      return (
        <Result
          extra={
            <Button href="/profile" type="primary">
              Xem trạng thái ghi danh
            </Button>
          }
          status="warning"
          subTitle="Khoá học này cần được giảng viên hoặc quản trị viên duyệt trước khi bạn có thể vào học."
          title="Yêu cầu ghi danh của bạn chưa được chấp nhận"
        />
      );
    }
    return <ErrorState onRetry={() => enrollmentQuery.refetch()} />;
  }
  if (!enrollment) return <Result status="404" title="Không tìm thấy đăng ký học" />;

  const sidebarContent = (
    <>
      <div className="lms-learning-sidebar__brand">
        <span className="lms-learning-sidebar__logo">
          <BookOutlined />
        </span>
        <span className="lms-learning-sidebar__course">{enrollment.course?.name}</span>
      </div>
      <div className="lms-learning-sidebar__hero">
        <div className="lms-learning-sidebar__eyebrow">Đang học</div>
        <div className="lms-learning-sidebar__progress-row">
          <span className="lms-learning-sidebar__progress-label">
            {completedLectureCount}/{totalLectures} bài
          </span>
          <span className="lms-learning-sidebar__progress-pct">{overallProgress}%</span>
        </div>
        <div className="lms-learning-sidebar__progress-bar">
          <div
            className="lms-learning-sidebar__progress-fill"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>
      <div className="lms-learning-sidebar__chapters">
        {orderedChapters.map((chapter, chIndex) => {
          return (
            <div className="lms-learning-chapter lms-learning-chapter--open" key={chapter.id}>
              <button
                className="lms-learning-chapter__trigger"
                onClick={(e) => {
                  const el = e.currentTarget.parentElement!;
                  el.classList.toggle('lms-learning-chapter--open');
                }}
              >
                <span className="lms-learning-chapter__arrow">▶</span>
                <span className="lms-learning-chapter__title">
                  Chương {chIndex + 1}: {chapter.name}
                </span>
                <span className="lms-learning-chapter__count">{chapter.lectures.length} bài</span>
              </button>
              <div className="lms-learning-chapter__lectures">
                {chapter.lectures.map((lecture) => {
                  const p = progressMap.get(lecture.id);
                  const isActive = lecture.id === currentLecture?.id;
                  const isDone = p?.isCompleted;
                  const watchedPct =
                    lecture.duration > 0
                      ? Math.min(
                          100,
                          Math.round(((p?.watchedSeconds ?? 0) / lecture.duration) * 100),
                        )
                      : isDone
                        ? 100
                        : 0;
                  return (
                    <button
                      key={lecture.id}
                      type="button"
                      className={`lms-learning-lecture ${isActive ? 'lms-learning-lecture--active' : ''} ${isDone ? 'lms-learning-lecture--done' : ''}`}
                      onClick={() => selectLecture(lecture.id)}
                    >
                      <span className="lms-learning-lecture__icon">
                        {isDone ? <CheckCircleFilled /> : <PlayCircleOutlined />}
                      </span>
                      <span className="lms-learning-lecture__name">{lecture.name}</span>
                      <span className="lms-learning-lecture__dur">
                        {formatDurationLabel(lecture.duration)}
                      </span>
                      {isDone ? (
                        <span className="lms-learning-lecture__badge lms-learning-lecture__badge--done">
                          Xong
                        </span>
                      ) : p?.watchedSeconds ? (
                        <span className="lms-learning-lecture__badge lms-learning-lecture__badge--progress">
                          {watchedPct}%
                        </span>
                      ) : (
                        <span className="lms-learning-lecture__badge lms-learning-lecture__badge--new">
                          Mới
                        </span>
                      )}
                      {lecture.quizId && (
                        <span className="lms-learning-lecture__quiz-tag">Quiz</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  const hasAnyQuiz = !!quizId || courseQuizzes.length > 0;

  return (
    <div className="lms-learning-layout">
      {!isMobile && <aside className="lms-learning-sidebar">{sidebarContent}</aside>}
      {isMobile && (
        <Drawer
          onClose={() => setLessonDrawerOpen(false)}
          open={lessonDrawerOpen}
          placement="left"
          width={320}
          title="Nội dung khóa học"
        >
          {sidebarContent}
        </Drawer>
      )}

      <div className="lms-learning-main">
        <div className="lms-learning-header">
          <div className="lms-learning-header__left">
            {isMobile && (
              <button
                className="lms-learning-header__toggle"
                onClick={() => setLessonDrawerOpen(true)}
              >
                <MenuUnfoldOutlined />
              </button>
            )}
            <span className="lms-learning-header__breadcrumb">
              {currentLecture?.chapterName ?? 'Bài học'}
            </span>
            {currentLecture && (
              <span className="lms-learning-header__lecture">· {currentLecture.name}</span>
            )}
          </div>
          <span className="lms-learning-header__badge">{overallProgress}% hoàn thành</span>
        </div>

        <div className="lms-learning-content">
          {currentLecture ? (
            <>
              <div className="lms-learning-player-section">
                {playerError && (
                  <div style={{ padding: '8px 0', color: 'var(--color-error)', fontSize: 13 }}>
                    {playerError}
                  </div>
                )}
                <div className="lms-learning-player-wrap">
                  {bunnyEmbedUrl ? (
                    <iframe
                      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="lms-learning-player-wrap"
                      ref={iframeRef}
                      src={bunnyEmbedUrl}
                      title={currentLecture.name}
                      style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
                    />
                  ) : (
                    <div className="lms-learning-player-empty">
                      <div>
                        <BookOutlined style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }} />
                        <br />
                        Video chưa sẵn sàng
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="lms-learning-tabs-section">
                <div className="lms-learning-tabs-nav">
                  <button
                    className={`lms-learning-tab ${activeTab === 'overview' ? 'lms-learning-tab--active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                  >
                    Tổng quan
                  </button>
                  <button
                    className={`lms-learning-tab ${activeTab === 'notes' ? 'lms-learning-tab--active' : ''}`}
                    onClick={() => setActiveTab('notes')}
                  >
                    Ghi chú ({learningState.notes.length})
                  </button>
                  {hasAnyQuiz && (
                    <button
                      className={`lms-learning-tab ${activeTab === 'quiz' ? 'lms-learning-tab--active' : ''}`}
                      onClick={() => setActiveTab('quiz')}
                    >
                      Bài kiểm tra ({courseQuizzes.length || 1})
                    </button>
                  )}
                </div>

                <div
                  className={`lms-learning-tabpanel ${activeTab === 'overview' ? 'lms-learning-tabpanel--active' : ''}`}
                >
                  <div className="lms-learning-desc-card">
                    <div className="lms-learning-desc-card__title">Mô tả bài học</div>
                    {currentLecture?.description ? (
                      <p className="lms-learning-desc-card__text">{currentLecture.description}</p>
                    ) : (
                      <Empty
                        description="Bài học này chưa có mô tả chi tiết."
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )}
                  </div>
                  <div className="lms-learning-desc-card">
                    <div className="lms-learning-desc-card__title">Ghi chú nhanh</div>
                    <Paragraph type="secondary">
                      Gắn ghi chú vào đúng khoảnh khắc bạn đang xem để mở lại sau này.
                    </Paragraph>
                    <div className="lms-learning-note-composer">
                      <div className="lms-learning-note-composer__tag">
                        <ClockCircleOutlined /> Mốc hiện tại{' '}
                        {formatTimestamp(currentLectureSeconds)}
                      </div>
                      <textarea
                        className="lms-learning-note-composer__input"
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="Ví dụ: phần này giải thích rõ cách dùng hook..."
                        rows={5}
                        value={noteDraft}
                      />
                      <div className="lms-learning-note-composer__actions">
                        <button className="lms-learning-note-btn" onClick={handleAddNote}>
                          <FileTextOutlined /> Lưu ghi chú
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`lms-learning-tabpanel ${activeTab === 'notes' ? 'lms-learning-tabpanel--active' : ''}`}
                >
                  <div className="lms-learning-desc-card">
                    <div className="lms-learning-desc-card__title">
                      Ghi chú bài hiện tại · {currentLecture?.name}
                    </div>
                    {currentLectureNotes.length ? (
                      <div className="lms-learning-note-list">
                        {currentLectureNotes.map((note) => (
                          <div className="lms-learning-note" key={note.id}>
                            <div className="lms-learning-note__header">
                              <button
                                className="lms-learning-note__timestamp"
                                onClick={() => handleJumpToNote(note)}
                              >
                                {formatTimestamp(note.timestampSeconds)}
                              </button>
                              <Button
                                danger
                                onClick={() => void handleDeleteNote(note.id)}
                                size="small"
                                type="text"
                              >
                                Xoá
                              </Button>
                            </div>
                            <p className="lms-learning-note__content">{note.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty
                        description="Chưa có ghi chú nào."
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )}
                  </div>
                  <div className="lms-learning-desc-card">
                    <div className="lms-learning-desc-card__title">Tất cả ghi chú</div>
                    {otherLectureNotes.length ? (
                      <div className="lms-learning-note-list">
                        {otherLectureNotes.map((note) => {
                          const lecture = allLectures.find((l) => l.id === note.lectureId);
                          return (
                            <div className="lms-learning-note" key={note.id}>
                              <div className="lms-learning-note__header">
                                <div className="lms-learning-note__title-block">
                                  <Text strong>{lecture?.name ?? 'Bài học'}</Text>
                                  <Text type="secondary">{lecture?.chapterName}</Text>
                                </div>
                                <button
                                  className="lms-learning-note__timestamp"
                                  onClick={() => handleJumpToNote(note)}
                                >
                                  {formatTimestamp(note.timestampSeconds)}
                                </button>
                              </div>
                              <p className="lms-learning-note__content">{note.content}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <Empty
                        description="Ghi chú từ bài khác sẽ xuất hiện ở đây."
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )}
                  </div>
                </div>

                {hasAnyQuiz && (
                  <div
                    className={`lms-learning-tabpanel ${activeTab === 'quiz' ? 'lms-learning-tabpanel--active' : ''}`}
                  >
                    {lectureQuiz && (
                      <div className="lms-learning-quiz-card">
                        <div className="lms-learning-quiz-card__tag">📝 Bài kiểm tra bài học</div>
                        <div className="lms-learning-quiz-card__title">{lectureQuiz.title}</div>
                        <p className="lms-learning-quiz-card__desc">{lectureQuiz.description}</p>
                        {latestAttempt ? (
                          <div>
                            <div
                              style={{
                                padding: '10px 14px',
                                borderRadius: 8,
                                marginBottom: 12,
                                background:
                                  (latestAttempt.scorePercentage ?? 0) >= 50
                                    ? '#DCFCE7'
                                    : '#FEE2E2',
                                color:
                                  (latestAttempt.scorePercentage ?? 0) >= 50
                                    ? '#166534'
                                    : '#991B1B',
                                fontSize: 13,
                                fontWeight: 500,
                              }}
                            >
                              Đã làm — Điểm: <strong>{latestAttempt.scorePercentage}%</strong> (
                              {latestAttempt.score}/{latestAttempt.totalPoints})
                            </div>
                            <button
                              className="lms-learning-quiz-btn"
                              onClick={() => window.open(`/quiz/${lectureQuiz.id}`, '_blank')}
                            >
                              <QuestionCircleOutlined /> Làm lại
                            </button>
                          </div>
                        ) : (
                          <button
                            className="lms-learning-quiz-btn"
                            onClick={() => window.open(`/quiz/${lectureQuiz.id}`, '_blank')}
                          >
                            <QuestionCircleOutlined /> Làm bài kiểm tra
                          </button>
                        )}
                      </div>
                    )}
                    {courseQuizzes
                      .filter((cq) => cq.id !== quizId)
                      .map((cq) => (
                        <div className="lms-learning-quiz-card" key={cq.id}>
                          <div className="lms-learning-quiz-card__title">{cq.title}</div>
                          <p className="lms-learning-quiz-card__desc">{cq.description}</p>
                          <button
                            className="lms-learning-quiz-btn"
                            onClick={() => window.open(`/quiz/${cq.id}`, '_blank')}
                          >
                            <QuestionCircleOutlined /> Làm bài kiểm tra
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="lms-learning-player-wrap" style={{ height: 300 }}>
              <div className="lms-learning-player-empty">
                <div>
                  <BookOutlined style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }} />
                  <br />
                  Chọn bài học để bắt đầu
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
