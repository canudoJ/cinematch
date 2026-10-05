'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { DoorOpen, Heart, X, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageContext';
import { useUser } from '@/context/UserContext';
import { useDecks } from '@/context/DeckContext';
import { useChallenge } from '@/context/ChallengeContext';
import { useToast } from '@/components/ui/Toast';
import { getMovies } from '@/lib/data';
import { getUserRegion } from '@/lib/region';
import { Spinner } from '@/components/ui/Spinner';
import { Button, buttonVariants } from '@/components/ui/Button';
import { GuestAccessButton } from './GuestAccessButton';
import MovieCard from './MovieCard';
import MovieDetailsModal from './MovieDetailsModal';
import ShortlistView from './ShortlistView';
import ChallengeCardOverlay from './ChallengeCardOverlay';
import { FlyingPoster, type Flight } from './FlyingPoster';
import type { Movie } from '@/types';

interface SwipeDeckProps {
    /** Hay un panel abierto encima (videoteca, barajas…): no mostrar el reto */
    isOverlayBlocked?: boolean;
}

type Direction = 'left' | 'right';

const SWIPE_THRESHOLD = 80;
const SWIPE_ANIMATION_MS = 300;
/** IDs ya mostrados en esta pestaña: el feed no los repite hasta cerrarla */
const SEEN_KEY = 'cinematch_seen_movies';

function readSeen(): string[] {
    try {
        const raw = sessionStorage.getItem(SEEN_KEY);
        return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
        return [];
    }
}

function markSeen(id: string) {
    try {
        const seen = readSeen();
        if (!seen.includes(id)) sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen, id]));
    } catch {
        // sessionStorage no disponible: se podrían repetir títulos, nada más
    }
}

interface Progress {
    key: string;
    index: number;
    shortlist: Movie[];
    showShortlist: boolean;
}

