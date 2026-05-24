export const breakpoints = {
  mobileSmall: 480,
  mobileMax: 767,
  tabletMin: 768,
  tabletMax: 1024,
  desktopMin: 1025,
  desktopMax: 1279,
  wideDesktop: 1280,
} as const;

export const tokens = {
  color: {
    // Brand & Accent
    'brand-coral': '#E85A4F',
    'brand-magenta': '#E91E8C',
    'brand-blue': '#2563EB',
    'brand-blue-deep': '#1E40AF',
    'brand-blue-700': '#1D4ED8',
    'brand-cyan': '#06B6D4',
    'brand-blue-200': '#DBEAFE',
    'brand-purple': '#9333EA',

    // Surface
    canvas: '#FFFFFF',
    surface: '#F8FAFC',
    'surface-soft': '#F1F5F9',
    hairline: '#E2E8F0',
    'hairline-soft': '#F1F5F9',

    // Text
    ink: '#0F172A',
    'ink-strong': '#000000',
    charcoal: '#334155',
    slate: '#64748B',
    steel: '#94A3B8',
    stone: '#CBD5E1',
    muted: '#94A3B8',

    // Semantic
    'success-bg': '#DCFCE7',
    'success-text': '#166534',

    // Base mapping (legacy/support)
    primary: '#000000',
    'on-primary': '#FFFFFF',
    info: '#2563EB',
    warning: '#F59E0B',
    error: '#DC2626',

    // Legacy backward-compatible aliases
    surfaceMuted: '#F8FAFC',
    background: '#FFFFFF',
    border: '#E2E8F0',
    borderStrong: '#CBD5E1',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    textDisabled: '#94A3B8',
    textInverse: '#FFFFFF',
  },
  spacing: {
    xxs: '4px',
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '20px',
    xl: '24px',
    xxl: '32px',
    xxxl: '40px',
    'section-sm': '48px',
    section: '64px',
    'section-lg': '80px',
    hero: '96px',
  },
  typography: {
    'hero-display': { fontSize: '80px', lineHeight: 1.1, letterSpacing: '-2px', fontWeight: 600 },
    'display-lg': { fontSize: '56px', lineHeight: 1.1, letterSpacing: '-1.5px', fontWeight: 600 },
    'heading-lg': { fontSize: '40px', lineHeight: 1.2, letterSpacing: '-1px', fontWeight: 600 },
    'heading-md': { fontSize: '32px', lineHeight: 1.25, letterSpacing: '-0.5px', fontWeight: 600 },
    'heading-sm': { fontSize: '24px', lineHeight: 1.3, letterSpacing: '0', fontWeight: 600 },
    'card-title': { fontSize: '20px', lineHeight: 1.4, letterSpacing: '0', fontWeight: 600 },
    subtitle: { fontSize: '18px', lineHeight: 1.5, letterSpacing: '0', fontWeight: 500 },
    'body-md': { fontSize: '16px', lineHeight: 1.5, letterSpacing: '0', fontWeight: 400 },
    'body-md-bold': { fontSize: '16px', lineHeight: 1.5, letterSpacing: '0', fontWeight: 700 },
    'body-sm': { fontSize: '14px', lineHeight: 1.5, letterSpacing: '0', fontWeight: 400 },
    'body-sm-medium': { fontSize: '14px', lineHeight: 1.5, letterSpacing: '0', fontWeight: 500 },
    caption: { fontSize: '13px', lineHeight: 1.7, letterSpacing: '0', fontWeight: 400 },
    'caption-bold': { fontSize: '13px', lineHeight: 1.5, letterSpacing: '0', fontWeight: 600 },
    micro: { fontSize: '12px', lineHeight: 1.5, letterSpacing: '0', fontWeight: 400 },
    'button-md': { fontSize: '14px', lineHeight: 1.4, letterSpacing: '0', fontWeight: 600 },
  },
  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    xxl: '20px',
    xxxl: '24px',
    hero: '32px',
    full: '9999px',
  },
  shadow: {
    subtle: 'rgba(0, 0, 0, 0.04) 0px 1px 2px 0px',
    card: 'rgba(0, 0, 0, 0.08) 0px 4px 6px 0px',
    atmospheric: 'rgba(0, 0, 0, 0.08) 0px 0px 22px 0px',
    modal: 'rgba(36, 36, 36, 0.08) 0px 12px 16px -4px',
  },
} as const;

