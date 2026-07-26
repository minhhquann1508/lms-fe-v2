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
import {
  Alert,
  Button,
  Card,
  Collapse,
  Drawer,
  Empty,
  Layout,
  Progress,
  Result,
  Spin,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  BackwardOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  LeftOutlined,
  RightOutlined,
  UndoOutlined,
  SoundOutlined,
  SettingOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  AudioMutedOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { ErrorState, LoadingSkeleton } from '@/components';
import { colors } from '@/config/theme';
import { queryKeys } from '@/config/query-keys';
import { useBreakpoint, usePageTitle } from '@/hooks';
import { enrollmentService, lectureProgressService, quizService } from '@/services';
import { isApiError } from '@/utils/api-error';
import type { UpdateEnrollmentLearningStatePayload } from '@/services/enrollment.service';
import type {
  Chapter,
  Enrollment,
  EnrollmentLearningState,
  EnrollmentLearningNote,
  Lecture,
  EnrollmentLectureProgressSnapshot,
  LectureProgressAction,
  LectureProgressItem,
} from '@/types';

const { Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const PLAYER_JS_URL = 'https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js';
const LEARNING_SIDER_WIDTH = '33.33vw';
const AUTO_ADVANCE_MESSAGE_KEY = 'learning-auto-advance';
const DEFAULT_LEARNING_STATE: EnrollmentLearningState = {
  version: 1 as const,
  activeLectureId: null,
  notes: [],
};

interface LearningLecture extends Lecture {
  chapterName: string;
  chapterOrder: number;
}

interface LearningChapter extends Chapter {
  lectures: LearningLecture[];
}

type PlayerMode = 'bunny' | 'native' | 'empty';

interface PlayerCapabilities {
  playback: boolean;
  seek: boolean;
  rate: boolean;
}

let playerScriptPromise: Promise<void> | null = null;

function loadBunnyPlayerScript(): Promise<void> {
  if (window.playerjs) {
    return Promise.resolve();
  }

  if (!playerScriptPromise) {
    playerScriptPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${PLAYER_JS_URL}"]`,
      );

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), {
          once: true,
        });
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
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return [hours, minutes, remainingSeconds]
      .map((value, index) => (index === 0 ? String(value) : String(value).padStart(2, '0')))
      .join(':');
  }

  return [minutes, remainingSeconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function formatDurationLabel(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));

  if (seconds === 0) {
    return 'Chưa có thời lượng';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }

  if (minutes > 0) {
    return `${minutes} phút`;
  }

  return `${seconds} giây`;
}

