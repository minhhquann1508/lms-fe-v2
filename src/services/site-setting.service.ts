import axios from './axios-instance';
import type { ApiEnvelope, SiteSetting } from '@/types';

export const siteSettingService = {
  async get(): Promise<SiteSetting> {
    const res = (await axios.get('/site-settings')) as unknown as ApiEnvelope<SiteSetting>;
    return res.data;
  },

  async update(data: Partial<SiteSetting>): Promise<SiteSetting> {
    const res = (await axios.put('/site-settings', data)) as unknown as ApiEnvelope<SiteSetting>;
    return res.data;
  },
};
