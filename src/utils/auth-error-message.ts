/**
 * Bảng ánh xạ mã lỗi auth từ Backend sang thông báo tiếng Việt thân thiện.
 * Requirements: R14.AC1, R14.AC2, R14.AC3, R14.AC4
 */

const AUTH_ERROR_MAP: Record<string, string> = {
  USER_NOT_FOUND: 'Tài khoản không tồn tại.',
  INVALID_PASSWORD: 'Mật khẩu không đúng.',
  USER_ALREADY_EXISTS: 'Email đã được đăng ký.',
  EMAIL_INVALID: 'Email không hợp lệ.',
  EMAIL_REQUIRED: 'Vui lòng nhập email.',
  PASSWORD_REQUIRED: 'Vui lòng nhập mật khẩu.',
  PASSWORD_TOO_SHORT: 'Mật khẩu quá ngắn (tối thiểu 6 ký tự).',
  FULL_NAME_REQUIRED: 'Vui lòng nhập họ tên.',
  DEVICE_REQUIRED: 'Thiếu thông tin thiết bị.',
  INVALID_TYPE: 'Dữ liệu không hợp lệ.',
  UNAUTHENTICATED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  ACCOUNT_IN_USE_ON_ANOTHER_DEVICE: 'Tài khoản đang đăng nhập trên thiết bị khác.',
  OAUTH_STATE_INVALID: 'Liên kết Google không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.',
  TOO_MANY_REQUESTS: 'Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.',
  SESSION_NOT_FOUND: 'Phiên đăng nhập không tồn tại hoặc đã bị thu hồi.',
  LOGIN_FORCE_REVOKE_FAILED: 'Không thể thu hồi các phiên đăng nhập khác. Vui lòng thử lại.',
};

const DEFAULT_MESSAGE = 'Có lỗi xảy ra. Vui lòng thử lại.';

/**
 * Tra cứu thông báo lỗi tiếng Việt theo mã lỗi từ Backend.
 *
 * - Nếu `code` nằm trong bảng ánh xạ → trả message tương ứng.
 * - Nếu không → log mã gốc qua `console.error` và trả thông báo mặc định.
 * - Nếu `console.error` ném exception → swallow và vẫn trả thông báo mặc định (R14.AC4).
 */
export function getAuthErrorMessage(code?: string): string {
  if (code && AUTH_ERROR_MAP[code]) {
    return AUTH_ERROR_MAP[code];
  }

  // R14.AC3: log mã gốc; R14.AC4: swallow nếu console.error ném exception
  try {
    console.error('[auth-error] Unknown error code:', code);
  } catch {
    /* swallow — không để exception lan ra component cha */
  }

  return DEFAULT_MESSAGE;
}
