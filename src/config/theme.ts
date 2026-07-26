import { tokens } from './design-tokens';

export const colors = {
  primary: tokens.color.primary,
  'primary-hover': tokens.color['primary-hover'],
  'primary-light': tokens.color['primary-light'],

  canvas: tokens.color.canvas,
  surface: tokens.color.surface,
  'surface-soft': tokens.color['surface-soft'],
  hairline: tokens.color.hairline,
  'hairline-soft': tokens.color['hairline-soft'],

  ink: tokens.color.ink,
  'ink-strong': tokens.color['ink-strong'],
  charcoal: tokens.color.charcoal,
  slate: tokens.color.slate,
  steel: tokens.color.steel,
  stone: tokens.color.stone,
  muted: tokens.color.muted,

  'success-bg': tokens.color['success-bg'],
  'success-text': tokens.color['success-text'],

  'on-primary': tokens.color['on-primary'],
  success: tokens.color['success-text'],
  info: tokens.color.info,
  warning: tokens.color.warning,
  error: tokens.color.error,

  surfaceMuted: tokens.color.surfaceMuted,
  background: tokens.color.background,
  border: tokens.color.border,
  borderStrong: tokens.color.borderStrong,
  textPrimary: tokens.color.textPrimary,
  textSecondary: tokens.color.textSecondary,
  textTertiary: tokens.color.textDisabled,
  textInverse: '#ffffff',
  sidebarBg: tokens.color.surface,
  sidebarText: tokens.color.stone,
  headerBg: tokens.color.canvas,
};

export const antdTheme = {
  token: {
    colorPrimary: colors.primary,
    colorSuccess: colors['success-text'],
    colorWarning: colors.warning,
    colorError: colors.error,
    colorInfo: colors.info,
    colorBgContainer: colors.canvas,
    colorBgLayout: colors.surface,
    colorBorder: colors.hairline,
    colorText: colors.ink,
    colorTextSecondary: colors.charcoal,
    borderRadius: Number.parseInt(tokens.radius.md),
    borderRadiusLG: Number.parseInt(tokens.radius.xl),
    borderRadiusSM: Number.parseInt(tokens.radius.sm),
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 13,
    fontFamily:
      "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    controlHeight: 40,
    controlHeightLG: 44,
    boxShadow: tokens.shadow.card,
    boxShadowSecondary: tokens.shadow.modal,
  },
  components: {
    Button: {
      borderRadius: Number.parseInt(tokens.radius.md),
      borderRadiusSM: Number.parseInt(tokens.radius.md),
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
      borderRadius: Number.parseInt(tokens.radius.sm),
      borderRadiusLG: Number.parseInt(tokens.radius.sm),
      optionBorderRadius: Number.parseInt(tokens.radius.xs),
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
      itemBg: 'transparent',
      itemSelectedBg: tokens.color.primary,
      itemSelectedColor: '#ffffff',
      itemColor: tokens.color.slate,
      itemHoverColor: tokens.color.ink,
      itemHoverBg: tokens.color['surface-soft'],
      itemBorderRadius: Number.parseInt(tokens.radius.md),
    },
    Table: {
      borderRadiusLG: Number.parseInt(tokens.radius.lg),
    },
    Collapse: {
      borderRadiusLG: Number.parseInt(tokens.radius.lg),
    },
  },
};