/* ── Legacy shorthands mapped to new tokens for backward compat ── */
const legacy = {
  color: {
    primaryHover: '#1F2937',
    success: '#166534',
    warning: '#F59E0B',
    error: '#DC2626',
    info: '#2563EB',
  },
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    7: '32px',
    8: '40px',
    9: '48px',
    10: '64px',
  },
  typography: {
    body: { fontSize: '16px', lineHeight: 1.5, letterSpacing: '0', fontWeight: 400 },
    h1: { fontSize: '32px', lineHeight: 1.25, letterSpacing: '0', fontWeight: 700 },
    h2: { fontSize: '26px', lineHeight: 1.3, letterSpacing: '0', fontWeight: 700 },
    h3: { fontSize: '22px', lineHeight: 1.35, letterSpacing: '0', fontWeight: 600 },
    h4: { fontSize: '19px', lineHeight: 1.4, letterSpacing: '0', fontWeight: 600 },
    h5: { fontSize: '17px', lineHeight: 1.45, letterSpacing: '0', fontWeight: 600 },
    caption: { fontSize: '13px', lineHeight: 1.55, letterSpacing: '0', fontWeight: 400 },
    overline: { fontSize: '11px', lineHeight: 1.5, letterSpacing: '0', fontWeight: 500 },
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.07)',
    lg: '0 10px 15px rgba(0,0,0,0.1)',
  },
};

function addTokenLines(lines: string[], prefix: string, obj: Record<string, any>) {
  Object.entries(obj).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null && 'fontSize' in value) {
      lines.push(`--font-size-${key}: ${value.fontSize};`);
      lines.push(`--line-height-${key}: ${value.lineHeight};`);
      lines.push(`--font-weight-${key}: ${value.fontWeight};`);
      if (value.letterSpacing !== undefined) {
        lines.push(`--letter-spacing-${key}: ${value.letterSpacing};`);
      }
    } else {
      lines.push(`--${prefix}-${key}: ${value};`);
    }
  });
}

export function buildCssVariables() {
  const lines: string[] = [];

  addTokenLines(lines, 'color', tokens.color);
  addTokenLines(lines, 'spacing', tokens.spacing);
  addTokenLines(lines, 'radius', tokens.radius);
  addTokenLines(lines, 'shadow', tokens.shadow);
  addTokenLines(lines, '', tokens.typography);

  // Legacy backward-compatible mappings
  addTokenLines(lines, 'color', legacy.color);
  addTokenLines(lines, 'spacing', legacy.spacing);
  addTokenLines(lines, 'radius', legacy.radius);
  addTokenLines(lines, 'shadow', legacy.shadow);
  addTokenLines(lines, '', legacy.typography);

  lines.push(`--breakpoint-mobile-small: ${breakpoints.mobileSmall}px;`);
  lines.push(`--breakpoint-mobile-max: ${breakpoints.mobileMax}px;`);
  lines.push(`--breakpoint-tablet-min: ${breakpoints.tabletMin}px;`);
  lines.push(`--breakpoint-tablet-max: ${breakpoints.tabletMax}px;`);
  lines.push(`--breakpoint-desktop-min: ${breakpoints.desktopMin}px;`);
  lines.push(`--breakpoint-desktop-max: ${breakpoints.desktopMax}px;`);
  lines.push(`--breakpoint-wide-desktop: ${breakpoints.wideDesktop}px;`);

  return `:root{${lines.join('')}}`;
}

export function injectDesignTokens() {
  const styleId = 'lms-design-tokens';
  const existing = document.getElementById(styleId);

  if (existing) {
    existing.textContent = buildCssVariables();
    return;
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = buildCssVariables();
  document.head.prepend(style);
}