import { useQuery } from '@tanstack/react-query';
import {
  AlertOutlined,
  BookOutlined,
  CommentOutlined,
  DollarOutlined,
  ReadOutlined,
  StarOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Card, Empty, Table, Tabs, Tag } from 'antd';
import { ErrorState, LoadingSkeleton, PageHeader, StatCard } from '@/components';
import { colors } from '@/config/theme';
import { queryKeys } from '@/config/query-keys';
import { dashboardService } from '@/services';
import { usePageTitle } from '@/hooks';
import type { DashboardCourseLeaderboardItem } from '@/types';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  currency: 'VND',
  maximumFractionDigits: 0,
  style: 'currency',
});

const leaderboardColumns = [
  { title: 'Khoá học', dataIndex: 'name', key: 'name', ellipsis: true },
  {
    title: 'Học viên',
    dataIndex: 'purchasedCount',
    key: 'purchasedCount',
    width: 120,
  },
  {
    title: 'Tiến độ TB',
    dataIndex: 'averageProgress',
    key: 'averageProgress',
    render: (value: number) => `${value.toFixed(0)}%`,
    width: 120,
  },
  {
    title: 'Rating',
    dataIndex: 'rating',
    key: 'rating',
    render: (value: number) => <Tag color="gold">{value.toFixed(1)}</Tag>,
    width: 100,
  },
  {
    title: 'Thảo luận',
    dataIndex: 'discussionCount',
    key: 'discussionCount',
    width: 110,
  },
  {
    title: 'Doanh thu',
    dataIndex: 'revenue',
    key: 'revenue',
    render: (value: number) => currencyFormatter.format(value || 0),
    width: 140,
  },
];

export default function DashboardPage() {
  usePageTitle('Dashboard');

  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: queryKeys.dashboard.overview,
    queryFn: dashboardService.getOverview,
  });

  const {
    data: highlights,
    isLoading: highlightsLoading,
    isError: highlightsError,
    refetch: refetchHighlights,
  } = useQuery({
    queryKey: queryKeys.dashboard.courseHighlights(5),
    queryFn: () => dashboardService.getCourseHighlights(5),
  });

  if (overviewLoading) return <LoadingSkeleton variant="page-content" />;
  if (overviewError) return <ErrorState onRetry={() => refetchOverview()} />;

  const stats = [
    {
      title: 'Tổng khoá học',
      value: overview?.totalCourses ?? 0,
      icon: <BookOutlined />,
      color: colors.primary,
    },
    {
      title: 'Đã bán',
      value: overview?.purchasedCourses ?? 0,
      icon: <UserOutlined />,
      color: colors.success,
    },
    {
      title: 'Doanh thu',
      value: currencyFormatter.format(overview?.revenue ?? 0),
      icon: <DollarOutlined />,
      color: colors.warning,
    },
    {
      title: 'Rating TB',
      value: overview?.averageRating?.toFixed(1) ?? '0',
      icon: <StarOutlined />,
      color: colors.info,
    },
    {
      title: 'Tổng review',
      value: overview?.totalReviews ?? 0,
      icon: <TrophyOutlined />,
      color: colors['brand-purple'],
    },
    {
      title: 'Thảo luận',
      value: overview?.totalDiscussions ?? 0,
      icon: <CommentOutlined />,
      color: colors['brand-cyan'],
    },
  ];

  const leaderboardTabs = [
    {
      key: 'mostStudied',
      label: 'Học nhiều',
      icon: <ReadOutlined />,
      rows: highlights?.mostStudied,
    },
    {
      key: 'highestRated',
      label: 'Rating cao',
      icon: <StarOutlined />,
      rows: highlights?.highestRated,
    },
    {
      key: 'mostDiscussed',
      label: 'Thảo luận nhiều',
      icon: <CommentOutlined />,
      rows: highlights?.mostDiscussed,
    },
    {
      key: 'bestSelling',
      label: 'Bán chạy',
      icon: <DollarOutlined />,
      rows: highlights?.bestSelling,
    },
    {
      key: 'needsAttention',
      label: 'Cần chú ý',
      icon: <AlertOutlined />,
      rows: highlights?.needsAttention,
    },
  ];

  return (
    <div>
      <PageHeader subtitle="Tổng quan hiệu suất khoá học và doanh thu." title="Dashboard" />
      <div
        className="lms-grid"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}
      >
        {stats.map((stat) => (
          <StatCard
            accentColor={stat.color}
            icon={stat.icon}
            key={stat.title}
            title={stat.title}
            value={stat.value}
          />
        ))}
      </div>

      <Card style={{ marginTop: 'var(--spacing-6)' }} title="Leaderboard khoá học">
        {highlightsLoading ? (
          <LoadingSkeleton count={5} variant="table-row" />
        ) : highlightsError ? (
          <ErrorState inline onRetry={() => refetchHighlights()} />
        ) : (
          <Tabs
            items={leaderboardTabs.map((tab) => ({
              key: tab.key,
              label: (
                <span>
                  {tab.icon} {tab.label}
                </span>
              ),
              children: tab.rows?.length ? (
                <Table<DashboardCourseLeaderboardItem>
                  columns={leaderboardColumns}
                  dataSource={tab.rows}
                  pagination={false}
                  rowKey="id"
                  size="small"
                />
              ) : (
                <Empty
                  description="Chưa có dữ liệu leaderboard."
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }))}
          />
        )}
      </Card>
    </div>
  );
}
