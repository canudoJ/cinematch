'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { User, Heart, Layers, Users, Settings } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export const NAV_HEIGHT = 72;
const iconSize = 24;

const MODAL_LABEL_KEYS: Record<string, 'library' | 'decks' | 'playWithFriends'> = {
  library: 'library',
  decks: 'decks',
  friends: 'playWithFriends',
};

const navItems = [
  { id: 'profile', href: '/profile', icon: User, labelKey: 'profile' as const },
  { id: 'library', href: '/?open=library', icon: Heart, labelKey: 'library' as const, openEvent: 'cinematch:open-library' },
  { id: 'decks', href: '/?open=decks', icon: Layers, labelKey: 'decks' as const, openEvent: 'cinematch:open-decks' },
  { id: 'friends', href: '/?open=social', icon: Users, labelKey: 'playWithFriends' as const, openEvent: 'cinematch:open-social' },
  { id: 'settings', href: '/setup', icon: Settings, labelKey: 'configure' as const },
];

// Colores del gradiente de izquierda a derecha (Profile → Settings)
// "Barajas" vuelve a usar el morado original.
const navGradientColors = ['#ff0055', '#ff3f8f', '#c84cff', '#5f9dff', '#00e5ff'];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();

  const isActive = (item: (typeof navItems)[0]) => {
    if (item.id === 'profile') return pathname === '/profile';
    if (item.id === 'settings') return pathname === '/setup';
    return false;
  };

  const handleNavClick = (e: React.MouseEvent, item: (typeof navItems)[0]) => {
    if (item.openEvent) {
      e.preventDefault();
      if (pathname !== '/') {
        router.push('/');
        setTimeout(() => window.dispatchEvent(new CustomEvent(item.openEvent!)), 100);
      } else {
        window.dispatchEvent(new CustomEvent(item.openEvent!));
      }
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 w-full z-50 bg-black/80 backdrop-blur-lg border-t border-white/10 safe-area-pb"
      style={{ minHeight: NAV_HEIGHT, height: NAV_HEIGHT }}
      role="navigation"
      aria-label="Navegación principal"
    >
      <div className="h-full max-w-lg mx-auto flex items-center justify-around px-2">
        {navItems.map((item, index) => {
          const active = isActive(item);
          const Icon = item.icon;
          const label = t[item.labelKey];
          const baseColor = navGradientColors[index] ?? 'var(--secondary)';
          const inactiveOpacity = 0.7;

          // En "Barajas" (id: 'decks') queremos conservar el morado incluso cuando está activo.
          const iconColor =
            item.id === 'decks' ? baseColor : active ? 'var(--secondary)' : baseColor;
          const textColor =
            item.id === 'decks' ? baseColor : active ? 'var(--secondary)' : baseColor;
          const opacity = active ? 1 : inactiveOpacity;

          if (item.openEvent) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={(e) => handleNavClick(e, item)}
                className="flex flex-col items-center justify-center gap-1 flex-1 min-w-0 py-2 transition-colors touch-manipulation"
                style={{ minHeight: NAV_HEIGHT }}
                title={label}
                aria-label={label}
                aria-current={undefined}
              >
                <Icon
                  size={iconSize}
                  className="flex-shrink-0 transition-colors"
                  style={{ color: iconColor, opacity }}
                  aria-hidden
                />
                <span
                  className="text-[10px] font-semibold truncate w-full text-center"
                  style={{ color: textColor, opacity }}
                >
                  {MODAL_LABEL_KEYS[item.id] ? t[MODAL_LABEL_KEYS[item.id]] : label}
                </span>
              </button>
            );
          }

          const isCurrent = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 flex-1 min-w-0 py-2 transition-colors touch-manipulation"
              style={{ minHeight: NAV_HEIGHT }}
              title={label}
              aria-label={label}
              aria-current={isCurrent ? 'page' : undefined}
            >
              <Icon
                size={iconSize}
                className="flex-shrink-0 transition-colors"
                style={{ color: iconColor, opacity }}
                aria-hidden
              />
              <span
                className="text-[10px] font-semibold truncate w-full text-center"
                style={{ color: textColor, opacity }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
