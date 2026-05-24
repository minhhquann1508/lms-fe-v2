import { tokens } from './design-tokens';

export const colors = {
  // Brand & Accent
  'brand-coral': tokens.color['brand-coral'],
  'brand-magenta': tokens.color['brand-magenta'],
  'brand-blue': tokens.color['brand-blue'],
  'brand-blue-deep': tokens.color['brand-blue-deep'],
  'brand-blue-700': tokens.color['brand-blue-700'],
  'brand-cyan': tokens.color['brand-cyan'],
  'brand-blue-200': tokens.color['brand-blue-200'],
  'brand-purple': tokens.color['brand-purple'],

  // Surface
  canvas: tokens.color.canvas,
  surface: tokens.color.surface,
  'surface-soft': tokens.color['surface-soft'],
  hairline: tokens.color.hairline,
  'hairline-soft': tokens.color['hairline-soft'],

  // Text
  ink: tokens.color.ink,
  'ink-strong': tokens.color['ink-strong'],
  charcoal: tokens.color.charcoal,
  slate: tokens.color.slate,
  steel: tokens.color.steel,
  stone: tokens.color.stone,
  muted: tokens.color.muted,

  // Semantic
  'success-bg': tokens.color['success-bg'],
  'success-text': tokens.color['success-text'],

  // Semantic aliases for compatibility
  primary: tokens.color.primary,
  'on-primary': tokens.color['on-primary'],
  success: tokens.color['success-text'],
  info: tokens.color.info,
  warning: tokens.color.warning,
  error: tokens.color.error,

  // Legacy compatibility
  surfaceMuted: tokens.color.surfaceMuted,
  background: tokens.color.background,
  border: tokens.color.border,
  borderStrong: tokens.color.borderStrong,
  textPrimary: tokens.color.textPrimary,
  textSecondary: tokens.color.textSecondary,
  textTertiary: tokens.color.textDisabled,
  textInverse: '#ffffff',
  sidebarBg: tokens.color.ink,
  sidebarText: tokens.color.stone,
  headerBg: tokens.color.canvas,
};

export const antdTheme = {
  token: {
    colorPrimary: colors.ink,
    colorSuccess: colors['success-text'],
    colorWarning: colors.warning,
    colorError: colors.error,
    colorInfo: colors['brand-blue'],
    colorBgContainer: colors.canvas,
    colorBgLayout: colors.surface,
    colorBorder: colors.hairline,
    colorText: colors.ink,
    colorTextSecondary: colors.charcoal,
    borderRadius: Number.parseInt(tokens.radius.md),
    borderRadiusLG: Number.parseInt(tokens.radius.xl),
    borderRadiusSM: Number.parseInt(tokens.radius.sm),
    fontSize: 16,
    fontSizeLG: 20,
    fontSizeSM: 13,
    fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    controlHeight: 40,
    controlHeightLG: 44,
    boxShadow: tokens.shadow.card,
    boxShadowSecondary: tokens.shadow.modal,
  },
  components: {
    Button: {
      borderRadius: Number.parseInt(tokens.radius.full),
      borderRadiusSM: Number.parseInt(tokens.radius.full),
      controlHeight: 40,
      controlHeightLG: 44,
      fontWeight: 600,
    },
    Input: {
      borderRadius: Number.parseInt(tokens.radius.md),
      controlHeight: 40,
      controlHeightLG: 44,
    },
    Select: {
      borderRadius: Number.parseInt(tokens.radius.md),
    },
    Card: {
      borderRadius: Number.parseInt(tokens.radius.xl),
      borderRadiusLG: Number.parseInt(tokens.radius.xxl),
    },
    Tag: {
      borderRadiusSM: Number.parseInt(tokens.radius.full),
    },
    Modal: {
      borderRadiusLG: Number.parseInt(tokens.radius.hero),
    },
    Layout: {
      headerBg: colors.headerBg,
      siderBg: colors.sidebarBg,
      bodyBg: colors.surface,
    },
    Menu: {
      darkItemBg: colors.sidebarBg,
      darkItemSelectedBg: colors.ink,
      itemBorderRadius: Number.parseInt(tokens.radius.md),
    },
    Table: {
      borderRadiusLG: Number.parseInt(tokens.radius.md),
    },
    Collapse: {
      borderRadiusLG: Number.parseInt(tokens.radius.lg),
    },
  },
};