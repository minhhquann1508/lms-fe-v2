export const ADMIN = 'admin';
export const USER = 'user';
export const SUPER_ADMIN = 'super_admin';

export type RoleType = typeof USER | typeof ADMIN | typeof SUPER_ADMIN;
