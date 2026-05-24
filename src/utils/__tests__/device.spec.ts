// Feature: auth-session-management
// Property test for device.ts utilities (detectDeviceType, readOrCreateDeviceUid)
// **Validates: Requirements R2.AC1, R2.AC2, R2.AC3, R2.AC6**

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { detectDeviceType, readOrCreateDeviceUid, clearDeviceUid, DEVICE_UID_KEY } from '../device';

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('device.ts property tests', () => {
  describe('detectDeviceType', () => {
    it('always returns "mobile" or "desktop", never "web"', () => {
      fc.assert(
        fc.property(fc.string(), (ua) => {
          // Mock navigator.userAgent with the generated string
          Object.defineProperty(navigator, 'userAgent', {
            value: ua,
            configurable: true,
          });

          // Mock matchMedia to return false so we only test UA-based detection
          Object.defineProperty(window, 'matchMedia', {
            value: vi.fn().mockReturnValue({ matches: false }),
            configurable: true,
          });

          const result = detectDeviceType();
          expect(result).toMatch(/^(mobile|desktop)$/);
          expect(result).not.toBe('web');
        }),
        { numRuns: 200 },
      );
    });

    it('returns "mobile" when UA contains "mobi" (case-insensitive)', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (prefix, suffix) => {
          // Insert 'mobi' (with random casing) into the UA
          const mobiVariants = ['mobi', 'Mobi', 'MOBI', 'moBi'];
          const variant = mobiVariants[Math.floor(Math.random() * mobiVariants.length)];
          const ua = prefix + variant + suffix;

          Object.defineProperty(navigator, 'userAgent', {
            value: ua,
            configurable: true,
          });
          Object.defineProperty(window, 'matchMedia', {
            value: vi.fn().mockReturnValue({ matches: false }),
            configurable: true,
          });

          const result = detectDeviceType();
          expect(result).toBe('mobile');
        }),
        { numRuns: 100 },
      );
    });

    it('returns "desktop" when UA does not contain "mobi" and matchMedia is false', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => !s.toLowerCase().includes('mobi')),
          (ua) => {
            Object.defineProperty(navigator, 'userAgent', {
              value: ua,
              configurable: true,
            });
            Object.defineProperty(window, 'matchMedia', {
              value: vi.fn().mockReturnValue({ matches: false }),
              configurable: true,
            });

            const result = detectDeviceType();
            expect(result).toBe('desktop');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('readOrCreateDeviceUid', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('is idempotent: N consecutive calls return the same value', () => {
      fc.assert(
        fc.property(fc.integer({ min: 2, max: 20 }), (n) => {
          localStorage.clear();
          const first = readOrCreateDeviceUid();
          for (let i = 1; i < n; i++) {
            expect(readOrCreateDeviceUid()).toBe(first);
          }
        }),
        { numRuns: 50 },
      );
    });

    it('returns a new value after localStorage is cleared', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 5 }), () => {
          localStorage.clear();
          const first = readOrCreateDeviceUid();

          localStorage.clear();
          const second = readOrCreateDeviceUid();

          // They should both be valid UUIDs but (with overwhelming probability) different
          expect(UUID_V4_RE.test(first)).toBe(true);
          expect(UUID_V4_RE.test(second)).toBe(true);
          // Note: there's a negligible probability they could be equal (1/2^122)
          // but for practical purposes they will always differ
          expect(second).not.toBe(first);
        }),
        { numRuns: 50 },
      );
    });

    it('always returns a valid UUID v4', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 10 }), (n) => {
          localStorage.clear();
          for (let i = 0; i < n; i++) {
            const uid = readOrCreateDeviceUid();
            expect(UUID_V4_RE.test(uid)).toBe(true);
          }
        }),
        { numRuns: 50 },
      );
    });

    it('persists value to localStorage under DEVICE_UID_KEY', () => {
      localStorage.clear();
      const uid = readOrCreateDeviceUid();
      expect(localStorage.getItem(DEVICE_UID_KEY)).toBe(uid);
    });

    it('clearDeviceUid removes the stored value and next call generates new UUID', () => {
      localStorage.clear();
      const first = readOrCreateDeviceUid();
      clearDeviceUid();
      expect(localStorage.getItem(DEVICE_UID_KEY)).toBeNull();

      const second = readOrCreateDeviceUid();
      expect(UUID_V4_RE.test(second)).toBe(true);
      expect(second).not.toBe(first);
    });
  });
});
