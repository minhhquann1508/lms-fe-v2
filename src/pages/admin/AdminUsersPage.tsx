import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import { PlusOutlined, UserOutlined, BookOutlined } from '@ant-design/icons';
import { EmptyState, ErrorState, LoadingSkeleton, AdminPageHead, AdminButton, AdminSearchInput, AdminFilterSelect, ItemPickerModal } from '@/components';
import { queryKeys } from '@/config/query-keys';
import { userService, courseService, enrollmentService } from '@/services';
import { useDebounce, usePageTitle } from '@/hooks';
import { ADMIN, SUPER_ADMIN, USER } from '@/constants';
import type { User } from '@/types';
import type { PickerItem } from '@/components/admin/ItemPickerModal';

const ROLE_OPTIONS = [
  { label: 'User', value: USER },
  { label: 'Admin', value: ADMIN },
  { label: 'Super Admin', value: SUPER_ADMIN },
];

export default function AdminUsersPage() {
  usePageTitle('Quản lý người dùng');
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleCodeFilter, setRoleCodeFilter] = useState<string | undefined>();
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>();
  const debouncedSearch = useDebounce(search, 300);
  const limit = 10;

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFileContent, setImportFileContent] = useState<string>('');
  const [createRole, setCreateRole] = useState(USER);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.users.list({
      page,
      limit,
      search: debouncedSearch,
      roleCode: roleCodeFilter,
      isActive: isActiveFilter,
    }),
    queryFn: () =>
      userService.getAll({
        page,
        limit,
        search: debouncedSearch,
        roleCode: roleCodeFilter,
        isActive: isActiveFilter,
      }),
  });

  const invalidateUsers = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
  };

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, roleCode }: { userId: string; roleCode: string }) =>
      userService.updateRole(userId, roleCode),
    onSuccess: () => {
      message.success('Đã cập nhật vai trò');
      invalidateUsers();
    },
    onError: () => message.error('Không thể cập nhật vai trò'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (userId: string) => userService.toggleActive(userId),
    onSuccess: () => {
      message.success('Đã cập nhật trạng thái');
      invalidateUsers();
    },
    onError: () => message.error('Không thể cập nhật trạng thái'),
  });

  const createUserMutation = useMutation({
    mutationFn: (payload: {
      email: string;
      password: string;
      fullName: string;
      roleCode: string;
    }) => userService.createUser(payload),
    onSuccess: () => {
      message.success('Đã tạo người dùng mới');
      setCreateModalOpen(false);
      invalidateUsers();
    },
    onError: () => message.error('Không thể tạo người dùng'),
  });

  const importMutation = useMutation({
    mutationFn: (users: Array<{ email: string; fullName: string }>) =>
      userService.bulkImport(users),
    onSuccess: (result) => {
      message.success(
        `Đã tạo ${result.created} người dùng, bỏ qua ${result.skipped} bản ghi.` +
          (result.errors.length ? ` ${result.errors.length} lỗi.` : ''),
      );
      setImportModalOpen(false);
      invalidateUsers();
    },
    onError: () => message.error('Không thể import người dùng'),
  });

  const handleBulkImport = () => {
    try {
      const lines = importFileContent.trim().split('\n').filter(Boolean);
      const users = lines.map((line) => {
        const parts = line.split(',').map((s) => s.trim());
        return { email: parts[0], fullName: parts[1] ?? parts[0] };
      });
      if (!users.length) {
        message.warning('Vui lòng nhập ít nhất một dòng');
        return;
      }
      importMutation.mutate(users);
    } catch {
      message.error('Định dạng dữ liệu không hợp lệ');
    }
  };

  const columns = [
    {
      title: 'Người dùng',
      key: 'user',
      render: (_: unknown, record: User) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
          <Avatar src={record.avatar} icon={!record.avatar ? <UserOutlined /> : undefined} />
          <div>
            <div style={{ fontWeight: 700 }}>{record.fullName}</div>
            <div
              style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-caption)' }}
            >
              {record.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Vai trò',
      key: 'roleCode',
      render: (_: unknown, record: User) => (
        <Select
          defaultValue={record.roleCode}
          onChange={(value) => updateRoleMutation.mutate({ userId: record.id, roleCode: value })}
          options={ROLE_OPTIONS}
          size="small"
          style={{ width: 130 }}
          variant="borderless"
        />
      ),
      width: 150,
    },
    {
      title: 'Trạng thái',
      key: 'isActive',
      render: (_: unknown, record: User) => (
        <Tag
          color={record.isActive ? 'green' : 'red'}
          style={{ cursor: 'pointer' }}
          onClick={() => toggleActiveMutation.mutate(record.id)}
        >
          {record.isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
      width: 110,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => new Date(value).toLocaleDateString('vi-VN'),
      width: 120,
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: unknown, record: User) => (
        <button
          className="lms-admin-table-action"
          title="Thêm vào khoá học"
          aria-label="Thêm người dùng vào khoá học"
          onClick={() => {
            setCoursePickerForUser(record.id);
            setCoursePickerOpen(true);
          }}
        >
          <BookOutlined />
        </button>
      ),
    },
  ];

  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [coursePickerOpen, setCoursePickerOpen] = useState(false);
  const [coursePickerForUser, setCoursePickerForUser] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const addCoursesMutation = useMutation({
    mutationFn: async ({ userIds, courseIds }: { userIds: string[]; courseIds: string[] }) => {
      let created = 0;
      let skipped = 0;
      for (const courseId of courseIds) {
        const res = await enrollmentService.addDirect(courseId, userIds);
        created += res.created;
        skipped += res.skipped;
      }
      return { created, skipped };
    },
    onSuccess: (res) => {
      message.success(`Đã thêm ${res.created} bản ghi`);
      if (res.skipped > 0) message.info(`${res.skipped} bản ghi đã tồn tại`);
      setCoursePickerOpen(false);
      setUserPickerOpen(false);
      setCoursePickerForUser(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });
    },
    onError: () => message.error('Không thể thêm khoá học'),
  });

  return (
    <div>
      <AdminPageHead
        title="Quản lý người dùng"
        subtitle="Quản lý người dùng, phân quyền và trạng thái tài khoản."
      />

      <div className="lms-admin-courses-toolbar" style={{ marginTop: 24 }}>
        <div className="lms-admin-toolbar-left">
          <AdminSearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
          />
          <AdminFilterSelect
            value={roleCodeFilter ?? 'all'}
            onChange={(v) => {
              setRoleCodeFilter(v === 'all' ? undefined : v);
              setPage(1);
            }}
            options={[
              { label: 'Tất cả vai trò', value: 'all' },
              ...ROLE_OPTIONS,
            ]}
            ariaLabel="Lọc vai trò"
          />
          <AdminFilterSelect
            value={
              isActiveFilter === undefined ? 'all' : isActiveFilter ? 'active' : 'inactive'
            }
            onChange={(v) => {
              setIsActiveFilter(v === 'all' ? undefined : v === 'active');
              setPage(1);
            }}
            options={[
              { label: 'Tất cả trạng thái', value: 'all' },
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ]}
            ariaLabel="Lọc trạng thái"
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <AdminButton
            variant="outline-accent"
            icon={<BookOutlined />}
            onClick={() => setUserPickerOpen(true)}
          >
            Thêm vào khoá học
          </AdminButton>
          <AdminButton
            variant="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
          >
            Tạo người dùng
          </AdminButton>
        </div>
      </div>

      {isError ? <ErrorState inline onRetry={() => refetch()} /> : null}
      {isLoading ? <LoadingSkeleton count={8} variant="table-row" /> : null}
      {!isLoading && !isError && !data?.items?.length ? (
        <EmptyState
          description="Thử đổi từ khóa, vai trò hoặc trạng thái tài khoản."
          title="Không có người dùng phù hợp"
        />
      ) : null}
      {!isLoading && !isError && data?.items?.length ? (
        <Table<User>
          columns={columns}
          dataSource={data?.items}
          pagination={{
            current: page,
            onChange: setPage,
            pageSize: limit,
            showSizeChanger: false,
            total: data?.total,
          }}
          rowKey="id"
        />
      ) : null}

      {/* Create User Modal */}
      <Modal
        footer={null}
        onCancel={() => setCreateModalOpen(false)}
        open={createModalOpen}
        title="Tạo người dùng mới"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const formData = new FormData(form);
            createUserMutation.mutate({
              email: formData.get('email') as string,
              password: formData.get('password') as string,
              fullName: formData.get('fullName') as string,
              roleCode: createRole,
            });
          }}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Input name="email" placeholder="Email" type="email" required size="large" />
            <Input name="fullName" placeholder="Họ tên" required size="large" />
            <Input.Password name="password" placeholder="Mật khẩu" required size="large" />
            <Select
              onChange={(value) => setCreateRole(value)}
              options={ROLE_OPTIONS}
              size="large"
              style={{ width: '100%' }}
              value={createRole}
            />
            <Button
              block
              htmlType="submit"
              loading={createUserMutation.isPending}
              size="large"
              type="primary"
            >
              Tạo người dùng
            </Button>
          </Space>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal
        footer={null}
        onCancel={() => setImportModalOpen(false)}
        open={importModalOpen}
        title="Import người dùng (CSV)"
      >
        <div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: 13 }}>
            Mỗi dòng một người dùng, định dạng: <code>email, họ tên</code>
          </p>
          <Input.TextArea
            onChange={(e) => setImportFileContent(e.target.value)}
            placeholder={'user1@example.com, Nguyễn Văn A\nuser2@example.com, Trần Thị B'}
            rows={8}
            value={importFileContent}
          />
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Button
              disabled={!importFileContent.trim()}
              loading={importMutation.isPending}
              onClick={handleBulkImport}
              type="primary"
            >
              Import
            </Button>
          </div>
        </div>
      </Modal>

      <ItemPickerModal
        open={userPickerOpen}
        onClose={() => setUserPickerOpen(false)}
        title="Chọn người dùng"
        placeholder="Tìm theo tên hoặc email..."
        itemLabel="người dùng"
        fetchItems={async ({ search: s, page: p, limit: l }) => {
          const res = await userService.getAll({ search: s, page: p, limit: l });
          return {
            items: res.items.map((u) => ({
              id: u.id,
              cells: [
                <span style={{ fontWeight: 600 }}>{u.fullName}</span>,
                <span style={{ color: 'var(--color-textSecondary)' }}>{u.email}</span>,
              ],
              cols: 2,
            } as PickerItem)),
            total: res.total,
          };
        }}
        onSubmit={async (ids) => {
          setSelectedUserIds(ids);
          setUserPickerOpen(false);
          setCoursePickerOpen(true);
        }}
      />

      <ItemPickerModal
        open={coursePickerOpen}
        onClose={() => {
          setCoursePickerOpen(false);
          setCoursePickerForUser(null);
          setSelectedUserIds([]);
        }}
        title={coursePickerForUser ? 'Thêm khoá học cho người dùng' : 'Chọn khoá học'}
        placeholder="Tìm theo tên khoá học..."
        itemLabel="khoá học"
        fetchItems={async ({ search: s, page: p, limit: l }) => {
          const res = await courseService.getAll({ search: s, page: p, limit: l });
          return {
            items: res.items.map((c) => ({
              id: c.id,
              cells: [
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 30, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--color-surface-soft)' }}>
                    {c.thumbnail ? (
                      <img src={c.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--color-textDisabled)', fontSize: 14 }}>
                        <BookOutlined />
                      </div>
                    )}
                  </div>
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                </div>,
              ],
              cols: 1,
            } as PickerItem)),
            total: res.total,
          };
        }}
        onSubmit={async (courseIds) => {
          const userIds = coursePickerForUser ? [coursePickerForUser] : selectedUserIds;
          return addCoursesMutation.mutateAsync({ userIds, courseIds });
        }}
        loading={addCoursesMutation.isPending}
      />
    </div>
  );
}
