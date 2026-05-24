import type { AccountInUseDetails, ActiveLoginDevice } from '@/types';

export const ACCOUNT_IN_USE_CODE = 'ACCOUNT_IN_USE_ON_ANOTHER_DEVICE';

export function getActiveDevices(details: unknown): ActiveLoginDevice[] {
  const value = details as AccountInUseDetails | undefined;
  return Array.isArray(value?.activeDevices) ? value.activeDevices : [];
}

export function decodeDeviceLimitDetails(value: string | null): ActiveLoginDevice[] {
  if (!value) return [];

  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const details = JSON.parse(new TextDecoder().decode(bytes));

    return getActiveDevices(details);
  } catch {
    return [];
  }
}