export default function SwipeDeck({ isOverlayBlocked = false }: SwipeDeckProps) {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const { platforms, contentTypes, preferredGenres, addLike } = useUser();
    const { activeDeck, setActiveDeck, hydrateDeck } = useDecks();
    const { pendingChallenges, resolveChallenge } = useChallenge();
    const { showToast } = useToast();

    // --- Carga: la clave identifica qué se muestra; "cargando" = la clave aún no coincide
    const [reloadCount, setReloadCount] = useState(0);
    const feedKey = activeDeck
        ? `deck:${activeDeck.id}:${reloadCount}`
        : `feed:${platforms.join(',')}|${contentTypes.join(',')}|${preferredGenres.join(',')}|${language}|${reloadCount}`;
    const [feed, setFeed] = useState<{ key: string; movies: Movie[] }>({ key: '', movies: [] });
    const loading = feed.key !== feedKey;
    const needsSetup = !activeDeck && (platforms.length === 0 || contentTypes.length === 0);

    useEffect(() => {
        if (needsSetup) return;
        let cancelled = false;
        const request = activeDeck
            ? hydrateDeck(activeDeck).then(deck => deck.movies)
            : getMovies({ platforms, types: contentTypes, region: getUserRegion(), genreIds: preferredGenres, seenIds: readSeen(), language });
        void request.then(movies => {
            if (!cancelled) setFeed({ key: feedKey, movies });
        });
        return () => {
            cancelled = true;
        };
    }, [feedKey, needsSetup, activeDeck, hydrateDeck, platforms, contentTypes, preferredGenres, language]);

    const movies = useMemo(() => (loading ? [] : feed.movies), [loading, feed.movies]);

    // --- Progreso dentro de la carga actual (se reinicia solo al cambiar la clave)
    const [progress, setProgress] = useState<Progress>({ key: '', index: 0, shortlist: [], showShortlist: false });
    const current = useMemo<Progress>(
        () => (progress.key === feedKey ? progress : { key: feedKey, index: 0, shortlist: [], showShortlist: false }),
        [progress, feedKey],
    );
    const currentMovie = movies[current.index];
    const nextMovie = movies[current.index + 1];

    const [direction, setDirection] = useState<Direction | null>(null);
    const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
    // Pósters volando hacia el contador de la selección (modo baraja)
    const [flights, setFlights] = useState<Flight[]>([]);
    const [landings, setLandings] = useState(0);
    const cardAreaRef = useRef<HTMLDivElement>(null);
    const basketRef = useRef<HTMLButtonElement>(null);
    // El contador sube cuando el póster aterriza, no cuando despega
    const basketCount = current.shortlist.filter(movie => !flights.some(f => f.id === movie.id)).length;
    const [drag, setDrag] = useState({ active: false, offset: 0 });
    const dragStartX = useRef<number | null>(null);

    // Reto pendiente encima del feed (no en modo baraja)
    const activeChallenge = !activeDeck && !isOverlayBlocked ? pendingChallenges[0] ?? null : null;

    /** Lanza el póster desde el centro de la tarjeta hasta el contador, medidos ahora mismo */
    const launchFlight = useCallback((movie: Movie) => {
        const card = cardAreaRef.current?.getBoundingClientRect();
        const basket = basketRef.current?.getBoundingClientRect();
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!card || !basket || reducedMotion) {
            setLandings(n => n + 1);
            return;
        }
        const width = Math.min(card.width * 0.55, (card.height * 0.8) / 1.5, 220);
        setFlights(list => [
            ...list.filter(f => f.id !== movie.id),
            {
                id: movie.id,
                image: movie.image,
                from: { x: card.left + card.width / 2, y: card.top + card.height / 2, width },
                to: { x: basket.left + basket.width / 2, y: basket.top + basket.height / 2 },
            },
        ]);
    }, []);

    const handleLanded = useCallback((id: string) => {
        setFlights(list => list.filter(f => f.id !== id));
        setLandings(n => n + 1);
    }, []);

    const handleSwipe = useCallback((dir: Direction) => {
        if (direction || !currentMovie) return;
        setDirection(dir);
        if (dir === 'right' && activeDeck) launchFlight(currentMovie);

        window.setTimeout(() => {
            markSeen(currentMovie.id);
            if (dir === 'right' && !activeDeck) void addLike(currentMovie);

            const isLast = current.index >= movies.length - 1;
            if (isLast && !activeDeck) {
                setReloadCount(c => c + 1); // fin del lote: cargar más sin repetir
            } else {
                setProgress({
                    key: feedKey,
                    index: isLast ? current.index : current.index + 1,
                    shortlist: dir === 'right' && activeDeck ? [...current.shortlist, currentMovie] : current.shortlist,
                    showShortlist: isLast,
                });
            }
            setDirection(null);
        }, SWIPE_ANIMATION_MS);
    }, [direction, currentMovie, activeDeck, addLike, current, movies.length, feedKey, launchFlight]);

    // Atajos en escritorio: ← descartar, → me gusta (no mientras hay un modal o un reto encima)
    const keyboardEnabled = !activeChallenge && !detailsMovie && !current.showShortlist;
    useEffect(() => {
        if (!keyboardEnabled) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
            const target = event.target as HTMLElement | null;
            if (target?.closest('input, textarea, select, [contenteditable="true"], [role="tablist"]')) return;
            if (document.querySelector('[aria-modal="true"]')) return;
            event.preventDefault();
            handleSwipe(event.key === 'ArrowRight' ? 'right' : 'left');
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [keyboardEnabled, handleSwipe]);

    const handleResolveChallenge = async (accepted: boolean) => {
        if (!activeChallenge) return;
        const ok = await resolveChallenge(activeChallenge.id, accepted);
        if (!ok) {
            showToast(t.genericError, 'error');
            return;
        }
        if (accepted) {
            await addLike(activeChallenge.movie);
            showToast(t.challengeAccepted, 'success');
        }
    };

    // --- Gestos (ratón y táctil)
    const onDragStart = (x: number) => {
        if (direction) return;
        dragStartX.current = x;
        setDrag({ active: true, offset: 0 });
    };
    const onDragMove = (x: number) => {
        if (dragStartX.current !== null) setDrag({ active: true, offset: x - dragStartX.current });
    };
    const onDragEnd = () => {
        if (dragStartX.current === null) return;
        dragStartX.current = null;
        const { offset } = drag;
        setDrag({ active: false, offset: 0 });
        if (Math.abs(offset) >= SWIPE_THRESHOLD) handleSwipe(offset > 0 ? 'right' : 'left');
    };

    // --- Estados especiales
    if (needsSetup) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="max-w-sm text-[var(--muted-foreground)]">{user ? t.setupDescription : t.visitorIntro}</p>
                {user ? (
                    <Link href="/?open=filters" className={buttonVariants({ size: 'lg' })}>{t.configure}</Link>
                ) : (
                    <>
                        <GuestAccessButton variant="default" />
                        <Link href="/auth/login" className="text-sm text-[var(--muted-foreground)]">
                            {t.haveAccountLogin} <span className="font-bold text-[var(--primary)]">{t.logIn}</span>
                        </Link>
                    </>
                )}
            </div>
        );
    }

    if (loading) {
        return <Spinner label={t.loadingData} className="h-full" />;
    }

    // "Romper el hielo" es un modo de juego (baraja temporal): se sale de la sala, no de una baraja
    const exitLabel = activeDeck?.id.startsWith('temp-') ? t.exitLobby : t.exitDeck;

    if (current.showShortlist && activeDeck) {
        return (
            <ShortlistView
                movies={current.shortlist}
                exitLabel={exitLabel}
                onClose={() => setActiveDeck(null)}
                onRestart={() => setReloadCount(c => c + 1)}
            />
        );
    }

    if (!currentMovie) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="text-[var(--muted-foreground)]">{t.noMoreMovies}</p>
                <Button variant="outline" onClick={() => setReloadCount(c => c + 1)}>
                    <RefreshCw size={16} aria-hidden /> {t.loadMore}
                </Button>
            </div>
        );
    }

    const progressPercent = movies.length ? (current.index / movies.length) * 100 : 0;
    const cardTransform = direction === 'left'
        ? 'translateX(-130%) rotate(-25deg)'
        : direction === 'right' && !activeDeck
            ? 'translateX(130%) rotate(25deg)'
            : `translateX(${drag.offset}px) rotate(${drag.offset * 0.08}deg)`;
    const stampOpacity = direction ? 1 : Math.min(Math.abs(drag.offset) / SWIPE_THRESHOLD, 1);

    return (
        <div className="relative flex h-full flex-1 flex-col">
            {activeDeck && (
                <div className="mb-4 px-2.5">
                    <div className="text-caption mb-1.5 flex justify-between">
                        <span>{t.cardProgress(current.index + 1, movies.length)}</span>
                        <span>{current.shortlist.length} {t.inBasket}</span>
                    </div>
                    <div
                        className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={movies.length}
                        aria-valuenow={current.index}
                    >
                        <div className="h-full bg-[var(--secondary)] transition-[width] duration-300" style={{ width: `${progressPercent}%` }} />
                    </div>
                </div>
            )}

            <div ref={cardAreaRef} className={`relative flex-1 ${activeDeck ? 'mb-5' : 'mb-7'}`}>
                {nextMovie && (
                    <div className="absolute inset-0 z-0 translate-y-2.5 scale-95 opacity-50">
                        <MovieCard movie={nextMovie} />
                    </div>
                )}

                <div
                    className="absolute inset-0 z-10 select-none"
                    style={{
                        transform: cardTransform,
                        transition: direction
                            ? `transform ${SWIPE_ANIMATION_MS}ms cubic-bezier(0.25, 1, 0.5, 1), opacity ${SWIPE_ANIMATION_MS}ms`
                            : drag.active ? 'none' : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
                        opacity: direction ? 0 : 1,
                        cursor: drag.active ? 'grabbing' : 'grab',
                    }}
                    onTouchStart={e => onDragStart(e.touches[0].clientX)}
                    onTouchMove={e => onDragMove(e.touches[0].clientX)}
                    onTouchEnd={onDragEnd}
                    onMouseDown={e => { e.preventDefault(); onDragStart(e.clientX); }}
                    onMouseMove={e => { if (drag.active) onDragMove(e.clientX); }}
                    onMouseUp={onDragEnd}
                    onMouseLeave={() => { if (drag.active) onDragEnd(); }}
                >
                    <MovieCard movie={currentMovie} onOpenDetails={() => setDetailsMovie(currentMovie)} priority />

                    {(direction === 'right' || drag.offset > 20) && !activeDeck && (
                        <div className="pointer-events-none absolute left-10 top-10 z-20 -rotate-[15deg] rounded-lg border-4 border-[var(--secondary)] px-2.5 py-1 text-[32px] font-extrabold text-[var(--secondary)]" style={{ opacity: stampOpacity }} aria-hidden>
                            {t.like}
                        </div>
                    )}
                    {(direction === 'left' || drag.offset < -20) && (
                        <div className="pointer-events-none absolute right-10 top-10 z-20 rotate-[15deg] rounded-lg border-4 border-[var(--destructive)] px-2.5 py-1 text-[32px] font-extrabold text-[var(--destructive)]" style={{ opacity: stampOpacity }} aria-hidden>
                            {t.nope}
                        </div>
                    )}
                </div>

                {activeChallenge && (
                    <ChallengeCardOverlay challenge={activeChallenge} onResolve={accepted => void handleResolveChallenge(accepted)} />
                )}
            </div>

            <div className="relative flex items-center justify-center gap-8 pb-2.5">
                {activeDeck && (
                    <Button variant="danger" size="sm" className="absolute bottom-2.5 left-2.5 max-sm:h-11 max-sm:w-11 max-sm:px-0" onClick={() => setActiveDeck(null)} aria-label={exitLabel}>
                        <DoorOpen size={18} aria-hidden /> <span className="hidden sm:inline">{exitLabel}</span>
                    </Button>
                )}
                <button type="button" className="btn-icon dislike" onClick={() => handleSwipe('left')} disabled={!!direction} aria-label={t.dislike} aria-keyshortcuts="ArrowLeft" title={`${t.dislike} (←)`}>
                    <X size={26} aria-hidden />
                </button>
                <button type="button" className="btn-icon like" onClick={() => handleSwipe('right')} disabled={!!direction} aria-label={t.iLikeIt} aria-keyshortcuts="ArrowRight" title={`${t.iLikeIt} (→)`}>
                    <Heart size={26} fill="currentColor" aria-hidden />
                </button>
                {activeDeck && (
                    <button
                        ref={basketRef}
                        type="button"
                        onClick={() => setProgress({ ...current, showShortlist: true })}
                        aria-label={t.openShortlist(basketCount)}
                        className="absolute bottom-2.5 right-2.5 flex h-[50px] w-[50px] items-center justify-center rounded-full border-2 border-[var(--secondary)] bg-[var(--card)] text-[var(--secondary)] shadow-[var(--shadow-lg)]"
                    >
                        {/* La clave cambia con cada aterrizaje: el contenido da un pequeño salto */}
                        <span key={landings} className={`flex flex-col items-center ${landings > 0 ? 'animate-bump' : ''}`}>
                            <Heart size={18} fill="currentColor" aria-hidden />
                            <span className="text-xs font-bold">{basketCount}</span>
                        </span>
                    </button>
                )}
            </div>

            {flights.map(flight => (
                <FlyingPoster key={flight.id} flight={flight} onLanded={handleLanded} />
            ))}

            {detailsMovie && (
                <MovieDetailsModal
                    movie={detailsMovie}
                    onClose={() => setDetailsMovie(null)}
                    onLike={detailsMovie.id === currentMovie.id ? () => handleSwipe('right') : undefined}
                />
            )}
        </div>
    );
}
