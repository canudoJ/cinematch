import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DoorOpen } from 'lucide-react';
import Link from 'next/link';
import { getMovies, Movie } from '@/lib/data';
import MovieCard from './MovieCard';
import MovieDetailsModal from './MovieDetailsModal';
import ShortlistView from './ShortlistView';
import ChallengeCardOverlay from './ChallengeCardOverlay';
import { useLanguage } from '@/context/LanguageContext';
import { useUser } from '@/context/UserContext';
import { getWatchLink } from '@/services/tmdb';
import { useLobby } from '@/context/LobbyContext';
import { useDecks } from '@/context/DeckContext';
import { useChallenge } from '@/context/ChallengeContext';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthProvider';
import { GuestAccessButton } from './GuestAccessButton';

interface SwipeDeckProps {
    isOverlayBlocked?: boolean;
}

export default function SwipeDeck({ isOverlayBlocked = false }: SwipeDeckProps) {
    const { t, language } = useLanguage();
    const { platforms, contentTypes, preferredGenres, addLike } = useUser();
    const { config: lobbyConfig } = useLobby();
    const { activeDeck, setActiveDeck } = useDecks();
    const { pendingChallenges, resolveChallenge } = useChallenge();
    const { showToast } = useToast();
    const { user } = useAuth();
    const activeChallenge = pendingChallenges[0] ?? null;

    const activePlatforms = lobbyConfig ? lobbyConfig.platforms : platforms;
    const activeTypes = lobbyConfig ? lobbyConfig.contentTypes : contentTypes;

    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState<'left' | 'right' | null>(null);
    const [loadedMovies, setLoadedMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);

    const [shortlist, setShortlist] = useState<Movie[]>([]);
    const [showShortlist, setShowShortlist] = useState(false);

    // Animación de vuelo — solo se muestra en modo deck (cuando existe el icono cesta)
    const [flyingItem, setFlyingItem] = useState<{ image: string; id: string } | null>(null);

    const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);

    // Touch / drag swipe state
    const dragStartX = useRef<number | null>(null);
    const dragCurrentX = useRef<number>(0);
    const isDragging = useRef(false);
    const [dragOffset, setDragOffset] = useState(0);
    const SWIPE_THRESHOLD = 80;

    // --- Deduplicación por sesión ---
    // Persiste en sessionStorage: se limpia al cerrar la pestaña, no entre rutas.
    const seenIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        try {
            const stored = sessionStorage.getItem('cinematch_seen_movies');
            if (stored) seenIdsRef.current = new Set(JSON.parse(stored));
        } catch { /* sessionStorage no disponible */ }
    }, []);

    const markSeen = useCallback((id: string) => {
        seenIdsRef.current.add(id);
        try {
            sessionStorage.setItem('cinematch_seen_movies', JSON.stringify([...seenIdsRef.current]));
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        initSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePlatforms, activeTypes, preferredGenres, activeDeck]);

    async function initSession() {
        setLoading(true);
        setLoadedMovies([]);
        setShortlist([]);
        setShowShortlist(false);
        setDetailsMovie(null);

        let fetchedMovies: Movie[] = [];

        if (activeDeck && activeDeck.movies.length > 0) {
            fetchedMovies = activeDeck.movies;
        } else {
            if (activePlatforms.length === 0 || activeTypes.length === 0) {
                setLoading(false);
                return;
            }
            const region = (typeof navigator !== 'undefined' ? (navigator.language.split('-')[1]?.toUpperCase() || 'ES') : 'ES') as 'ES' | 'US';
            fetchedMovies = await getMovies(activePlatforms, activeTypes, region, preferredGenres, [...seenIdsRef.current], language);
        }

        const filteredMovies = fetchedMovies.filter(m => {
            if (m.source === 'challenge') return !lobbyConfig;
            return true;
        });

        setLoadedMovies(filteredMovies);
        setCurrentIndex(0);
        setLoading(false);
    }

    const handleSwipe = (dir: 'left' | 'right') => {
        if (direction) return;

        setDirection(dir);
        const currentMovie = loadedMovies[currentIndex];

        // Animación de vuelo SOLO en modo deck (cuando existe el icono cesta 💕 en esquina)
        if (dir === 'right' && activeDeck) {
            setFlyingItem({ image: currentMovie.image, id: currentMovie.id });
            setTimeout(() => setFlyingItem(null), 800);
        }

        setTimeout(() => {
            // Marcar como visto para no repetir en esta sesión
            markSeen(currentMovie.id);

            if (dir === 'right') {
                getWatchLink(currentMovie.id, currentMovie.type, platforms, 'ES', currentMovie.title).then(({ link, providerName, providers }) => {
                    const movieToSave = {
                        ...currentMovie,
                        providerName: providerName || undefined,
                        watchLink: link || undefined,
                        providers: providers || []
                    };
                    if (activeDeck) {
                        setShortlist(prev => [...prev, movieToSave]);
                    } else {
                        addLike(movieToSave);
                    }
                });
            }

            if (currentIndex < loadedMovies.length - 1) {
                setCurrentIndex(prev => prev + 1);
                setDirection(null);
            } else {
                if (activeDeck) {
                    setShowShortlist(true);
                } else {
                    // Se acabaron las de este lote — cargar más sin repetir las ya vistas
                    initSession();
                }
                setDirection(null);
            }
        }, 300);
    };

    // --- Drag / Touch handlers ---
    const onDragStart = (clientX: number) => {
        if (direction) return;
        dragStartX.current = clientX;
        dragCurrentX.current = clientX;
        isDragging.current = true;
    };
    const onDragMove = (clientX: number) => {
        if (!isDragging.current || dragStartX.current === null) return;
        dragCurrentX.current = clientX;
        setDragOffset(clientX - dragStartX.current);
    };
    const onDragEnd = () => {
        if (!isDragging.current) return;
        isDragging.current = false;
        const offset = dragCurrentX.current - (dragStartX.current ?? 0);
        dragStartX.current = null;
        if (Math.abs(offset) >= SWIPE_THRESHOLD) {
            setDragOffset(0);
            handleSwipe(offset > 0 ? 'right' : 'left');
        } else {
            setDragOffset(0);
        }
    };
    const onTouchStart = (e: React.TouchEvent) => onDragStart(e.touches[0].clientX);
    const onTouchMove = (e: React.TouchEvent) => onDragMove(e.touches[0].clientX);
    const onTouchEnd = () => onDragEnd();
    const onMouseDown = (e: React.MouseEvent) => { e.preventDefault(); onDragStart(e.clientX); };
    const onMouseMove = (e: React.MouseEvent) => { if (isDragging.current) onDragMove(e.clientX); };
    const onMouseUp = () => onDragEnd();
    const onMouseLeave = () => { if (isDragging.current) onDragEnd(); };

    const handleResolveChallenge = (accepted: boolean) => {
        if (!activeChallenge) return;

        if (accepted) {
            const m = activeChallenge.movie;
            getWatchLink(m.id, m.type, platforms, 'ES', m.title).then(({ link, providerName, providers }) => {
                addLike({
                    ...m,
                    providerName: providerName || undefined,
                    watchLink: link || undefined,
                    providers: providers || []
                });
                // La animación de vuelo solo tiene sentido si hay cesta (modo deck)
                if (activeDeck) {
                    setFlyingItem({ image: m.image, id: m.id });
                    setTimeout(() => setFlyingItem(null), 800);
                }
            });
        }

        resolveChallenge(accepted);
    };

    const handleModalLike = () => {
        handleSwipe('right');
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--muted-foreground)' }}>
                {t.loadingData}
            </div>
        );
    }

    if (showShortlist) {
        return (
            <ShortlistView
                movies={shortlist}
                onClose={() => setActiveDeck(null)}
                onRestart={initSession}
            />
        );
    }

    if (loadedMovies.length === 0) {
        const needsSetup = activePlatforms.length === 0 || activeTypes.length === 0;
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '0 24px' }}>
                <p style={{ color: 'var(--muted-foreground)' }}>
                    {!needsSetup
                        ? t.noMoreMovies
                        : user
                            ? t.setupDescription
                            : (language === 'es'
                                ? 'Desliza películas y series de tus plataformas, guarda las que te gusten y decide con tus amigos qué ver. Pruébalo sin crear cuenta.'
                                : 'Swipe through movies and series from your platforms, save the ones you like and decide with friends what to watch. Try it without an account.')}
                </p>
                {needsSetup && !user && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <GuestAccessButton variant="default" />
                        <Link href="/auth/login" style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>
                            ¿Ya tienes cuenta? <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Inicia sesión</span>
                        </Link>
                    </div>
                )}
                {needsSetup && user && (
                    <Link
                        href="/setup"
                        className="btn-primary"
                        style={{ width: 'auto', paddingInline: 32 }}
                    >
                        {t.configure}
                    </Link>
                )}
            </div>
        );
    }

    const currentMovie = loadedMovies[currentIndex];
    const nextMovie = loadedMovies[currentIndex + 1];
    const progress = (currentIndex / loadedMovies.length) * 100;

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', height: '100%' }}>

            <style jsx>{`
                @keyframes flyToBasket {
                    0%   { top: 40%; left: 50%; transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    20%  { transform: translate(-50%, -50%) scale(1.1); }
                    100% { top: 90%; left: 90%; transform: translate(-50%, -50%) scale(0.1); opacity: 0.5; }
                }
                .flying-card {
                    position: absolute;
                    width: 200px;
                    aspect-ratio: 2/3;
                    z-index: 100;
                    border-radius: 12px;
                    pointer-events: none;
                    animation: flyToBasket 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
                    box-shadow: 0 10px 30px rgba(75, 255, 179, 0.5);
                    border: 2px solid var(--secondary);
                }
            `}</style>

            {/* Movie Details Modal */}
            {detailsMovie && (
                <MovieDetailsModal
                    movie={detailsMovie}
                    onClose={() => setDetailsMovie(null)}
                    onLike={handleModalLike}
                />
            )}

            {/* Challenge overlay */}
            {activeChallenge && !isOverlayBlocked && !activeDeck && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 9999 }}>
                    <ChallengeCardOverlay
                        movie={activeChallenge.movie}
                        sender={activeChallenge.sender}
                        onResolve={handleResolveChallenge}
                    />
                </div>
            )}

            {/* Animación de vuelo hacia la cesta (solo modo deck) */}
            {flyingItem && (
                <img src={flyingItem.image} className="flying-card" alt="" />
            )}

            {/* Barra de progreso (solo modo deck) */}
            {activeDeck && (
                <div style={{ marginBottom: '15px', padding: '0 10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#888', marginBottom: '5px' }}>
                        <span>{t.card} {currentIndex + 1} {t.of} {loadedMovies.length}</span>
                        <span>{shortlist.length} {t.inBasket}</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--muted)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--secondary)', transition: 'width 0.3s ease' }} />
                    </div>
                </div>
            )}

            {/* Cards stack */}
            <div style={{ flex: 1, position: 'relative', marginBottom: activeDeck ? '20px' : '30px' }}>
                {nextMovie && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                        transform: 'scale(0.95) translateY(10px)', opacity: 0.5, zIndex: 0
                    }}>
                        <MovieCard movie={nextMovie} />
                    </div>
                )}

                <div
                    style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                        zIndex: 10,
                        transform: direction === 'left'
                            ? 'translateX(-130%) rotate(-25deg)'
                            : direction === 'right' && !activeDeck
                            ? 'translateX(130%) rotate(25deg)'
                            : isDragging.current || dragOffset !== 0
                            ? `translateX(${dragOffset}px) rotate(${dragOffset * 0.08}deg)`
                            : 'translate(0) rotate(0)',
                        transition: direction
                            ? 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.35s'
                            : isDragging.current || dragOffset !== 0
                            ? 'none'
                            : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
                        opacity: direction ? 0 : 1,
                        cursor: isDragging.current ? 'grabbing' : 'grab',
                        userSelect: 'none',
                    }}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseLeave}
                >
                    <MovieCard
                        movie={currentMovie}
                        onOpenDetails={() => setDetailsMovie(currentMovie)}
                    />

                    {(direction === 'right' || dragOffset > 20) && !activeDeck && (
                        <div style={{
                            position: 'absolute', top: 40, left: 40,
                            border: '4px solid var(--secondary)', color: 'var(--secondary)',
                            fontSize: '32px', fontWeight: 800, padding: '5px 10px',
                            borderRadius: '8px', transform: 'rotate(-15deg)',
                            opacity: direction ? 1 : Math.min(Math.abs(dragOffset) / SWIPE_THRESHOLD, 1),
                            pointerEvents: 'none',
                        }}>{t.like}</div>
                    )}
                    {(direction === 'left' || dragOffset < -20) && (
                        <div style={{
                            position: 'absolute', top: 40, right: 40,
                            border: '4px solid var(--destructive)', color: 'var(--destructive)',
                            fontSize: '32px', fontWeight: 800, padding: '5px 10px',
                            borderRadius: '8px', transform: 'rotate(15deg)',
                            opacity: direction ? 1 : Math.min(Math.abs(dragOffset) / SWIPE_THRESHOLD, 1),
                            pointerEvents: 'none',
                        }}>{t.nope}</div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '30px', paddingBottom: '10px', position: 'relative' }}>
                <button className="btn-icon dislike" onClick={() => handleSwipe('left')} disabled={!!direction} aria-label="No me gusta">✕</button>
                <button className="btn-icon like" onClick={() => handleSwipe('right')} disabled={!!direction} aria-label={t.like || 'Me gusta'}>♥</button>

                {activeDeck && (
                    <>
                        {/* Basket button (bottom right) */}
                        <button
                            onClick={() => setShowShortlist(true)}
                            style={{
                                position: 'absolute', right: 10, bottom: 10,
                                width: '50px', height: '50px', borderRadius: '50%',
                                background: 'var(--card)', border: '2px solid var(--secondary)',
                                color: 'var(--secondary)', display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)', cursor: 'pointer', zIndex: 20
                            }}
                        >
                            <span style={{ fontSize: '1.2rem' }}>💕</span>
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{shortlist.length}</span>
                        </button>

                        {/* Exit deck button (bottom left) */}
                        <button
                            onClick={() => setActiveDeck(null)}
                            style={{
                                position: 'absolute', left: 10, bottom: 10,
                                padding: '8px 14px', borderRadius: '25px',
                                background: 'var(--destructive)',
                                color: 'white', border: 'none',
                                fontWeight: 'bold', fontSize: '0.8rem',
                                cursor: 'pointer', zIndex: 20,
                                display: 'flex', alignItems: 'center', gap: '6px',
                                boxShadow: '0 4px 12px rgba(255,0,85,0.35)',
                            }}
                        >
                            <DoorOpen size={16} aria-hidden />
                            <span>{t.exitDeck}</span>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
