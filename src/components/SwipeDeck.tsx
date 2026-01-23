import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getMovies, Movie } from '@/lib/data';
import { simulateBotSwipes } from '@/lib/gameLogic';
import MovieCard from './MovieCard';
import ShortlistView from './ShortlistView'; // Import new view
import { useLanguage } from '@/context/LanguageContext';
import { useUser } from '@/context/UserContext';
import { getWatchLink } from '@/services/tmdb';

import { useLobby } from '@/context/LobbyContext';
import { useDecks } from '@/context/DeckContext';
import { useChallenge } from '@/context/ChallengeContext';
import ChallengeCardOverlay from './ChallengeCardOverlay';

interface SwipeDeckProps {
    isOverlayBlocked?: boolean;
}

export default function SwipeDeck({ isOverlayBlocked = false }: SwipeDeckProps) {
    const router = useRouter();
    const { t, language } = useLanguage();
    const { platforms, contentTypes, addLike } = useUser();
    const { config: lobbyConfig } = useLobby();
    const { activeDeck, setActiveDeck } = useDecks();
    const { activeChallenge, resolveChallenge, triggerBotChallenge } = useChallenge(); // Challenge Hook

    // Use Lobby config if available, otherwise local user config
    const activePlatforms = lobbyConfig ? lobbyConfig.platforms : platforms;
    const activeTypes = lobbyConfig ? lobbyConfig.contentTypes : contentTypes;

    const [currentIndex, setCurrentIndex] = useState(0);
    // ... (rest of state items, lines 26-29)
    const [botLikes, setBotLikes] = useState<Set<string>>(new Set());
    const [direction, setDirection] = useState<'left' | 'right' | null>(null);
    const [loadedMovies, setLoadedMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);

    // Shortlist Mode State
    const [shortlist, setShortlist] = useState<Movie[]>([]);
    const [showShortlist, setShowShortlist] = useState(false);

    // Load Movies & Bot Logic
    useEffect(() => {
        initSession();
    }, [activePlatforms, activeTypes, activeDeck]);

    async function initSession() {
        setLoading(true);
        setLoadedMovies([]);
        setShortlist([]);
        setShowShortlist(false);

        let fetchedMovies: Movie[] = [];

        if (activeDeck && activeDeck.movies.length > 0) {
            // CURATOR MODE: Use deck movies
            fetchedMovies = activeDeck.movies;
        } else {
            // STANDARD MODE: Fetch from API
            fetchedMovies = await getMovies(activePlatforms, activeTypes);
        }

        // Filtrar tarjetas de retos: solo permitirlas en modo SOLO (sin lobby)
        const filteredMovies = fetchedMovies.filter(m => {
            if (m.source === 'challenge') {
                return !lobbyConfig; // Solo permitir retos en modo SOLO (sin lobby)
            }
            return true;
        });

        setLoadedMovies(filteredMovies);
        setCurrentIndex(0);
        setBotLikes(simulateBotSwipes(fetchedMovies));
        setLoading(false);
    }

    // Flying Animation State
    const [flyingItem, setFlyingItem] = useState<{ image: string, id: string } | null>(null);

    const handleSwipe = (dir: 'left' | 'right') => {
        if (direction) return; // Prevent double swipe

        setDirection(dir);
        const currentMovie = loadedMovies[currentIndex];

        // BOT CHALLENGE SIMULATION (5% Chance)
        // BOT CHALLENGE SIMULATION (5% Chance, only in Standard Mode)
        if (!activeDeck && Math.random() < 0.05) {
            triggerBotChallenge();
        }

        // Trigger Flying Animation immediately on Right Swipe
        if (dir === 'right') {
            setFlyingItem({ image: currentMovie.image, id: currentMovie.id });

            // Clear flying item after animation (e.g. 800ms)
            setTimeout(() => {
                setFlyingItem(null);
            }, 800);
        }

        // Animation delay for card removal
        setTimeout(() => {
            // Logic
            if (dir === 'right') {
                // Fetch provider info properly
                getWatchLink(currentMovie.id, currentMovie.type, platforms).then(({ link, providerName, providers }) => {
                    const movieToSave = {
                        ...currentMovie,
                        providerName: providerName || undefined,
                        watchLink: link || undefined,
                        providers: providers || []
                    };

                    // Logic Split based on Mode
                    if (activeDeck) {
                        // DECK MODE: Add to Shortlist (Silent)
                        setShortlist(prev => [...prev, movieToSave]);
                    } else {
                        // STANDARD MODE: Global Like
                        addLike(movieToSave);
                    }
                });

                // Bot Match Check (Only in Standard Mode or Logic if needed)
                if (!activeDeck && botLikes.has(currentMovie.id)) {
                    // Standard Match Logic check could go here
                }
            }



            // Next card
            if (currentIndex < loadedMovies.length - 1) {
                setCurrentIndex(prev => prev + 1);
                setDirection(null);
            } else {
                // End of deck
                if (activeDeck) {
                    setShowShortlist(true); // Show results
                } else {
                    alert(t.noMoreMovies);
                    setCurrentIndex(0);
                }
                setDirection(null);
            }
        }, 300); // Wait for card swipe out
    };

    // --- RENDER HELPERS ---

    // CHALLENGE RESOLUTION
    const handleResolveChallenge = (accepted: boolean) => {
        if (!activeChallenge) return;

        // If accepted, add to likes!
        if (accepted) {
            const m = activeChallenge.movie;
            getWatchLink(m.id, m.type, platforms).then(({ link, providerName, providers }) => {
                const movieToSave = {
                    ...m,
                    providerName: providerName || undefined,
                    watchLink: link || undefined,
                    providers: providers || []
                };
                addLike(movieToSave);

                // Optional: trigger flying animation for challenge
                setFlyingItem({ image: m.image, id: m.id });
                setTimeout(() => setFlyingItem(null), 800);
            });
        }

        resolveChallenge(accepted);
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>Loading content...</div>;

    // Show Shortlist View if finished
    if (showShortlist) {
        return <ShortlistView
            movies={shortlist}
            onClose={() => setActiveDeck(null)}
            onRestart={initSession}
        />;
    }

    if (loadedMovies.length === 0) return <div>No content found...</div>;

    // IF CHALLENGE: Override current movie
    const currentMovie = loadedMovies[currentIndex];
    const nextMovie = loadedMovies[currentIndex + 1];

    // Progress Bar Calculation
    const progress = ((currentIndex) / loadedMovies.length) * 100;

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', height: '100%' }}>

            {/* INLINE STYLES FOR ANIMATION */}
            <style jsx>{`
                @keyframes flyToBasket {
                    0% {
                        top: 40%;
                        left: 50%;
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 1;
                    }
                    20% {
                        transform: translate(-50%, -50%) scale(1.1); /* Slight pop */
                    }
                    100% {
                        top: 90%; /* Toward bottom */
                        left: 90%; /* Toward right */
                        transform: translate(-50%, -50%) scale(0.1);
                        opacity: 0.5;
                    }
                }
                .flying-card {
                    position: absolute;
                    width: 200px; /* Start width */
                    aspect-ratio: 2/3;
                    z-index: 100;
                    border-radius: 12px;
                    pointer-events: none;
                    animation: flyToBasket 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
                    box-shadow: 0 10px 30px rgba(75, 255, 179, 0.5);
                    border: 2px solid var(--accent-green);
                }
            `}</style>

            {/* CHALLENGE OVERLAY (Highest Priority) */}
            {activeChallenge && !isOverlayBlocked && !activeDeck && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 9999 }}>
                    <ChallengeCardOverlay
                        movie={activeChallenge.movie}
                        sender={activeChallenge.sender}
                        onResolve={handleResolveChallenge}
                    />
                </div>
            )}

            {/* Flying Element */}
            {flyingItem && (
                <img
                    src={flyingItem.image}
                    className="flying-card"
                />
            )}

            {/* Progress Bar (Deck Mode Only) */}
            {activeDeck && (
                <div style={{ marginBottom: '15px', padding: '0 10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#888', marginBottom: '5px' }}>
                        <span>{t.card} {currentIndex + 1} {t.of} {loadedMovies.length}</span>
                        <span>{shortlist.length} {t.inBasket}</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-green)', transition: 'width 0.3s ease' }} />
                    </div>
                </div>
            )}

            {/* Cards Stack */}
            <div style={{ flex: 1, position: 'relative', marginBottom: activeDeck ? '20px' : '30px' }}>
                {/* Next Card (Background) */}
                {nextMovie && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, width: '100%', height: '100%',
                        transform: 'scale(0.95) translateY(10px)',
                        opacity: 0.5,
                        zIndex: 0
                    }}>
                        <MovieCard movie={nextMovie} />
                    </div>
                )}

                {/* Current Card */}
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    zIndex: 10,
                    transition: 'transform 0.4s ease-out, opacity 0.4s',
                    transform: direction === 'left' ? 'translateX(-120%) rotate(-20deg)' :
                        direction === 'right' ? 'translateX(120%) rotate(20deg)' : 'translate(0) rotate(0)',
                    opacity: direction ? 0 : 1
                }}>
                    <MovieCard movie={currentMovie} />

                    {/* Swipe Indicators */}
                    {direction === 'right' && (
                        <div style={{
                            position: 'absolute', top: 40, left: 40,
                            border: '4px solid var(--accent-green)', color: 'var(--accent-green)',
                            fontSize: '32px', fontWeight: 800, padding: '5px 10px',
                            borderRadius: '8px', transform: 'rotate(-15deg)'
                        }}>{t.like}</div>
                    )}
                    {direction === 'left' && (
                        <div style={{
                            position: 'absolute', top: 40, right: 40,
                            border: '4px solid var(--accent-red)', color: 'var(--accent-red)',
                            fontSize: '32px', fontWeight: 800, padding: '5px 10px',
                            borderRadius: '8px', transform: 'rotate(15deg)'
                        }}>{t.nope}</div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '30px', paddingBottom: '10px', position: 'relative' }}>
                <button
                    className="btn-icon dislike"
                    onClick={() => handleSwipe('left')}
                    disabled={!!direction}
                >
                    ✕
                </button>
                <button
                    className="btn-icon like"
                    onClick={() => handleSwipe('right')}
                    disabled={!!direction}
                >
                    ♥
                </button>

                {/* Basket FAB (Deck Mode) */}
                {activeDeck && (
                    <button
                        onClick={() => setShowShortlist(true)}
                        style={{
                            position: 'absolute',
                            right: 10,
                            bottom: 10,
                            width: '50px',
                            height: '50px',
                            borderRadius: '50%',
                            background: '#252525',
                            border: '2px solid var(--accent-green)',
                            color: 'var(--accent-green)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            cursor: 'pointer',
                            zIndex: 20
                        }}
                    >
                        <span style={{ fontSize: '1.2rem' }}>💕</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{shortlist.length}</span>
                    </button>
                )}
            </div>
        </div >
    );
}
