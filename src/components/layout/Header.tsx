'use client';

import Link from 'next/link';
import { Layers, Gamepad2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/Button';
import type { Deck } from '@/lib/data';

export interface HeaderProps {
  showDetails: boolean;
  lobbyId: string | null;
  leaveLobby: () => void;
  activeDeck: Deck | null;
  isDeckMode: boolean;
}

export function Header({
  showDetails,
  lobbyId,
  leaveLobby,
  activeDeck,
  isDeckMode,
}: HeaderProps) {
  const { language, t } = useLanguage();

  return (
    <header
      className={`flex-none h-[50px] w-full flex flex-row items-center relative z-20 transition-all duration-300 overflow-visible ${
        showDetails ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="banner"
    >
      {/* Izquierda: Logo */}
      <div className="flex-shrink-0 pl-4 pr-3">
        <Link href="/" aria-label="CineMatch - Ir al inicio">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 420 80"
          className="h-7"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="logo-stroke" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#FF0055" />
              <stop offset="100%" stopColor="#00E5FF" />
            </linearGradient>
          </defs>
          <text
            x="0"
            y="58"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
            fontWeight="800"
            fontSize="58"
            fill="#FFFFFF"
            stroke="url(#logo-stroke)"
            strokeWidth="4"
            paintOrder="stroke fill"
            letterSpacing="3"
          >
            CINEMATCH
          </text>
        </svg>
        </Link>
      </div>

      {/* Centro: Badges (Romper el hielo / Baraja) */}
      <div className="flex-1 flex items-center justify-center min-w-0 px-2 flex-shrink">
        {lobbyId ? null : activeDeck && activeDeck.id?.startsWith('temp-') && (
          <div
            className="bg-[var(--secondary)]/20 border-2 border-[var(--secondary)] text-[var(--secondary)] rounded-full px-3.5 py-1.5 text-sm font-bold whitespace-nowrap shadow-[0_0_20px_rgba(0,229,255,0.4)] animate-in fade-in zoom-in duration-300 flex items-center gap-1.5 max-w-[80%] truncate absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2"
            role="status"
          >
            <Gamepad2 size={12} aria-hidden />
            <span>{language === 'es' ? 'Romper el hielo' : 'Break the ice'}</span>
          </div>
        )}
        {!lobbyId && isDeckMode && activeDeck && (
          <div
            className="bg-[var(--secondary)]/20 border-2 border-[var(--secondary)] text-[var(--secondary)] rounded-full px-3.5 py-1.5 text-sm font-bold whitespace-nowrap shadow-[0_0_20px_rgba(0,229,255,0.4)] animate-in fade-in zoom-in duration-300 flex items-center gap-1.5 max-w-[80%] truncate absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2"
            role="status"
          >
            <Layers size={12} aria-hidden />
            <span>
              {language === 'es' ? `Baraja: ${activeDeck.title}` : `Deck: ${activeDeck.title}`}
            </span>
          </div>
        )}
      </div>

      {/* Derecha: Exit Lobby o espacio para filtros */}
      <div className="flex-shrink-0 w-[80px] sm:w-[100px] flex items-center justify-end pr-4">
        {lobbyId && (
          <Button
            variant="destructive"
            size="sm"
            onClick={leaveLobby}
            aria-label="Salir del Lobby"
          >
            {t.exitLobby}
          </Button>
        )}
      </div>
    </header>
  );
}
