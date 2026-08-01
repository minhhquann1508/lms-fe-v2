import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Avatar,
  Button,
  Card,
  Pagination,
  Segmented,
  Space,
  Tag,
  Typography,
  message,
  Input,
} from 'antd';
import { BookOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader } from '@/components';
import { queryKeys } from '@/config/query-keys';
import { enrollmentService } from '@/services';
import { useDebounce, usePageTitle } from '@/hooks';
import { shouldShowEnrollmentReviewActions } from './enrollment-actions';
import type { Enrollment } from '@/types';

const { Paragraph, Text } = Typography;

function formatDate(value?: string) {
  if (!value) {
    return '--';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function AdminEnrollmentsPage() {
  usePageTitle('Quản lý ghi danh | Admin');

  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState<string>('pending');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const enrollmentsQuery = useQuery({
    queryKey: queryKeys.enrollments.allAdmin({
      page,
      limit,
      search: debouncedSearch,
      status,
    }),
    queryFn: () =>
      enrollmentService.getAll({
        page,
        limit,
        search: debouncedSearch || undefined,
        status: status as any,
      }),
  });

  const enrollments = enrollmentsQuery.data?.items ?? [];
  const total = enrollmentsQuery.data?.total ?? 0;

  const reviewEnrollment = useMutation({
    mutationFn: ({
      enrollmentId,
      status,
    }: {
      enrollmentId: string;
      status: 'active' | 'rejected';
    }) => enrollmentService.review(enrollmentId, { status }),
    onSuccess: (_, variables) => {
      message.success(
        variables.status === 'active'
          ? 'Đã duyệt ghi danh và gửi phản hồi'
          : 'Đã từ chối ghi danh và gửi phản hồi',
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      void enrollmentsQuery.refetch();
    },
    onError: () => message.error('Không thể cập nhật trạng thái ghi danh'),
  });

  return (
    <div className="lms-admin-enrollments">
      <PageHeader
        subtitle="Quản lý yêu cầu ghi danh của học viên trên toàn hệ thống."
        title="Quản lý ghi danh"
      />

      <Card className="lms-admin-enrollments__workspace" bordered={false}>
        <div
          className="lms-admin-enrollments__toolbar"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '24px',
            justifyContent: 'space-between',
          }}
        >
          <Segmented
            options={[
              { label: 'Chờ duyệt', value: 'pending' },
              { label: 'Đã duyệt', value: 'active' },
              { label: 'Từ chối', value: 'rejected' },
            ]}
            value={status}
            onChange={(val) => {
              setStatus(val as string);
              setPage(1);
            }}
          />
          <Input
            allowClear
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tên/email học viên..."
            prefix={<SearchOutlined />}
            style={{ maxWidth: 300 }}
            value={search}
          />
        </div>

        {enrollmentsQuery.isLoading ? <LoadingSkeleton count={3} variant="card" /> : null}

        {enrollmentsQuery.isError ? (
          <ErrorState onRetry={() => enrollmentsQuery.refetch()} />
        ) : null}

        {!enrollmentsQuery.isLoading && !enrollmentsQuery.isError && !enrollments.length ? (
          <EmptyState
            description="Không có yêu cầu ghi danh nào phù hợp với bộ lọc."
            title="Không có dữ liệu"
          />
        ) : null}

        {!enrollmentsQuery.isLoading && !enrollmentsQuery.isError && enrollments.length ? (
          <>
            <div
              className="lms-admin-course-detail__approval-list"
              style={{
                display: 'grid',
                gap: '16px',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              }}
            >
              {enrollments.map((enrollment: Enrollment) => (
                <article
                  key={enrollment.id}
                  className="lms-admin-course-detail__approval-card"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--spacing-5)',
                  }}
                >
                  <div
                    className="lms-admin-course-detail__approval-head"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '16px',
                    }}
                  >
                    <div
                      className="lms-admin-course-detail__approval-user"
                      style={{ display: 'flex', gap: '12px', alignItems: 'center' }}
                    >
                      <Avatar
                        icon={!enrollment.user?.avatar ? <UserOutlined /> : undefined}
                        src={enrollment.user?.avatar ?? undefined}
                        size={40}
                      />
                      <div>
                        <div
                          className="lms-admin-course-detail__approval-name"
                          style={{ fontWeight: 600 }}
                        >
                          {enrollment.user?.fullName || enrollment.fullName || 'Học viên'}
                        </div>
                        <Text type="secondary" style={{ fontSize: '13px' }}>
                          {enrollment.user?.email || enrollment.phone || 'Chưa có liên hệ'}
                        </Text>
                      </div>
                    </div>

                    <Tag
                      className={
                        enrollment.status === 'active'
                          ? 'lms-badge-success'
                          : enrollment.status === 'rejected'
                            ? 'lms-badge-draft'
                            : 'lms-badge-info'
                      }
                    >
                      {enrollment.status === 'active'
                        ? 'Đã duyệt'
                        : enrollment.status === 'rejected'
                          ? 'Từ chối'
                          : 'Chờ duyệt'}
                    </Tag>
                  </div>

                  <div
                    style={{
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <BookOutlined style={{ color: 'var(--text-tertiary)' }} />
                    <Text strong ellipsis style={{ flex: 1, margin: 0 }}>
                      {enrollment.course?.name || 'Khoá học'}
                    </Text>
                  </div>

                  <div
                    className="lms-admin-course-detail__approval-meta"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      marginBottom: '16px',
                    }}
                  >
                    <span>Gửi lúc {formatDate(enrollment.createdAt)}</span>
                    {enrollment.approvedAt ? (
                      <span>Duyệt lúc {formatDate(enrollment.approvedAt)}</span>
                    ) : null}
                  </div>

                  {enrollment.notes ? (
                    <Paragraph
                      className="lms-admin-course-detail__approval-note"
                      style={{
                        background: 'var(--bg-subtle)',
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '14px',
                        marginBottom: '16px',
                      }}
                    >
                      {enrollment.notes}
                    </Paragraph>
                  ) : null}

                  {enrollment.reviewNote ? (
                    <Paragraph
                      className="lms-admin-course-detail__approval-note lms-admin-course-detail__approval-note--muted"
                      style={{
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        fontStyle: 'italic',
                        marginBottom: '16px',
                      }}
                    >
                      Phản hồi trước đó: {enrollment.reviewNote}
                    </Paragraph>
                  ) : null}

                  {shouldShowEnrollmentReviewActions(enrollment.status) ? (
                    <Space
                      className="lms-admin-course-detail__approval-actions"
                      size={8}
                      wrap
                      style={{ marginTop: 'auto', paddingTop: '8px' }}
                    >
                      <Button
                        loading={
                          reviewEnrollment.isPending &&
                          reviewEnrollment.variables?.enrollmentId === enrollment.id &&
                          reviewEnrollment.variables?.status === 'active'
                        }
                        onClick={() =>
                          reviewEnrollment.mutate({
                            enrollmentId: enrollment.id,
                            status: 'active',
                          })
                        }
                        type="primary"
                      >
                        Duyệt vào học
                      </Button>
                      <Button
                        danger
                        loading={
                          reviewEnrollment.isPending &&
                          reviewEnrollment.variables?.enrollmentId === enrollment.id &&
                          reviewEnrollment.variables?.status === 'rejected'
                        }
                        onClick={() =>
                          reviewEnrollment.mutate({
                            enrollmentId: enrollment.id,
                            status: 'rejected',
                          })
                        }
                      >
                        Từ chối
                      </Button>
                    </Space>
                  ) : null}
                </article>
              ))}
            </div>

            {total > limit ? (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
                <Pagination
                  current={page}
                  onChange={(p, size) => {
                    setPage(p);
                    setLimit(size);
                  }}
                  pageSize={limit}
                  showSizeChanger
                  total={total}
                />
              </div>
            ) : null}
          </>
        ) : null}
      </Card>
    </div>
  );
}
