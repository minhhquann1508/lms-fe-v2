import { Button, Modal, Space, Tag, Typography } from 'antd';
import {
  ClockCircleOutlined,
  ExclamationCircleFilled,
  LaptopOutlined,
  LogoutOutlined,
  MobileOutlined,
} from '@ant-design/icons';
import { colors } from '@/config/theme';
import type { ActiveLoginDevice } from '@/types';

interface DeviceLimitModalProps {
  open: boolean;
  activeDevices: ActiveLoginDevice[];
  onClose: () => void;
  onRevokeEarliest?: () => void;
  revoking?: boolean;
}

function getDeviceIcon(deviceType?: string | null) {
  return deviceType === 'mobile' ? <MobileOutlined /> : <LaptopOutlined />;
}

function formatDate(value?: string | Date | null) {
  if (!value) return 'Chưa rõ thời gian';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa rõ thời gian';

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export default function DeviceLimitModal({
  open,
  activeDevices,
  onClose,
  onRevokeEarliest,
  revoking = false,
}: DeviceLimitModalProps) {
  const hasEarliestSession = activeDevices.length > 0;
  // Sessions are sorted by loginAt DESC (most recent first); the last item is the earliest.
  const earliestDevice = hasEarliestSession ? activeDevices[activeDevices.length - 1] : null;

  return (
    <Modal
      centered
      className="device-limit-modal"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button key="close" size="large" onClick={onClose}>
            Đã hiểu
          </Button>
          {onRevokeEarliest && hasEarliestSession && (
            <Button
              key="revoke"
              type="primary"
              size="large"
              loading={revoking}
              icon={<LogoutOutlined />}
              onClick={onRevokeEarliest}
            >
              Đăng xuất phiên cũ &amp; đăng nhập
            </Button>
          )}
        </div>
      }
      onCancel={onClose}
      open={open}
      title={null}
      width={560}
    >
      <div className="device-limit-modal__content">
        <div className="device-limit-modal__hero">
          <div className="device-limit-modal__icon-wrap">
            <ExclamationCircleFilled className="device-limit-modal__icon" />
          </div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Đã đạt giới hạn đăng nhập
          </Typography.Title>
          <Typography.Paragraph
            style={{
              color: colors.textSecondary,
              fontSize: 16,
              margin: '8px 0 0',
            }}
          >
            Tài khoản này đang được sử dụng trên số thiết bị tối đa. Bạn cần đăng xuất ở một thiết
            bị khác trước khi đăng nhập tại đây.
          </Typography.Paragraph>
        </div>

        <div className="device-limit-modal__section-title">
          <span>Thiết bị đang đăng nhập</span>
          <Tag color="warning">{activeDevices.length || 'Không rõ'}</Tag>
        </div>

        <div className="device-limit-modal__devices">
          {activeDevices.length > 0 ? (
            activeDevices.map((device, index) => (
              <div
                className="device-limit-modal__device"
                key={device.deviceId || `${device.deviceName}-${index}`}
                style={{ animationDelay: `${120 + index * 80}ms` }}
              >
                <div className="device-limit-modal__device-icon">
                  {getDeviceIcon(device.deviceType)}
                </div>
                <div className="device-limit-modal__device-body">
                  <Space size={8} wrap>
                    <Typography.Text strong>
                      {device.deviceName || 'Thiết bị chưa đặt tên'}
                    </Typography.Text>
                    <Tag color={device.deviceType === 'mobile' ? 'blue' : 'purple'}>
                      {device.deviceType === 'mobile' ? 'Mobile' : 'Desktop'}
                    </Tag>
                  </Space>
                  <Space size={6} className="device-limit-modal__time">
                    <ClockCircleOutlined />
                    <Typography.Text type="secondary">
                      Lần đăng nhập gần nhất: {formatDate(device.lastLoginAt)}
                    </Typography.Text>
                  </Space>
                  {device.ipAddress ? (
                    <Typography.Text type="secondary">IP: {device.ipAddress}</Typography.Text>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="device-limit-modal__empty">
              Chưa lấy được danh sách thiết bị. Bạn vẫn cần đăng xuất ở một phiên đang hoạt động rồi
              thử lại.
            </div>
          )}
        </div>

        <div className="device-limit-modal__hint">
          {onRevokeEarliest && earliestDevice
            ? `Bạn có thể đăng xuất phiên đăng nhập sớm nhất trên "${earliestDevice.deviceName || 'thiết bị chưa đặt tên'}" để tiếp tục đăng nhập tại đây.`
            : 'Mở thiết bị đang dùng tài khoản này, chọn Đăng xuất, sau đó quay lại đăng nhập tại đây.'}
        </div>
      </div>
    </Modal>
  );
}
