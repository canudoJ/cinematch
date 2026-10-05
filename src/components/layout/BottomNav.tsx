'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Heart, Layers, Users } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export const NAV_HEIGHT = 72;

/**
 * Los paneles de la home (videoteca, barajas, social, filtros) se abren con ?open=…:
 * funciona igual desde cualquier página y el enlace se puede compartir.
 * Cada icono toma un color del degradado de marca (rosa → morado → cian).
 */
const NAV_ITEMS = [
    { id: 'profile', href: '/profile', icon: User, labelKey: 'profile', color: 'var(--primary)' },
    { id: 'library', href: '/?open=library', icon: Heart, labelKey: 'library', color: 'color-mix(in srgb, var(--primary) 60%, var(--accent-mid))' },
    { id: 'decks', href: '/?open=decks', icon: Layers, labelKey: 'decks', color: 'var(--accent-mid)' },
    { id: 'social', href: '/?open=social', icon: Users, labelKey: 'playWithFriends', color: 'var(--secondary)' },
] as const;

export function BottomNav() {
    const pathname = usePathname();
    const { t } = useLanguage();

    return (
        <nav
            className="safe-area-pb fixed bottom-0 left-0 right-0 z-50 w-full border-t border-[var(--surface-border)] bg-[color-mix(in_srgb,var(--background)_85%,transparent)] backdrop-blur-lg"
            style={{ height: NAV_HEIGHT }}
            aria-label={t.mainNavigation}
        >
            <div className="mx-auto flex h-full max-w-lg items-center justify-around px-2">
                {NAV_ITEMS.map(item => {
                    const Icon = item.icon;
                    const label = t[item.labelKey];
                    const isCurrent = pathname === item.href;
                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 transition-opacity hover:opacity-100"
                            style={{ color: item.color, opacity: isCurrent ? 1 : 0.75 }}
                            aria-current={isCurrent ? 'page' : undefined}
                        >
                            <Icon size={24} className="shrink-0" aria-hidden />
                            <span className={`w-full truncate text-center text-[11px] font-semibold ${isCurrent ? 'underline underline-offset-4' : ''}`}>
                                {label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
