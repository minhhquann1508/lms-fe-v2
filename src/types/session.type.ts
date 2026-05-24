export interface SessionDeviceSummary {
  deviceId: string;
  deviceUid: string;
  deviceName: string;
  deviceType: 'mobile' | 'desktop';
  os: string;
  browser: string;
  ipAddress: string;
  lastLoginAt: string;
}

export interface SessionItem {
  id: string;
  deviceId: string;
  device: SessionDeviceSummary;
  loginAt: string;
  expiredAt: string;
  isCurrent: boolean;
}

export interface SessionListResponse {
  items: SessionItem[];
}

export interface DeviceItem {
  id: string;
  deviceUid: string;
  deviceName: string;
  deviceType: 'mobile' | 'desktop';
  os: string;
  browser: string;
  ipAddress: string;
  lastLoginAt: string;
  hasActiveSession: boolean;
  isCurrent: boolean;
}

export interface DeviceListResponse {
  items: DeviceItem[];
}
