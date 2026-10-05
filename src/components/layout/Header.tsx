'use client';

import Link from 'next/link';
import { Dices, SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useLobby } from '@/context/LobbyContext';
import { useDecks } from '@/context/DeckContext';
import { useAuth } from '@/context/AuthProvider';
import { ModalTitlePill } from '@/components/ui/ModalTitlePill';
import { MODES } from '@/lib/modes';

/** Cabecera de la home: logo, modo actual (baraja / test), filtros del feed y acceso a la sala de ruleta activa */
export function Header() {
    const { t } = useLanguage();
    const { lobbyId } = useLobby();
    const { activeDeck } = useDecks();
    const { user } = useAuth();
    const isQuizDeck = !!activeDeck?.id.startsWith('temp-');

    return (
        <header className="relative z-20 flex h-[68px] w-full flex-none items-center pt-2">
            <Link href="/" aria-label={t.goHome} className="shrink-0 pl-4 pr-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 80" className="h-7" aria-hidden="true">
                    <defs>
                        <linearGradient id="logo-stroke" x1="0%" y1="50%" x2="100%" y2="50%">
                            <stop offset="0%" style={{ stopColor: 'var(--primary)' }} />
                            <stop offset="100%" style={{ stopColor: 'var(--secondary)' }} />
                        </linearGradient>
                    </defs>
                    <text
                        x="0"
                        y="58"
                        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                        fontWeight="800"
                        fontSize="58"
                        style={{ fill: 'var(--foreground)' }}
                        stroke="url(#logo-stroke)"
                        strokeWidth="4"
                        paintOrder="stroke fill"
                        letterSpacing="3"
                    >
                        CINEMATCH
                    </text>
                </svg>
            </Link>

            <div className="min-w-0 flex-1" />
            {/* Modo actual: centrado en pantallas anchas; en móvil, a la derecha para no pisar el logo.
                El centrado va en un contenedor aparte: la animación de entrada usa transform */}
            {!lobbyId && activeDeck && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 top-2 flex items-center justify-end pr-4 sm:justify-center sm:pr-0">
                    <div className="pointer-events-auto max-w-[55vw] animate-pop-in sm:max-w-[230px]" role="status">
                        <ModalTitlePill
                            title={isQuizDeck ? t.breakTheIce : t.deckBadge(activeDeck.title)}
                            icon={(isQuizDeck ? MODES.iceBreaker : MODES.decks).icon}
                            accent={(isQuizDeck ? MODES.iceBreaker : MODES.decks).accent}
                            className=""
                            compact
                        />
                    </div>
                </div>
            )}

            <div className="flex shrink-0 items-center justify-end gap-2 pr-4">
                {/* Los filtros solo afectan al feed, no a una baraja en juego */}
                {user && !activeDeck && (
                    <Link
                        href="/?open=filters"
                        scroll={false}
                        title={t.openFilters}
                        className="flex h-9 items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--secondary)] hover:text-[var(--secondary)]"
                    >
                        <SlidersHorizontal size={16} aria-hidden />
                        <span>{t.filters}</span>
                    </Link>
                )}
                {lobbyId && (
                    <Link
                        href="/roulette-lobby"
                        className="flex items-center gap-1.5 rounded-full bg-[var(--destructive)] px-3 py-1.5 text-sm font-semibold text-[var(--primary-foreground)]"
                        aria-label={t.lobbyActive}
                    >
                        <Dices size={16} aria-hidden />
                        {t.backToLobby}
                    </Link>
                )}
            </div>
        </header>
    );
}
