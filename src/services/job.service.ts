import axios from './axios-instance';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

export const jobService = {
  async getStatus(jobId: string): Promise<JobStatus> {
    const response = await axios.get(`/job/${jobId}`);
    return (response as unknown as { data: { status: JobStatus } }).data.status;
  },

  async waitForCompletion(
    jobId: string,
    options?: {
      intervalMs?: number;
      maxAttempts?: number;
      onStatus?: (status: JobStatus) => void;
    },
  ): Promise<JobStatus> {
    const intervalMs = options?.intervalMs ?? 3000;
    const maxAttempts = options?.maxAttempts ?? 80;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const status = await this.getStatus(jobId);
      options?.onStatus?.(status);

      if (status === 'DONE' || status === 'FAILED') {
        return status;
      }

      await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
    }

    throw new Error('Job timed out');
  },
};
