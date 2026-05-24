import type { ReactNode } from 'react';

export interface PageTransitionProps {
  /** Page content that should fade in after route changes. */
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return <div className="lms-page-transition">{children}</div>;
}
