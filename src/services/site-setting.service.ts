import axios from './axios-instance';
import type { ApiEnvelope, SiteSetting } from '@/types';

export const siteSettingService = {
  async get(): Promise<SiteSetting> {
    const res = (await axios.get('/site-settings')) as unknown as ApiEnvelope<SiteSetting>;
    return res.data;
  },
};
