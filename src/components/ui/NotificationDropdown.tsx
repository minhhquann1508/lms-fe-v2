import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Popover, Typography, message } from 'antd';
import {
  BellOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { queryKeys } from '@/config/query-keys';
import { notificationService } from '@/services';
import { useAuthStore } from '@/store/auth.store';
import { colors } from '@/config/theme';
import type { Notification } from '@/types';

const { Text } = Typography;

function formatTimeAgo(value: string) {
  const now = Date.now();
  const diff = now - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

const NOTIFICATION_CONFIG: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  'enrollment.approved': {
    icon: <CheckCircleOutlined />,
    bg: 'rgba(34, 197, 94, 0.12)',
    color: '#16a34a',
  },
  'enrollment.rejected': {
    icon: <CloseCircleOutlined />,
    bg: 'rgba(239, 68, 68, 0.12)',
    color: '#dc2626',
  },
  'enrollment.new': {
    icon: <InfoCircleOutlined />,
    bg: 'rgba(37, 99, 235, 0.12)',
    color: colors['brand-blue'],
  },
};

function getConfig(type: string) {
  return (
    NOTIFICATION_CONFIG[type] ?? {
      icon: <InfoCircleOutlined />,
      bg: 'rgba(37, 99, 235, 0.12)',
      color: colors['brand-blue'],
    }
  );
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const navigate = useNavigate();
  const config = getConfig(notification.type);

  return (
    <button
      className={`lms-ntf-item ${notification.isRead ? '' : 'lms-ntf-item--unread'}`}
      onClick={async () => {
        try {
          if (notification.link) {
            navigate(notification.link);
          }
        } catch {
          message.error('Không thể mở thông báo lúc này');
        }
      }}
      type="button"
    >
      <span className="lms-ntf-item__icon" style={{ background: config.bg, color: config.color }}>
        {config.icon}
      </span>
      <span className="lms-ntf-item__body">
        <span className="lms-ntf-item__title">{notification.title}</span>
        <span className="lms-ntf-item__message">{notification.message}</span>
        <span className="lms-ntf-item__time">{formatTimeAgo(notification.createdAt)}</span>
      </span>
      {!notification.isRead ? (
        <span
          className="lms-ntf-item__mark"
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead(notification.id);
          }}
          title="Đánh dấu đã đọc"
        >
          <CheckOutlined />
        </span>
      ) : null}
    </button>
  );
}

export default function NotificationDropdown() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'unread' | 'read'>('unread');

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications.my({ page: 1, limit: 20 }),
    queryFn: () => notificationService.getMy({ page: 1, limit: 20 }),
    enabled: !!user,
  });

  const items = notificationsQuery.data?.items ?? [];
  const unreadItems = items.filter((n) => !n.isRead);
  const readItems = items.filter((n) => n.isRead);
  const displayItems = tab === 'unread' ? unreadItems : readItems;
  const unreadCount = unreadItems.length;

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });

  const content = (
    <div className="lms-ntf-dropdown">
      <div className="lms-ntf-dropdown__header">
        <Text strong>Thông báo</Text>
        {unreadCount > 0 ? (
          <Text className="lms-ntf-dropdown__count" type="secondary">
            {unreadCount} chưa đọc
          </Text>
        ) : null}
      </div>

      <div className="lms-ntf-dropdown__tabs">
        <button
          className={`lms-ntf-dropdown__tab ${tab === 'unread' ? 'lms-ntf-dropdown__tab--active' : ''}`}
          onClick={() => setTab('unread')}
          type="button"
        >
          Chưa đọc {unreadCount > 0 ? `(${unreadCount})` : ''}
        </button>
        <button
          className={`lms-ntf-dropdown__tab ${tab === 'read' ? 'lms-ntf-dropdown__tab--active' : ''}`}
          onClick={() => setTab('read')}
          type="button"
        >
          Đã đọc {readItems.length > 0 ? `(${readItems.length})` : ''}
        </button>
      </div>

      <div className="lms-ntf-dropdown__list">
        {displayItems.length === 0 ? (
          <div className="lms-ntf-dropdown__empty">
            {tab === 'unread' ? 'Không có thông báo chưa đọc' : 'Không có thông báo đã đọc'}
          </div>
        ) : (
          displayItems.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={(id) => markAsReadMutation.mutate(id)}
            />
          ))
        )}
      </div>

      <Link className="lms-ntf-dropdown__footer" to="/profile">
        Xem tất cả thông báo
      </Link>
    </div>
  );

  return (
    <Popover
      align={{ offset: [0, 8] }}
      content={content}
      onOpenChange={(visible) => {
        if (visible && !notificationsQuery.data) {
          void notificationsQuery.refetch();
        }
      }}
      overlayClassName="lms-ntf-popover"
      placement="bottomRight"
      trigger="click"
    >
      <div className="lms-notification-trigger-wrap">
        <Button
          aria-label={unreadCount ? `${unreadCount} thông báo chưa đọc` : 'Thông báo'}
          className="lms-notification-trigger"
          icon={<BellOutlined />}
          shape="circle"
          type="text"
        />
        {unreadCount > 0 ? (
          <span className="lms-ntf-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        ) : null}
      </div>
    </Popover>
  );
}
