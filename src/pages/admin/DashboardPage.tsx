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
import { ErrorState, LoadingSkeleton } from '@/components';
import { AdminPageHead } from '@/components';
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
      <AdminPageHead subtitle="Tổng quan hiệu suất khoá học và doanh thu." title="Dashboard" />

      <div className="lms-dashboard-summary" style={{ marginBottom: 20 }}>
        <div className="lms-dashboard-summary__item">
          <div className="lms-dashboard-summary__icon lms-dashboard-summary__icon--courses">
            <BookOutlined />
          </div>
          <div className="lms-dashboard-summary__body">
            <span className="lms-dashboard-summary__value">{overview?.totalCourses ?? 0}</span>
            <span className="lms-dashboard-summary__label">Tổng khoá học</span>
          </div>
        </div>
        <div className="lms-dashboard-summary__item">
          <div className="lms-dashboard-summary__icon lms-dashboard-summary__icon--purchased">
            <UserOutlined />
          </div>
          <div className="lms-dashboard-summary__body">
            <span className="lms-dashboard-summary__value">{overview?.purchasedCourses ?? 0}</span>
            <span className="lms-dashboard-summary__label">Đã bán</span>
          </div>
        </div>
        <div className="lms-dashboard-summary__item">
          <div className="lms-dashboard-summary__icon lms-dashboard-summary__icon--revenue">
            <DollarOutlined />
          </div>
          <div className="lms-dashboard-summary__body">
            <span className="lms-dashboard-summary__value">{currencyFormatter.format(overview?.revenue ?? 0)}</span>
            <span className="lms-dashboard-summary__label">Doanh thu</span>
          </div>
        </div>
      </div>

      <div className="lms-dashboard-secondary" style={{ marginBottom: 24 }}>
        <div className="lms-dashboard-secondary__card">
          <div className="lms-dashboard-secondary__icon lms-dashboard-secondary__icon--rating">
            <StarOutlined />
          </div>
          <div>
            <div className="lms-dashboard-secondary__value">{overview?.averageRating?.toFixed(1) ?? '0'}</div>
            <div className="lms-dashboard-secondary__label">Rating TB</div>
          </div>
        </div>
        <div className="lms-dashboard-secondary__card">
          <div className="lms-dashboard-secondary__icon lms-dashboard-secondary__icon--reviews">
            <TrophyOutlined />
          </div>
          <div>
            <div className="lms-dashboard-secondary__value">{overview?.totalReviews ?? 0}</div>
            <div className="lms-dashboard-secondary__label">Tổng review</div>
          </div>
        </div>
        <div className="lms-dashboard-secondary__card">
          <div className="lms-dashboard-secondary__icon lms-dashboard-secondary__icon--discussions">
            <CommentOutlined />
          </div>
          <div>
            <div className="lms-dashboard-secondary__value">{overview?.totalDiscussions ?? 0}</div>
            <div className="lms-dashboard-secondary__label">Thảo luận</div>
          </div>
        </div>
      </div>

      <Card title="Leaderboard khoá học">
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
