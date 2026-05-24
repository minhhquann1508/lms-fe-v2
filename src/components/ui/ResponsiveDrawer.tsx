import { Drawer } from 'antd';
import type { ReactNode } from 'react';
import { useBreakpoint } from '@/hooks';

export interface ResponsiveDrawerProps {
  /** Whether the drawer overlay is open on mobile. */
  open: boolean;
  /** Callback invoked when the overlay should close. */
  onClose: () => void;
  /** Sidebar content rendered in both mobile drawer and desktop shell. */
  children: ReactNode;
  /** Width of the visible desktop sidebar. */
  width?: number;
}

export function ResponsiveDrawer({ open, onClose, children, width = 240 }: ResponsiveDrawerProps) {
  const breakpoint = useBreakpoint();

  if (breakpoint !== 'mobile') {
    return (
      <aside className="lms-responsive-drawer" style={{ width }}>
        {children}
      </aside>
    );
  }

  return (
    <Drawer
      className="lms-responsive-drawer-overlay"
      onClose={onClose}
      open={open}
      placement="left"
      width={Math.min(width, window.innerWidth * 0.86)}
    >
      {children}
    </Drawer>
  );
}
