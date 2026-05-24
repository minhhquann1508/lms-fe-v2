import { breakpoints } from '@/config/design-tokens';
import { useMediaQuery } from './useMediaQuery';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useBreakpoint(): Breakpoint {
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.mobileMax}px)`);
  const isTablet = useMediaQuery(
    `(min-width: ${breakpoints.tabletMin}px) and (max-width: ${breakpoints.tabletMax}px)`,
  );

  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
}