function getCompletionThreshold(duration: number): number {
  if (duration <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(duration - 5, duration * 0.95);
}

export function shouldSyncLectureTimeUpdate(
  watchedSeconds: number,
  duration: number,
  lastSyncedSeconds: number,
): boolean {
  const nextSeconds = Math.max(0, Math.floor(watchedSeconds));
  const nextDuration = Math.max(0, Math.floor(duration));

  if (nextSeconds === 0) {
    return false;
  }

  if (nextDuration > 0 && nextSeconds >= getCompletionThreshold(nextDuration)) {
    return true;
  }

  return nextSeconds >= nextDuration || nextSeconds - lastSyncedSeconds >= 10;
}

function isBunnyEmbedUrl(url: string): boolean {
  return url.includes('mediadelivery.net/embed/');
}

function buildBunnyEmbedUrl(lecture: Lecture | null | undefined): string | null {
  if (!lecture) {
    return null;
  }

  const baseUrl =
    lecture.attributes?.libraryId && lecture.attributes?.videoGuid
      ? `https://iframe.mediadelivery.net/embed/${lecture.attributes.libraryId}/${lecture.attributes.videoGuid}`
      : lecture.videoUrl?.trim() && isBunnyEmbedUrl(lecture.videoUrl)
        ? lecture.videoUrl.trim()
        : '';

  if (!baseUrl) {
    return null;
  }

  const url = new URL(baseUrl, window.location.origin);
  url.searchParams.set('autoplay', 'false');
  url.searchParams.set('preload', 'true');
  url.searchParams.set('playsinline', 'true');
  url.searchParams.set('responsive', 'true');
  url.searchParams.set('v', lecture.id);

  return url.toString();
}

function resolveNativeVideoUrl(lecture: Lecture | null | undefined): string | null {
  if (!lecture?.videoUrl?.trim()) {
    return null;
  }

  const nextUrl = lecture.videoUrl.trim();

  return isBunnyEmbedUrl(nextUrl) ? null : nextUrl;
}

export function resolveInitialLectureId(
  lectures: LearningLecture[],
  activeLectureId: string | null | undefined,
  progressMap: Map<string, LectureProgressItem>,
): string | null {
  if (!lectures.length) {
    return null;
  }

  if (activeLectureId && lectures.some((lecture) => lecture.id === activeLectureId)) {
    return activeLectureId;
  }

  const firstInProgressLecture = lectures.find((lecture) => {
    const progress = progressMap.get(lecture.id);
    return progress && !progress.isCompleted && progress.watchedSeconds > 0;
  });

  if (firstInProgressLecture) {
    return firstInProgressLecture.id;
  }

  const firstIncompleteLecture = lectures.find(
    (lecture) => !progressMap.get(lecture.id)?.isCompleted,
  );

  return firstIncompleteLecture?.id ?? lectures[0].id;
}

function supportsBunnyMethod(
  player: BunnyPlayerInstance,
  method: keyof BunnyPlayerInstance,
): boolean {
  try {
    if (player.supports('method', method)) {
      return true;
    }
  } catch {
    return typeof player[method] === 'function';
  }

  return typeof player[method] === 'function';
}

export default function LearningPage() {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const queryClient = useQueryClient();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';

  const [activeLectureId, setActiveLectureId] = useState<string | null>(null);
  const [siderCollapsed, setSiderCollapsed] = useState(false);
  const [lessonDrawerOpen, setLessonDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [noteDraft, setNoteDraft] = useState('');
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
  const [playerTelemetry, setPlayerTelemetry] = useState({
    ready: false,
    currentTime: 0,
    duration: 0,
  });
  const [playerCapabilities, setPlayerCapabilities] = useState<PlayerCapabilities>({
    playback: false,
    seek: false,
    rate: false,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const noteInputRef = useRef<HTMLTextAreaElement | null>(null);
  const playerRef = useRef<BunnyPlayerInstance | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
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
      if (!enrollmentId) {
        return;
      }

      queryClient.setQueryData<Enrollment | undefined>(
        queryKeys.enrollments.detail(enrollmentId),
        (currentEnrollment) => {
          if (!currentEnrollment) {
            return updatedEnrollment;
          }

          const updatedCourseHasLectures = updatedEnrollment.course?.chapters?.some(
            (chapter) => (chapter.lectures?.length ?? 0) > 0,
          );

          return {
            ...currentEnrollment,
            ...updatedEnrollment,
            course: updatedCourseHasLectures ? updatedEnrollment.course : currentEnrollment.course,
          };
        },
      );
    },
  });

  const orderedChapters = useMemo<LearningChapter[]>(() => {
    const chapters = enrollment?.course?.chapters ?? [];

    return chapters
      .slice()
      .sort((firstChapter, secondChapter) => firstChapter.order - secondChapter.order)
      .map((chapter) => ({
        ...chapter,
        lectures: (chapter.lectures ?? [])
          .slice()
          .sort((firstLecture, secondLecture) => firstLecture.order - secondLecture.order)
          .map((lecture) => ({
            ...lecture,
            chapterName: chapter.name,
            chapterOrder: chapter.order,
          })),
      }));
  }, [enrollment]);

  const allLectures = useMemo(
    () => orderedChapters.flatMap((chapter) => chapter.lectures),
    [orderedChapters],
  );

  const progressMap = useMemo(() => {
    const map = new Map<string, LectureProgressItem>();
    progressSnapshot?.lectureProgresses.forEach((progress) => {
      map.set(progress.lectureId, progress);
    });
    return map;
  }, [progressSnapshot]);

  const learningState = enrollment?.learningState ?? DEFAULT_LEARNING_STATE;
  const overallProgress = progressSnapshot?.progress ?? enrollment?.progress ?? 0;
  const completedLectureCount =
    progressSnapshot?.completedLectures ??
    Array.from(progressMap.values()).filter((item) => item.isCompleted).length;
  const totalLectures = progressSnapshot?.totalLectures ?? allLectures.length;
  useEffect(() => {
    if (!allLectures.length) {
      return;
    }

    if (activeLectureId && allLectures.some((lecture) => lecture.id === activeLectureId)) {
      return;
    }

    setActiveLectureId(
      resolveInitialLectureId(allLectures, learningState.activeLectureId, progressMap),
    );
  }, [activeLectureId, allLectures, learningState.activeLectureId, progressMap]);

  const currentLecture = useMemo(
    () => allLectures.find((lecture) => lecture.id === activeLectureId) ?? null,
    [activeLectureId, allLectures],
  );

  const bunnyEmbedUrl = useMemo(() => buildBunnyEmbedUrl(currentLecture), [currentLecture]);
  const nativeVideoUrl = useMemo(() => resolveNativeVideoUrl(currentLecture), [currentLecture]);
  const playerMode: PlayerMode = bunnyEmbedUrl ? 'bunny' : nativeVideoUrl ? 'native' : 'empty';

  const currentLectureIndex = useMemo(
    () =>
      currentLecture ? allLectures.findIndex((lecture) => lecture.id === currentLecture.id) : -1,
    [allLectures, currentLecture],
  );

  const previousLecture = currentLectureIndex > 0 ? allLectures[currentLectureIndex - 1] : null;
  const nextLecture =
    currentLectureIndex >= 0 && currentLectureIndex < allLectures.length - 1
      ? allLectures[currentLectureIndex + 1]
      : null;

  const currentLectureProgress = currentLecture ? progressMap.get(currentLecture.id) : undefined;

  const currentLectureDuration = playerTelemetry.duration || currentLecture?.duration || 0;
  const currentLectureSeconds = Math.max(
    currentLectureProgress?.watchedSeconds ?? 0,
    Math.floor(playerTelemetry.currentTime),
  );
  const canUsePlaybackControls =
    playerMode === 'native' || (playerMode === 'bunny' && playerCapabilities.playback);
  const canUseSeekControls =
    playerMode === 'native' || (playerMode === 'bunny' && playerCapabilities.seek);
  const canUseRateControls =
    playerMode === 'native' || (playerMode === 'bunny' && playerCapabilities.rate);
  const playerControlHint =
    playerMode === 'bunny' && !playerCapabilities.playback
      ? 'Player Bunny chưa báo hỗ trợ điều khiển này'
      : undefined;
  const playbackRateHint =
    playerMode === 'bunny' && !playerCapabilities.rate
      ? 'Bunny player hiện chưa hỗ trợ đổi tốc độ qua API'
      : undefined;

  const syncMutation = useMutation({
    mutationFn: lectureProgressService.sync,
    onSuccess: (snapshot, variables) => {
      if (!enrollmentId) {
        return;
      }

      const previousSnapshot = queryClient.getQueryData<EnrollmentLectureProgressSnapshot>(
        queryKeys.progress.enrollment(enrollmentId),
      );
      const wasCompleted =
        previousSnapshot?.lectureProgresses.some(
          (progress) => progress.lectureId === variables.lectureId && progress.isCompleted,
        ) ??
        progressMap.get(variables.lectureId)?.isCompleted ??
        false;
      const isNowCompleted = snapshot.lectureProgresses.some(
        (progress) => progress.lectureId === variables.lectureId && progress.isCompleted,
      );

      queryClient.setQueryData(queryKeys.progress.enrollment(enrollmentId), snapshot);
      queryClient.setQueryData<Enrollment | undefined>(
        queryKeys.enrollments.detail(enrollmentId),
        (currentEnrollment) =>
          currentEnrollment
            ? {
                ...currentEnrollment,
                progress: snapshot.progress,
                completedAt: snapshot.completedAt,
              }
            : currentEnrollment,
      );

      if (isNowCompleted && !wasCompleted) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.progress.enrollment(enrollmentId),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.enrollments.detail(enrollmentId),
        });

        if (variables.lectureId === currentLecture?.id && nextLecture) {
          setAutoAdvanceCountdown(5);
        }
      }
    },
    onError: (_error, variables) => {
      if (variables.action !== 'timeupdate') {
        message.error('Không thể đồng bộ tiến độ bài học lúc này');
      }
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

  const currentLectureNotes = useMemo(
    () =>
      learningState.notes
        .filter((note) => note.lectureId === currentLecture?.id)
        .slice()
        .sort((firstNote, secondNote) => firstNote.timestampSeconds - secondNote.timestampSeconds),
    [currentLecture?.id, learningState.notes],
  );

  const otherLectureNotes = useMemo(
    () =>
      learningState.notes
        .filter((note) => note.lectureId !== currentLecture?.id)
        .slice()
        .sort(
          (firstNote, secondNote) =>
            new Date(secondNote.updatedAt).getTime() - new Date(firstNote.updatedAt).getTime(),
        ),
    [currentLecture?.id, learningState.notes],
  );

  const chapterProgressMap = useMemo(() => {
    return new Map(
      orderedChapters.map((chapter) => [
        chapter.id,
        {
          completed: chapter.lectures.filter((lecture) => progressMap.get(lecture.id)?.isCompleted)
            .length,
          total: chapter.lectures.length,
        },
      ]),
    );
  }, [orderedChapters, progressMap]);

  const getPlayerPosition = useCallback(async (): Promise<number> => {
    if (videoRef.current) {
      return Math.max(0, Math.floor(videoRef.current.currentTime || 0));
    }

    if (!playerRef.current) {
      return currentTimeRef.current;
    }

    return await new Promise<number>((resolve) => {
      playerRef.current?.getCurrentTime((seconds) => {
        resolve(Math.max(0, Math.floor(seconds ?? 0)));
      });
    });
  }, []);

  const persistLearningState = useCallback(
    async (
      payload: UpdateEnrollmentLearningStatePayload,
      options?: { successMessage?: string; showError?: boolean },
    ) => {
      if (!enrollmentId) {
        return null;
      }

      try {
        const updatedEnrollment = await learningStateMutation.mutateAsync({
          targetEnrollmentId: enrollmentId,
          payload,
        });

        if (options?.successMessage) {
          message.success(options.successMessage);
        }

        return updatedEnrollment;
      } catch {
        if (options?.showError ?? true) {
          message.error('Không thể lưu trạng thái học lúc này');
        }
        return null;
      }
    },
    [enrollmentId, learningStateMutation],
  );

  const selectLecture = useCallback(
    (lectureId: string) => {
      startTransition(() => {
        setActiveLectureId(lectureId);
      });
      setLessonDrawerOpen(false);
      setAutoAdvanceCountdown(null);
      void persistLearningState({ activeLectureId: lectureId }, { showError: false });
    },
    [persistLearningState],
  );

  const syncProgress = useCallback(
    (action: LectureProgressAction, watchedSeconds: number, duration?: number) => {
      if (!enrollmentId || !currentLecture) {
        return;
      }

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
    if (!currentLecture) {
      return;
    }

    const lectureId = currentLecture.id;
    const nextSeconds = Math.max(0, Math.floor(watchedSeconds));
    const lastSyncedSeconds = lastSyncedSecondsRef.current.get(lectureId) ?? 0;

    if (!shouldSyncLectureTimeUpdate(nextSeconds, duration, lastSyncedSeconds)) {
      return;
    }

    lastSyncedSecondsRef.current.set(lectureId, nextSeconds);
    syncProgress('timeupdate', nextSeconds, duration);
  });

  const handlePlayerReady = useEffectEvent((player: BunnyPlayerInstance) => {
    if (!currentLecture) {
      return;
    }

    setPlayerError(null);
    setPlayerTelemetry((previous) => ({
      ...previous,
      ready: true,
    }));
    const nextCapabilities = {
      playback: supportsBunnyMethod(player, 'play') && supportsBunnyMethod(player, 'pause'),
      seek: supportsBunnyMethod(player, 'setCurrentTime'),
      rate: supportsBunnyMethod(player, 'setPlaybackRate'),
    };

    setPlayerCapabilities(nextCapabilities);

    if (nextCapabilities.rate && player.setPlaybackRate) {
      player.setPlaybackRate(playbackRate);
    }

    player.getDuration((reportedDuration) => {
      const nextDuration = Math.max(
        0,
        Math.floor(reportedDuration ?? currentLecture.duration ?? 0),
      );
      durationRef.current = nextDuration;
      setPlayerTelemetry((previous) => ({
        ...previous,
        duration: nextDuration,
      }));

      const pendingSeek = pendingSeekRef.current;

      if (pendingSeek?.lectureId === currentLecture.id) {
        player.setCurrentTime(pendingSeek.seconds);
        currentTimeRef.current = pendingSeek.seconds;
        setPlayerTelemetry((previous) => ({
          ...previous,
          currentTime: pendingSeek.seconds,
        }));
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
        setPlayerTelemetry((previous) => ({
          ...previous,
          currentTime: resumeAt,
        }));
        resumedLectureIdsRef.current.add(currentLecture.id);
      }
    });
  });

  const handlePlayerTimeUpdate = useEffectEvent((data?: BunnyPlayerTimeUpdateData) => {
    const nextCurrentTime = Math.max(0, Math.floor(data?.seconds ?? currentTimeRef.current));
    const nextDuration = Math.max(0, Math.floor(data?.duration ?? durationRef.current));

    currentTimeRef.current = nextCurrentTime;
    durationRef.current = nextDuration;

    setPlayerTelemetry((previous) => ({
      ...previous,
      currentTime: nextCurrentTime,
      duration: nextDuration || previous.duration,
    }));

    maybeSyncTimeUpdate(nextCurrentTime, nextDuration || currentLecture?.duration || 0);
  });

  const handlePlayerPlay = useEffectEvent(() => {
    setIsPlaying(true);
  });

  const handlePlayerPause = useEffectEvent(() => {
    setIsPlaying(false);
    syncProgress('pause', currentTimeRef.current, durationRef.current);
  });

  const handlePlayerSeeked = useEffectEvent(() => {
    syncProgress('seeked', currentTimeRef.current, durationRef.current);
  });

  const handlePlayerEnded = useEffectEvent(() => {
    const finishedDuration =
      durationRef.current || currentLecture?.duration || currentTimeRef.current;

    currentTimeRef.current = finishedDuration;
    setIsPlaying(false);
    setPlayerTelemetry((previous) => ({
      ...previous,
      currentTime: finishedDuration,
      duration: finishedDuration || previous.duration,
    }));
    syncProgress('ended', finishedDuration, finishedDuration);
  });

  const handleNativeLoadedMetadata = useEffectEvent(() => {
    if (!videoRef.current || !currentLecture) {
      return;
    }

    setPlayerError(null);
    videoRef.current.playbackRate = playbackRate;
    const nextDuration = Math.max(
      0,
      Math.floor(videoRef.current.duration || currentLecture.duration || 0),
    );

    durationRef.current = nextDuration;
    setPlayerTelemetry((previous) => ({
      ...previous,
      ready: true,
      duration: nextDuration,
    }));

    const pendingSeek = pendingSeekRef.current;

    if (pendingSeek?.lectureId === currentLecture.id) {
      videoRef.current.currentTime = pendingSeek.seconds;
      currentTimeRef.current = pendingSeek.seconds;
      setPlayerTelemetry((previous) => ({
        ...previous,
        currentTime: pendingSeek.seconds,
      }));
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

      videoRef.current.currentTime = resumeAt;
      currentTimeRef.current = resumeAt;
      setPlayerTelemetry((previous) => ({
        ...previous,
        currentTime: resumeAt,
      }));
      resumedLectureIdsRef.current.add(currentLecture.id);
    }
  });

  const handleNativeTimeUpdate = useEffectEvent(() => {
    if (!videoRef.current) {
      return;
    }

    const nextCurrentTime = Math.max(
      0,
      Math.floor(videoRef.current.currentTime || currentTimeRef.current),
    );
    const nextDuration = Math.max(0, Math.floor(videoRef.current.duration || durationRef.current));

    currentTimeRef.current = nextCurrentTime;
    durationRef.current = nextDuration;

    setPlayerTelemetry((previous) => ({
      ...previous,
      currentTime: nextCurrentTime,
      duration: nextDuration || previous.duration,
    }));

    maybeSyncTimeUpdate(nextCurrentTime, nextDuration || currentLecture?.duration || 0);
  });

  const handleNativePlay = useEffectEvent(() => {
    setIsPlaying(true);
  });

  const handleNativePause = useEffectEvent(() => {
    setIsPlaying(false);
    syncProgress('pause', currentTimeRef.current, durationRef.current);
  });

  const handleNativeSeeked = useEffectEvent(() => {
    syncProgress('seeked', currentTimeRef.current, durationRef.current);
  });

  const handleNativeEnded = useEffectEvent(() => {
    handlePlayerEnded();
  });

  const handleNativeError = useEffectEvent(() => {
    setPlayerError('Không thể tải video của bài học này.');
  });

  useEffect(() => {
    if (!currentLecture) {
      setPlayerTelemetry({
        ready: false,
        currentTime: 0,
        duration: 0,
      });
      setPlayerCapabilities({ playback: false, seek: false, rate: false });
      setIsPlaying(false);
      return;
    }

    currentTimeRef.current = currentLectureProgress?.watchedSeconds ?? 0;
    durationRef.current = currentLecture.duration ?? 0;
    setPlayerTelemetry({
      ready: false,
      currentTime: currentLectureProgress?.watchedSeconds ?? 0,
      duration: currentLecture.duration ?? 0,
    });
    setPlayerCapabilities(
      playerMode === 'native'
        ? { playback: true, seek: true, rate: true }
        : { playback: false, seek: false, rate: false },
    );
    setIsPlaying(false);
    setPlayerError(null);
    setAutoAdvanceCountdown(null);
  }, [currentLecture?.id, playerMode]);

  useEffect(() => {
    if (playerMode !== 'bunny') {
      playerRef.current = null;
      return;
    }

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

        if (isCancelled || !iframeRef.current || !window.playerjs) {
          return;
        }

        player = new window.playerjs.Player(iframeRef.current);
        playerRef.current = player;

        player.on('ready', () => handlePlayerReady(player as BunnyPlayerInstance));
        player.on('play', handlePlayerPlay);
        player.on('timeupdate', handlePlayerTimeUpdate);
        player.on('pause', handlePlayerPause);
        player.on('seeked', handlePlayerSeeked);
        player.on('ended', handlePlayerEnded);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setPlayerError(error instanceof Error ? error.message : 'Không thể khởi tạo video player.');
      }
    };

    void attachPlayer();

    return () => {
      isCancelled = true;

      if (player) {
        player.off('ready');
        player.off('play');
        player.off('timeupdate');
        player.off('pause');
        player.off('seeked');
        player.off('ended');
      }

      if (playerRef.current === player) {
        playerRef.current = null;
      }
    };
  }, [
    bunnyEmbedUrl,
    currentLecture?.id,
    handlePlayerEnded,
    handlePlayerPause,
    handlePlayerPlay,
    handlePlayerReady,
    handlePlayerSeeked,
    handlePlayerTimeUpdate,
    playerMode,
  ]);

  useEffect(() => {
    if (!autoAdvanceCountdown || !currentLecture || !nextLecture) {
      return;
    }

    if (autoAdvanceCountdown <= 1) {
      selectLecture(nextLecture.id);
      return;
    }

    const timer = window.setTimeout(() => {
      setAutoAdvanceCountdown((previous) => (previous ? previous - 1 : previous));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [autoAdvanceCountdown, currentLecture, nextLecture, selectLecture]);

  useEffect(() => {
    if (!autoAdvanceCountdown || !nextLecture) {
      message.destroy(AUTO_ADVANCE_MESSAGE_KEY);
      return;
    }

    message.open({
      key: AUTO_ADVANCE_MESSAGE_KEY,
      type: 'success',
      content: `Sẽ chuyển bài sau ${autoAdvanceCountdown}...`,
      duration: 0,
    });
  }, [autoAdvanceCountdown, nextLecture]);

  useEffect(() => {
    return () => {
      message.destroy(AUTO_ADVANCE_MESSAGE_KEY);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleAddNote = async () => {
    if (!currentLecture) {
      return;
    }

    const content = noteDraft.trim();

    if (!content) {
      message.info('Thêm nội dung ghi chú trước khi lưu');
      return;
    }

    const timestampSeconds = await getPlayerPosition();
    const now = new Date().toISOString();
    const nextNotes = [
      ...learningState.notes,
      {
        id: crypto.randomUUID(),
        lectureId: currentLecture.id,
        content,
        timestampSeconds,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const updated = await persistLearningState(
      {
        activeLectureId: currentLecture.id,
        notes: nextNotes,
      },
      { successMessage: 'Đã lưu ghi chú', showError: true },
    );

    if (updated) {
      setNoteDraft('');
      setActiveTab('notes');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const nextNotes = learningState.notes.filter((note) => note.id !== noteId);
    await persistLearningState(
      {
        activeLectureId: activeLectureId ?? undefined,
        notes: nextNotes,
      },
      { successMessage: 'Đã xoá ghi chú', showError: true },
    );
  };

  const handleJumpToNote = (note: EnrollmentLearningNote) => {
    if (note.lectureId !== currentLecture?.id) {
      pendingSeekRef.current = {
        lectureId: note.lectureId,
        seconds: note.timestampSeconds,
      };
      selectLecture(note.lectureId);
      return;
    }

    if (videoRef.current) {
      videoRef.current.currentTime = note.timestampSeconds;
    } else {
      playerRef.current?.setCurrentTime(note.timestampSeconds);
    }
    currentTimeRef.current = note.timestampSeconds;
    setPlayerTelemetry((previous) => ({
      ...previous,
      currentTime: note.timestampSeconds,
    }));
  };

  const handleSeekBy = async (offsetSeconds: number) => {
    if (!currentLecture || !canUseSeekControls) {
      return;
    }

    const duration = currentLectureDuration || currentLecture.duration || 0;
    const currentSeconds = await getPlayerPosition();
    const nextSeconds = Math.max(
      0,
      duration > 0
        ? Math.min(duration, currentSeconds + offsetSeconds)
        : currentSeconds + offsetSeconds,
    );

    if (videoRef.current) {
      videoRef.current.currentTime = nextSeconds;
    } else {
      playerRef.current?.setCurrentTime(nextSeconds);
    }

    currentTimeRef.current = nextSeconds;
    setPlayerTelemetry((previous) => ({
      ...previous,
      currentTime: nextSeconds,
    }));
    syncProgress('seeked', nextSeconds, duration);
  };

  const handleTogglePlayback = async () => {
    if (!currentLecture || !canUsePlaybackControls) {
      return;
    }

    try {
      if (videoRef.current) {
        if (videoRef.current.paused) {
          await videoRef.current.play();
          setIsPlaying(true);
          return;
        }

        videoRef.current.pause();
        setIsPlaying(false);
        return;
      }

      if (!playerRef.current) {
        return;
      }

      if (isPlaying) {
        playerRef.current.pause();
        setIsPlaying(false);
      } else {
        playerRef.current.play();
        setIsPlaying(true);
      }
    } catch {
      message.error('Không thể điều khiển phát/tạm dừng video lúc này');
    }
  };

  const handlePlaybackRateChange = (nextRate: number) => {
    setPlaybackRate(nextRate);

    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
      return;
    }

    if (playerRef.current?.setPlaybackRate && canUseRateControls) {
      playerRef.current.setPlaybackRate(nextRate);
    }
  };

  const handleSeekTo = async (seconds: number) => {
    if (!currentLecture || !canUseSeekControls) {
      return;
    }

    const duration = currentLectureDuration || currentLecture.duration || 0;
    const nextSeconds = Math.max(0, Math.min(duration, seconds));

    if (videoRef.current) {
      videoRef.current.currentTime = nextSeconds;
    } else {
      playerRef.current?.setCurrentTime(nextSeconds);
    }

    currentTimeRef.current = nextSeconds;
    setPlayerTelemetry((previous) => ({
      ...previous,
      currentTime: nextSeconds,
    }));
    syncProgress('seeked', nextSeconds, duration);
  };

  const handleRestart = () => {
    void handleSeekTo(0);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
    if (playerRef.current?.mute) {
      try {
        if (nextMuted) {
          playerRef.current.mute();
        } else {
          playerRef.current.unmute?.();
        }
      } catch (e) {
        console.warn('Muting error:', e);
      }
    }
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        message.error('Không thể bật toàn màn hình: ' + err.message);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn('Exit fullscreen error:', err);
      });
    }
  };

  const handleTogglePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    handlePlaybackRateChange(rates[nextIndex]);
  };

  const handleTogglePip = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('Picture in Picture error:', err);
    }
  };

  const handleVideoContainerClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.lms-learning-controlbar') || target.closest('.lms-player-edge-btn')) {
      return;
    }
    void handleTogglePlayback();
  };

  const handleOpenNoteComposer = () => {
    setActiveTab('overview');
    window.setTimeout(() => {
      noteInputRef.current?.focus();
    }, 0);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (!currentLecture) return;

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          void handleTogglePlayback();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          void handleSeekBy(-10);
          break;
        case 'ArrowRight':
          event.preventDefault();
          void handleSeekBy(10);
          break;
        case 'KeyF':
          event.preventDefault();
          handleToggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentLecture, handleTogglePlayback, handleSeekBy, handleToggleFullscreen]);

  if (enrollmentQuery.isLoading) {
    return <LoadingSkeleton variant="page-content" />;
  }

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

  if (!enrollment) {
    return <Result status="404" title="Không tìm thấy đăng ký học" />;
  }

  const sidebar = (
    <div className="lms-learning-sidebar__content">
      <div className="lms-learning-sidebar__hero">
        <Text className="lms-learning-sidebar__eyebrow">Đang học</Text>
        <Title className="lms-learning-sidebar__course" level={5}>
          {enrollment.course?.name}
        </Title>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>
            {completedLectureCount}/{totalLectures} bài
          </Text>
          <Text style={{ fontSize: 12, fontWeight: 700 }}>{overallProgress}%</Text>
        </div>
        <Progress
          percent={overallProgress}
          size="small"
          strokeColor={colors.primary}
          showInfo={false}
        />
      </div>

      <div className="lms-learning-sidebar__chapters">
        <Collapse
          ghost
          defaultActiveKey={orderedChapters.map((c) => c.id)}
          expandIconPosition="end"
          items={orderedChapters.map((chapter, chIndex) => {
            const chapterProgress = chapterProgressMap.get(chapter.id);
            return {
              key: chapter.id,
              label: (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    paddingRight: 4,
                    minWidth: 0,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        fontSize: 13,
                        fontWeight: 600,
                        lineHeight: 1.3,
                      }}
                    >
                      <span style={{ color: 'rgb(100 116 139)', marginRight: 6 }}>
                        Chương {chIndex + 1}:
                      </span>
                      {chapter.name}
                    </div>
                    <Text type="secondary" style={{ fontSize: 11, marginTop: 2, display: 'block' }}>
                      {chapterProgress?.completed ?? 0}/{chapterProgress?.total ?? 0} bài
                    </Text>
                  </div>
                  <Tag
                    color="blue"
                    style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px', flexShrink: 0 }}
                  >
                    {chapter.lectures.length}
                  </Tag>
                </div>
              ),
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {chapter.lectures.map((lecture) => {
                    const progress = progressMap.get(lecture.id);
                    const isActive = lecture.id === currentLecture?.id;
                    const isDone = progress?.isCompleted;
                    const watchedPercent =
                      lecture.duration > 0
                        ? Math.min(
                            100,
                            Math.round(((progress?.watchedSeconds ?? 0) / lecture.duration) * 100),
                          )
                        : isDone
                          ? 100
                          : 0;
                    return (
                      <button
                        key={lecture.id}
                        onClick={() => selectLecture(lecture.id)}
                        type="button"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: 'none',
                          background: isActive ? 'rgb(219 234 254 / 0.6)' : 'transparent',
                          color: 'inherit',
                          textAlign: 'left',
                          cursor: 'pointer',
                          width: '100%',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.background = 'rgb(241 245 249)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <span
                          style={{
                            flexShrink: 0,
                            fontSize: 14,
                            color: isDone ? colors.success : colors.primary,
                          }}
                        >
                          {isDone ? <CheckCircleFilled /> : <PlayCircleOutlined />}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            style={{ fontSize: 13, fontWeight: isActive ? 700 : 500 }}
                            ellipsis={{ tooltip: lecture.name }}
                          >
                            {lecture.name}
                          </Text>
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}
                          >
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {formatDurationLabel(lecture.duration)}
                            </Text>
                            {lecture.quizId && (
                              <Tag
                                color="purple"
                                style={{
                                  fontSize: 10,
                                  lineHeight: '14px',
                                  padding: '0 4px',
                                  margin: 0,
                                }}
                              >
                                Quiz
                              </Tag>
                            )}
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: '0 6px',
                                borderRadius: 4,
                                background: isDone
                                  ? 'rgb(220 252 231)'
                                  : progress?.watchedSeconds
                                    ? 'rgb(219 234 254)'
                                    : 'rgb(241 245 249)',
                                color: isDone
                                  ? 'rgb(22 101 52)'
                                  : progress?.watchedSeconds
                                    ? 'rgb(30 64 175)'
                                    : 'rgb(71 85 105)',
                              }}
                            >
                              {isDone
                                ? 'Xong'
                                : progress?.watchedSeconds
                                  ? `${watchedPercent}%`
                                  : 'Mới'}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ),
            };
          })}
        />
      </div>
    </div>
  );

  const lessonTabs = [
    {
      key: 'overview',
      label: 'Tổng quan',
      children: (
        <div className="lms-learning-tabpanel">
          <Card className="lms-learning-card" title="Mô tả bài học" variant="borderless">
            {currentLecture?.description ? (
              <Paragraph className="lms-learning-description">
                {currentLecture.description}
              </Paragraph>
            ) : (
              <Empty
                description="Bài học này chưa có mô tả chi tiết."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>

          <Card className="lms-learning-card" title="Ghi chú nhanh" variant="borderless">
            <Paragraph type="secondary">
              Gắn ghi chú vào đúng khoảnh khắc bạn đang xem để mở lại sau này.
            </Paragraph>
            <div className="lms-learning-note-composer">
              <div className="lms-learning-note-composer__meta">
                <Tag icon={<ClockCircleOutlined />} color="geekblue">
                  Mốc hiện tại {formatTimestamp(currentLectureSeconds)}
                </Tag>
                {currentLectureProgress?.isCompleted ? (
                  <Tag color="success">Bài này đã hoàn thành</Tag>
                ) : null}
              </div>
              <textarea
                className="lms-learning-note-composer__input"
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="Ví dụ: phần này giải thích rõ cách dùng hook trong flow hiện tại..."
                ref={noteInputRef}
                rows={5}
                value={noteDraft}
              />
              <div className="lms-learning-note-composer__actions">
                <Button icon={<FileTextOutlined />} onClick={handleAddNote} type="primary">
                  Lưu ghi chú
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ),
    },
    {
      key: 'notes',
      label: `Ghi chú (${learningState.notes.length})`,
      children: (
        <div className="lms-learning-tabpanel">
          {learningState.legacyText ? (
            <Alert
              className="lms-learning-alert"
              title="Ghi chú cũ"
              showIcon
              type="info"
              description={learningState.legacyText}
            />
          ) : null}

          <Card
            className="lms-learning-card"
            title={`Ghi chú của bài hiện tại${currentLecture ? ` · ${currentLecture.name}` : ''}`}
            variant="borderless"
          >
            {currentLectureNotes.length ? (
              <div className="lms-learning-note-list">
                {currentLectureNotes.map((note) => (
                  <article className="lms-learning-note" key={note.id}>
                    <div className="lms-learning-note__header">
                      <Button
                        className="lms-learning-note__timestamp"
                        onClick={() => handleJumpToNote(note)}
                        size="small"
                        type="link"
                      >
                        {formatTimestamp(note.timestampSeconds)}
                      </Button>
                      <Button
                        danger
                        onClick={() => void handleDeleteNote(note.id)}
                        size="small"
                        type="text"
                      >
                        Xoá
                      </Button>
                    </div>
                    <Paragraph className="lms-learning-note__content">{note.content}</Paragraph>
                  </article>
                ))}
              </div>
            ) : (
              <Empty
                description="Chưa có ghi chú nào cho bài học này."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>

          <Card className="lms-learning-card" title="Tất cả ghi chú" variant="borderless">
            {otherLectureNotes.length ? (
              <div className="lms-learning-note-list">
                {otherLectureNotes.map((note) => {
                  const lecture = allLectures.find((item) => item.id === note.lectureId);

                  return (
                    <article className="lms-learning-note" key={note.id}>
                      <div className="lms-learning-note__header">
                        <div className="lms-learning-note__title-block">
                          <Text strong>{lecture?.name ?? 'Bài học'}</Text>
                          <Text type="secondary">{lecture?.chapterName}</Text>
                        </div>
                        <Button
                          className="lms-learning-note__timestamp"
                          onClick={() => handleJumpToNote(note)}
                          size="small"
                          type="link"
                        >
                          {formatTimestamp(note.timestampSeconds)}
                        </Button>
                      </div>
                      <Paragraph className="lms-learning-note__content">{note.content}</Paragraph>
                    </article>
                  );
                })}
              </div>
            ) : (
              <Empty
                description="Các ghi chú từ bài khác sẽ xuất hiện ở đây."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </div>
      ),
    },
  ];

  const hasAnyQuiz = !!quizId || courseQuizzes.length > 0;

  if (hasAnyQuiz) {
    lessonTabs.push({
      key: 'quiz',
      label: `Bài kiểm tra${courseQuizzes.length > 0 ? ` (${courseQuizzes.length})` : ''}`,
      children: (
        <div className="lms-learning-tabpanel">
          {courseQuizzesQuery.isLoading ? (
            <Spin />
          ) : (
            <>
              {lectureQuiz && (
                <Card
                  className="lms-learning-card"
                  variant="borderless"
                  style={{ marginBottom: 16 }}
                >
                  <Tag color="purple" style={{ marginBottom: 8 }}>
                    Bài kiểm tra bài học
                  </Tag>
                  <Title level={4}>{lectureQuiz.title}</Title>
                  <Paragraph>{lectureQuiz.description}</Paragraph>
                  {latestAttempt ? (
                    <div>
                      <Alert
                        showIcon
                        type={
                          latestAttempt.scorePercentage !== null &&
                          latestAttempt.scorePercentage >= 50
                            ? 'success'
                            : 'error'
                        }
                        message={
                          <span>
                            Đã làm — Điểm: <strong>{latestAttempt.scorePercentage}%</strong> (
                            {latestAttempt.score}/{latestAttempt.totalPoints})
                          </span>
                        }
                        style={{ marginBottom: 16 }}
                      />
                      <Button
                        icon={<QuestionCircleOutlined />}
                        onClick={() => window.open(`/quiz/${lectureQuiz.id}`, '_blank')}
                        type="primary"
                      >
                        Làm lại
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                        Bài học này có kèm bài kiểm tra.
                      </Text>
                      <Button
                        icon={<QuestionCircleOutlined />}
                        onClick={() => window.open(`/quiz/${lectureQuiz.id}`, '_blank')}
                        type="primary"
                        size="large"
                      >
                        Làm bài kiểm tra
                      </Button>
                    </div>
                  )}
                  <div style={{ marginTop: 12 }}>
                    {lectureQuiz.duration ? (
                      <Tag icon={<ClockCircleOutlined />} color="blue" style={{ margin: 0 }}>
                        {Math.round(lectureQuiz.duration / 60)} phút
                      </Tag>
                    ) : null}
                    <Tag color="purple">{lectureQuiz.questions?.length ?? 0} câu hỏi</Tag>
                    {lectureQuiz.passingScore ? (
                      <Tag color="green">Đạt: {lectureQuiz.passingScore}%</Tag>
                    ) : null}
                  </div>
                </Card>
              )}
              {courseQuizzes
                .filter((cq) => cq.id !== quizId)
                .map((cq) => (
                  <Card
                    key={cq.id}
                    className="lms-learning-card"
                    variant="borderless"
                    style={{ marginBottom: 16 }}
                  >
                    <Title level={4}>{cq.title}</Title>
                    <Paragraph>{cq.description}</Paragraph>
                    <Button
                      icon={<QuestionCircleOutlined />}
                      onClick={() => window.open(`/quiz/${cq.id}`, '_blank')}
                      type="primary"
                      size="large"
                    >
                      Làm bài kiểm tra
                    </Button>
                    <div style={{ marginTop: 12 }}>
                      {cq.duration ? (
                        <Tag icon={<ClockCircleOutlined />} color="blue" style={{ margin: 0 }}>
                          {Math.round(cq.duration / 60)} phút
                        </Tag>
                      ) : null}
                      <Tag color="purple">{cq.questions?.length ?? 0} câu hỏi</Tag>
                      {cq.passingScore ? <Tag color="green">Đạt: {cq.passingScore}%</Tag> : null}
                    </div>
                  </Card>
                ))}
              {!lectureQuiz && courseQuizzes.length === 0 && (
                <Text type="secondary">Không có bài kiểm tra nào.</Text>
              )}
            </>
          )}
        </div>
      ),
    });
  }

  return (
    <Layout className="lms-learning-layout">
      {!isMobile ? (
        <Sider
          className="lms-learning-sidebar"
          collapsed={siderCollapsed}
          collapsedWidth={0}
          width={siderCollapsed ? 0 : LEARNING_SIDER_WIDTH}
        >
          {sidebar}
        </Sider>
      ) : (
        <Drawer
          onClose={() => setLessonDrawerOpen(false)}
          open={lessonDrawerOpen}
          placement="right"
          size="default"
          title="Nội dung khóa học"
        >
          {sidebar}
        </Drawer>
      )}

      <Layout
        className={`lms-learning-main ${isMobile || siderCollapsed ? 'lms-learning-main--collapsed' : ''}`}
      >
        <div className="lms-learning-header">
          <div className="lms-learning-header__main">
            <Button
              aria-label="Mở danh sách bài học"
              icon={siderCollapsed || isMobile ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() =>
                isMobile ? setLessonDrawerOpen(true) : setSiderCollapsed((previous) => !previous)
              }
              type="text"
            />

            <div className="lms-learning-header__copy">
              <Text className="lms-learning-header__eyebrow" type="secondary">
                {currentLecture?.chapterName ?? 'Bài học'}
              </Text>
              <Text className="lms-learning-header__title" strong>
                {currentLecture?.name ?? 'Chọn bài học để bắt đầu'}
              </Text>
            </div>
          </div>

          <div className="lms-learning-header__progress">
            <Tag color={overallProgress >= 100 ? 'success' : 'blue'}>
              {overallProgress}% hoàn thành
            </Tag>
          </div>
        </div>

        <Content className="lms-learning-content">
          {progressQuery.isError ? (
            <ErrorState inline onRetry={() => progressQuery.refetch()} />
          ) : null}

          {currentLecture ? (
            <div className="lms-learning-shell">
              <Card
                className="lms-learning-player-card"
                variant="borderless"
                style={{ padding: 0 }}
              >
                {playerError ? (
                  <Alert className="lms-learning-alert" title={playerError} showIcon type="error" />
                ) : null}

                <div
                  ref={containerRef}
                  onClick={handleVideoContainerClick}
                  onDoubleClick={handleToggleFullscreen}
                  className={`lms-player-container ${!isPlaying ? 'lms-player-container--paused' : ''} ${autoAdvanceCountdown ? 'lms-player-container--countdown' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Left edge overlay button */}
                  {previousLecture && (
                    <button
                      type="button"
                      className="lms-player-edge-btn lms-player-edge-btn--left"
                      onClick={() => selectLecture(previousLecture.id)}
                      aria-label="Bài học trước"
                    >
                      <LeftOutlined />
                    </button>
                  )}

                  {/* Right edge overlay button */}
                  {nextLecture && (
                    <button
                      type="button"
                      className="lms-player-edge-btn lms-player-edge-btn--right"
                      onClick={() => selectLecture(nextLecture.id)}
                      aria-label="Bài học tiếp theo"
                    >
                      <RightOutlined />
                    </button>
                  )}

                  {playerMode === 'bunny' && bunnyEmbedUrl ? (
                    <div className="lms-video-frame">
                      <iframe
                        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="lms-video-frame__iframe"
                        loading="lazy"
                        ref={iframeRef}
                        src={bunnyEmbedUrl}
                        title={currentLecture.name}
                      />
                    </div>
                  ) : null}

                  {playerMode === 'native' && nativeVideoUrl ? (
                    <div className="lms-video-frame lms-video-frame--native">
                      <video
                        className="lms-video-frame__video"
                        onEnded={handleNativeEnded}
                        onError={handleNativeError}
                        onLoadedMetadata={handleNativeLoadedMetadata}
                        onPause={handleNativePause}
                        onPlay={handleNativePlay}
                        onSeeked={handleNativeSeeked}
                        onTimeUpdate={handleNativeTimeUpdate}
                        playsInline
                        preload="metadata"
                        ref={videoRef}
                        src={nativeVideoUrl}
                      />
                    </div>
                  ) : null}

                  {playerMode === 'empty' ? (
                    <div className="lms-video-empty">
                      <div className="lms-video-empty__content">
                        <Title level={4}>Video chưa sẵn sàng</Title>
                        <Text type="secondary">
                          Bài học đã có khung nội dung nhưng video Bunny vẫn chưa sẵn để phát.
                        </Text>
                      </div>
                    </div>
                  ) : null}

                  {/* Custom Controls Bar */}
                  <div aria-label="Điều khiển học tập" className="lms-learning-controlbar">
                    {/* Edge-to-edge interactive Timeline Slider */}
                    <div className="lms-custom-timeline-container">
                      <input
                        type="range"
                        min={0}
                        max={currentLectureDuration || 100}
                        value={playerTelemetry.currentTime || 0}
                        onChange={(e) => {
                          const nextTime = Number(e.target.value);
                          void handleSeekTo(nextTime);
                        }}
                        style={{
                          background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${
                            currentLectureDuration > 0
                              ? (playerTelemetry.currentTime / currentLectureDuration) * 100
                              : 0
                          }%, rgba(255,255,255,0.24) ${
                            currentLectureDuration > 0
                              ? (playerTelemetry.currentTime / currentLectureDuration) * 100
                              : 0
                          }%, rgba(255,255,255,0.24) 100%)`,
                        }}
                        className="lms-custom-player-slider"
                      />
                    </div>

                    <div className="lms-custom-controls-toolbar">
                      {/* Left actions */}
                      <div className="lms-custom-controls-group lms-custom-controls-group--left">
                        {/* Play / Pause */}
                        <Tooltip title={!canUsePlaybackControls ? playerControlHint : undefined}>
                          <button
                            type="button"
                            disabled={!canUsePlaybackControls}
                            onClick={() => void handleTogglePlayback()}
                            className="lms-custom-control-btn lms-custom-control-btn--play"
                            aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
                          >
                            {isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                          </button>
                        </Tooltip>

                        {/* Rewind 10s */}
                        <Tooltip title={!canUseSeekControls ? playerControlHint : undefined}>
                          <button
                            type="button"
                            disabled={!canUseSeekControls}
                            onClick={() => void handleSeekBy(-10)}
                            className="lms-custom-control-btn"
                            aria-label="Tua lại 10 giây"
                          >
                            <BackwardOutlined />
                          </button>
                        </Tooltip>

                        {/* Playback Rate (Speed) button, e.g. "1x" */}
                        <Tooltip title={!canUseRateControls ? playbackRateHint : undefined}>
                          <button
                            type="button"
                            disabled={!canUseRateControls}
                            onClick={handleTogglePlaybackRate}
                            className="lms-custom-control-btn lms-custom-control-btn--rate"
                            aria-label="Tốc độ phát"
                          >
                            {playbackRate}x
                          </button>
                        </Tooltip>

                        {/* Restart from beginning (Undo arrow) */}
                        <Tooltip title={!canUseSeekControls ? playerControlHint : undefined}>
                          <button
                            type="button"
                            disabled={!canUseSeekControls}
                            onClick={handleRestart}
                            className="lms-custom-control-btn"
                            aria-label="Phát lại từ đầu"
                          >
                            <UndoOutlined />
                          </button>
                        </Tooltip>

                        {/* Timestamp */}
                        <span className="lms-custom-control-time">
                          {formatTimestamp(playerTelemetry.currentTime)} /{' '}
                          {formatTimestamp(currentLectureDuration)}
                        </span>

                        {/* Quick note badge */}
                        <button
                          type="button"
                          onClick={handleOpenNoteComposer}
                          className="lms-custom-control-btn lms-custom-control-btn--note"
                          aria-label="Thêm ghi chú"
                          title="Thêm ghi chú nhanh"
                        >
                          <FileTextOutlined />
                        </button>
                      </div>

                      {/* Right actions */}
                      <div className="lms-custom-controls-group lms-custom-controls-group--right">
                        {/* Volume/Mute Button */}
                        <button
                          type="button"
                          onClick={handleToggleMute}
                          className="lms-custom-control-btn"
                          aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                          title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                        >
                          {isMuted ? <AudioMutedOutlined /> : <SoundOutlined />}
                        </button>

                        {/* Document/Transcript Button */}
                        <button
                          type="button"
                          onClick={() => setActiveTab('notes')}
                          className="lms-custom-control-btn"
                          aria-label="Ghi chú bài học"
                          title="Ghi chú"
                        >
                          <FileTextOutlined />
                        </button>

                        {/* Subtitles (CC) Badge */}
                        <span className="lms-custom-control-badge-cc" title="Phụ đề">
                          CC
                        </span>

                        {/* Settings Gear */}
                        <button
                          type="button"
                          className="lms-custom-control-btn"
                          aria-label="Cài đặt"
                          title="Cài đặt"
                        >
                          <SettingOutlined />
                        </button>

                        {/* Wide screen / PIP mode (if native) */}
                        {playerMode === 'native' && (
                          <button
                            type="button"
                            onClick={handleTogglePip}
                            className="lms-custom-control-btn"
                            aria-label="Ảnh trong ảnh"
                            title="Ảnh trong ảnh"
                          >
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                              <path d="M19 11h-8v6h8v-6zm4 8V5c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 0H3V5h18v14z" />
                            </svg>
                          </button>
                        )}

                        {/* Fullscreen button */}
                        <button
                          type="button"
                          onClick={handleToggleFullscreen}
                          className="lms-custom-control-btn"
                          aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
                          title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
                        >
                          {isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Tabs
                activeKey={activeTab}
                className="lms-learning-tabs"
                items={lessonTabs}
                onChange={setActiveTab}
              />
            </div>
          ) : (
            <div className="lms-video-empty">
              <div className="lms-video-empty__content">
                <Title level={4}>Chọn bài học để bắt đầu</Title>
                <Text type="secondary">Danh sách chương và bài học nằm ở thanh bên phải.</Text>
              </div>
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}
