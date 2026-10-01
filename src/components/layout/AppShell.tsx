'use client';

import { usePathname } from 'next/navigation';
import { BottomNav, NAV_HEIGHT } from './BottomNav';

export const BOTTOM_NAV_HEIGHT = NAV_HEIGHT;

const HIDE_NAV_PATHS = ['/auth', '/error'];

function shouldShowBottomNav(pathname: string) {
  return !HIDE_NAV_PATHS.some((p) => pathname.startsWith(p));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = shouldShowBottomNav(pathname ?? '');

  return (
    <>
      <div
        className="h-full w-full flex flex-col min-h-0 overflow-hidden"
        style={showNav ? { paddingBottom: BOTTOM_NAV_HEIGHT } : undefined}
      >
        {children}
      </div>
      {showNav && <BottomNav />}
    </>
  );
}
