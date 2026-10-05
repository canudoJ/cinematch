'use client';

import { usePathname } from 'next/navigation';
import { BottomNav, NAV_HEIGHT } from './BottomNav';
import RouletteInviteModal from '@/components/RouletteInviteModal';

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() ?? '';
    // Las pantallas de acceso no muestran la navegación
    const showNav = !pathname.startsWith('/auth');

    return (
        <>
            <div
                className="flex h-full min-h-0 w-full flex-col overflow-hidden"
                style={showNav ? { paddingBottom: NAV_HEIGHT } : undefined}
            >
                {children}
            </div>
            {showNav && <BottomNav />}
            <RouletteInviteModal />
        </>
    );
}
