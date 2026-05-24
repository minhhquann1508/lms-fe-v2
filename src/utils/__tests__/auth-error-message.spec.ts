import { describe, it, expect, vi, afterEach } from 'vitest';
import { getAuthErrorMessage } from '../auth-error-message';

describe('getAuthErrorMessage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * R14.AC1, R14.AC2: Mã lỗi biết → trả message tiếng Việt tương ứng
   */
  it('returns Vietnamese message for known error codes', () => {
    expect(getAuthErrorMessage('USER_NOT_FOUND')).toBe('Tài khoản không tồn tại.');
    expect(getAuthErrorMessage('INVALID_PASSWORD')).toBe('Mật khẩu không đúng.');
    expect(getAuthErrorMessage('USER_ALREADY_EXISTS')).toBe('Email đã được đăng ký.');
    expect(getAuthErrorMessage('EMAIL_INVALID')).toBe('Email không hợp lệ.');
    expect(getAuthErrorMessage('EMAIL_REQUIRED')).toBe('Vui lòng nhập email.');
    expect(getAuthErrorMessage('PASSWORD_REQUIRED')).toBe('Vui lòng nhập mật khẩu.');
    expect(getAuthErrorMessage('PASSWORD_TOO_SHORT')).toBe(
      'Mật khẩu quá ngắn (tối thiểu 6 ký tự).',
    );
    expect(getAuthErrorMessage('FULL_NAME_REQUIRED')).toBe('Vui lòng nhập họ tên.');
    expect(getAuthErrorMessage('DEVICE_REQUIRED')).toBe('Thiếu thông tin thiết bị.');
    expect(getAuthErrorMessage('INVALID_TYPE')).toBe('Dữ liệu không hợp lệ.');
    expect(getAuthErrorMessage('UNAUTHENTICATED')).toBe(
      'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    );
    expect(getAuthErrorMessage('ACCOUNT_IN_USE_ON_ANOTHER_DEVICE')).toBe(
      'Tài khoản đang đăng nhập trên thiết bị khác.',
    );
    expect(getAuthErrorMessage('OAUTH_STATE_INVALID')).toBe(
      'Liên kết Google không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.',
    );
    expect(getAuthErrorMessage('TOO_MANY_REQUESTS')).toBe(
      'Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.',
    );
    expect(getAuthErrorMessage('SESSION_NOT_FOUND')).toBe(
      'Phiên đăng nhập không tồn tại hoặc đã bị thu hồi.',
    );
    expect(getAuthErrorMessage('LOGIN_FORCE_REVOKE_FAILED')).toBe(
      'Không thể thu hồi các phiên đăng nhập khác. Vui lòng thử lại.',
    );
  });

  /**
   * R14.AC3: Mã lỗi không biết → trả default message và log console.error
   */
  it('returns default message for unknown error code', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = getAuthErrorMessage('SOME_UNKNOWN_CODE');

    expect(result).toBe('Có lỗi xảy ra. Vui lòng thử lại.');
    expect(consoleSpy).toHaveBeenCalledWith(
      '[auth-error] Unknown error code:',
      'SOME_UNKNOWN_CODE',
    );
  });

  /**
   * R14.AC3: code === undefined → trả default message
   */
  it('returns default message when code is undefined', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = getAuthErrorMessage(undefined);

    expect(result).toBe('Có lỗi xảy ra. Vui lòng thử lại.');
    expect(consoleSpy).toHaveBeenCalledWith('[auth-error] Unknown error code:', undefined);
  });

  /**
   * R14.AC4: console.error ném exception → vẫn trả default, không lan exception
   */
  it('returns default message and does not throw when console.error throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {
      throw new Error('console is broken');
    });

    expect(() => {
      const result = getAuthErrorMessage('TOTALLY_UNKNOWN');
      expect(result).toBe('Có lỗi xảy ra. Vui lòng thử lại.');
    }).not.toThrow();
  });
});
