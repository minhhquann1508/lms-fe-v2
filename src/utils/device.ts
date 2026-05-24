/**
 * Device utility — generates and persists device metadata for auth requests.
 * deviceUid is stored in localStorage to ensure the same browser is recognized
 * as the same device across login sessions.
 */

export const DEVICE_UID_KEY = 'device-uid';

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Reads deviceUid from localStorage if valid UUID v4, otherwise generates
 * a new one and persists it. Wrapped in try/catch so it never throws even
 * when localStorage is disabled (e.g. Safari private mode).
 */
export function readOrCreateDeviceUid(): string {
  try {
    const stored = localStorage.getItem(DEVICE_UID_KEY);
    if (stored && UUID_V4_RE.test(stored)) return stored;
  } catch {
    /* localStorage may be disabled */
  }

  const next =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : // fallback: pseudo UUID v4 (only when browser lacks crypto.randomUUID)
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });

  try {
    localStorage.setItem(DEVICE_UID_KEY, next);
  } catch {
    /* ignore write failures */
  }
  return next;
}

/**
 * Detects device type based on user-agent and pointer capabilities.
 * Returns 'mobile' when UA contains 'mobi' (case-insensitive) or
 * matchMedia reports coarse pointer. Otherwise returns 'desktop'.
 * NEVER returns 'web'.
 */
export function detectDeviceType(): 'mobile' | 'desktop' {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('mobi')) return 'mobile';
  if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) {
    return 'mobile';
  }
  return 'desktop';
}

function detectBrowser(ua: string): string {
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Unknown';
}

function detectOS(ua: string): string {
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown';
}

/**
 * Generates device metadata to include in auth requests.
 */
export function getDeviceInfo() {
  const ua = navigator.userAgent;
  return {
    deviceUid: readOrCreateDeviceUid(),
    deviceName: detectBrowser(ua),
    deviceType: detectDeviceType(),
    os: detectOS(ua),
    browser: detectBrowser(ua),
    userAgent: ua,
  };
}

/**
 * Clears the persisted deviceUid from localStorage.
 * Exported for testing purposes.
 */
export function clearDeviceUid(): void {
  try {
    localStorage.removeItem(DEVICE_UID_KEY);
  } catch {
    /* ignore */
  }
}
