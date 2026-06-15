export interface CreateDeviceDto {
  deviceUid: string;
  deviceName: string;
  deviceType: 'mobile' | 'desktop';
  os: string;
  browser: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  device: CreateDeviceDto;
  force?: boolean;
  revokeSessionId?: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  device: CreateDeviceDto;
}

export interface UserInfo {
  avatar: string | null;
  email: string;
  id: string;
  roleCode: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  token: string;
  userInfo: UserInfo;
}

export interface ActiveLoginDevice {
  sessionId?: string;
  deviceId: string;
  deviceName?: string | null;
  deviceType?: 'mobile' | 'desktop' | string | null;
  os?: string | null;
  browser?: string | null;
  ipAddress?: string | null;
  lastLoginAt?: string | Date | null;
}

export interface AccountInUseDetails {
  activeDevices?: ActiveLoginDevice[];
}
