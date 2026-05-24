import axios from './axios-instance';
import type { ApiEnvelope, DeviceListResponse } from '@/types';

export const deviceService = {
  getMyDevices(): Promise<ApiEnvelope<DeviceListResponse>> {
    return axios.get('/devices/me') as Promise<ApiEnvelope<DeviceListResponse>>;
  },
};
