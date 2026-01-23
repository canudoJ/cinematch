'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLobby } from '@/context/LobbyContext';
import { useLanguage } from '@/context/LanguageContext';
import { useUser } from '@/context/UserContext';
import { discoverContent, getWatchLink } from '@/services/tmdb';
import { Movie, Deck } from '@/lib/data';
import { useDecks } from '@/context/DeckContext';
import RouletteSetupModal, { RouletteConfig } from '@/components/RouletteSetupModal';
import BackButton from '@/components/ui/BackButton';

// --- TYPES ---
type GamePhase = 'setup' | 'lobby' | 'swiping' | 'spinning' | 'winner';

export default function RoulettePage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { createLobby, lobbyId, players, simulateGuestJoin, leaveLobby } = useLobby();
    const { platforms } = useUser();
    const { decks: myDecks } = useDecks();

    const [phase, setPhase] = useState<GamePhase>('setup');
    const [movies, setMovies] = useState<Movie[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [matches, setMatches] = useState<Movie[]>([]);
    const [timeLeft, setTimeLeft] = useState(60);
    const [winner, setWinner] = useState<Movie | null>(null);
    const [spinRotation, setSpinRotation] = useState(0);

    const [gameConfig, setGameConfig] = useState<RouletteConfig | null>(null);
    const [showSetupModal, setShowSetupModal] = useState(false);

    // --- NAVIGATION ---
    // --- NAVIGATION ---
    const handleBack = () => {
        // Helper to exit clean
        const exit = () => {
            if (lobbyId) leaveLobby(); // Clean up lobby status so we don't see "Exit Lobby" button in dashboard
            router.push('/');
        };

        if (phase === 'setup' || phase === 'lobby' || phase === 'winner') {
            exit();
        } else {
            if (window.confirm('¿Abandonar la partida en curso?')) {
                exit();
            }
        }
    };

    // --- SETUP & LOBBY ---
    const handleOpenSetup = () => {
        setShowSetupModal(true);
    };

    const handleCreateGame = (config: RouletteConfig) => {
        setGameConfig(config);
        setShowSetupModal(false);
        createLobby({ platforms: config.providers, contentTypes: [config.mediaType === 'both' ? 'movie' : config.mediaType] as any });
        setPhase('lobby');
        simulateGuestJoin();
    };

    const handleStartGame = async () => {
        if (!gameConfig) return;

        let results: any[] = [];

        // 1. Fetch based on Source
        if (gameConfig.sourceType === 'deck') {
            const deck = myDecks.find(d => d.id === gameConfig.sourceValue);
            if (deck) {
                // Use deck movies directly
                results = deck.movies.map(m => ({ ...m, release_date: m.year.toString(), poster_path: m.image.replace('https://image.tmdb.org/t/p/w500', '') }));
                // Note: The map above reverses our internal Movie format to partial TMDB raw format or we can just use them directly.
                // Actually easier to just use them as is if we handle the mapping below correctly.
                // Let's standardise on "Movie" type.
            }
        } else {
            // API Discovery
            const params: any = {
                sort_by: 'popularity.desc',
                page: 1,
                'vote_average.gte': gameConfig.minRating
            };

            if (gameConfig.sourceType === 'genre') {
                params.with_genres = gameConfig.sourceValue;
            } else if (gameConfig.sourceType === 'surprise') {
                params.page = Math.floor(Math.random() * 10) + 1; // Random page
            }

            // Platform filtering Logic
            if (gameConfig.providers.length > 0) {
                // Fix for HBO: Combine HBO Max (118), Max (384), and Max Amazon Channel (1796)
                const processedIds = gameConfig.providers.map(id => (id === '384' || id === '118') ? '118|384|1796' : id);
                params.with_watch_providers = processedIds.join('|');
                params.watch_region = 'ES';
            }

            const rawResults = await discoverContent(gameConfig.mediaType === 'both' ? 'movie' : gameConfig.mediaType, params);
            results = rawResults;
        }

        // Map to internal Movie format
        const mapped: Movie[] = results.slice(0, 30).map(item => ({
            id: item.id.toString(),
            type: item.type || (gameConfig.mediaType === 'both' ? 'movie' : gameConfig.mediaType),
            title: item.title || item.name || item.title_es || 'Unknown', // Handle both raw API and internal deck format
            title_es: item.title || item.name,
            year: typeof item.year === 'number' ? item.year : new Date(item.release_date || item.first_air_date || Date.now()).getFullYear(),
            rating: item.rating || item.vote_average || 0,
            image: item.image || (item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : ''),
            synopsis: item.synopsis || item.overview || '',
            synopsis_es: item.synopsis_es || item.overview,
            genres: item.genres || []
        })).filter(m => m.image); // Ensure image exists

        setMovies(mapped);
        setPhase('swiping');
    };

    // --- SWIPE PHASE ---
    useEffect(() => {
        if (phase === 'swiping' && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
            return () => clearInterval(timer);
        } else if (phase === 'swiping' && timeLeft === 0) {
            handleTimeUp();
        }
    }, [phase, timeLeft]);

    const handleTimeUp = () => {
        if (matches.length === 0 && movies.length > 0) {
            setMatches([movies[0], movies[1] || movies[0]]); // Ensure at least 1 (preferably 2 for wheel look)
        }
        setPhase('spinning');
    };

    const handleSwipe = (direction: 'left' | 'right') => {
        if (direction === 'right') {
            const currentMovie = movies[currentIndex];
            // SIMULATION: 40% chance "Ana" also likes it
            if (Math.random() > 0.6) {
                setMatches(prev => [...prev, currentMovie]);
            }
        }

        if (currentIndex < movies.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            handleTimeUp();
        }
    };

    // --- SPIN PHASE ---
    const spinWheel = () => {
        if (matches.length === 0) return;

        // 1. Decide Winner Deterministically
        const winnerIndex = Math.floor(Math.random() * matches.length);
        const selectedWinner = matches[winnerIndex];

        // 2. Calculate Strict Rotation
        // We want 5 full spins (1800) + alignment to the winner.
        // If the wheel has N items, each slice is 360/N.
        // Item i starts at (i * sliceAngle). We want that angle to be at 0 (Top).
        // So we rotate by (360 - startAngle).
        // Adjust for -90deg offset in CSS if needed, but here let's align strictly.

        const sliceAngle = 360 / matches.length;
        // Target rotation to bring slice index to top:
        const targetRotation = 360 - (winnerIndex * sliceAngle);
        // Add random full spins (5 to 10)
        const totalSpins = 360 * 8;

        const finalDeg = totalSpins + targetRotation;

        setSpinRotation(finalDeg);
        if (navigator.vibrate) navigator.vibrate(200);

        // Store pending winner to reveal after animation
        // We rely on onTransitionEnd now, but we set a fallback ref just in case? 
        // Better to use state for "pendingWinner" or just trust the math.
        // Actually, we can just set the winner state but only SHOW it phase='winner' later.
        // Let's store the index/movie in a ref or temp state if we want to wait, 
        // but updating 'winner' state here is fine as long as phase doesn't switch.
        setWinner(selectedWinner);
    };

    const handleWheelTransitionEnd = () => {
        if (spinRotation > 0 && phase !== 'winner') {
            setPhase('winner');
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        }
    };

    // --- RENDER ---
    return (
        <div style={{ height: '100vh', background: 'var(--bg-dark)', color: 'white', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {showSetupModal && (
                <RouletteSetupModal
                    onClose={() => setShowSetupModal(false)}
                    onCreate={handleCreateGame}
                />
            )}

            {/* Header / Exit */}
            <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 }}>
                <BackButton onClick={handleBack} className="absolute top-5 left-5" />
                <h2 style={{ margin: 0, color: 'var(--accent-red-alt)', textShadow: '0 0 10px rgba(255, 71, 87, 0.5)' }}>Ruleta Rusa 🔫</h2>
                <div style={{ width: '30px' }} />
            </div>

            {/* SETUP (Landing) */}
            {phase === 'setup' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '20px' }} className="animate-bounce">🎲</div>
                    <p style={{ textAlign: 'center', maxWidth: '300px', marginBottom: '30px', color: '#aaa' }}>
                        Toma decisiones rápidas con tu grupo. Nada de discusiones. La suerte decide.
                    </p>
                    <button onClick={handleOpenSetup} className="btn-primary" style={{ padding: '20px 40px', fontSize: '1.2rem', borderRadius: '30px' }}>
                        Configurar Partida
                    </button>
                </div>
            )}

            {/* LOBBY */}
            {phase === 'lobby' && (
                <div className="animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <h3 style={{ color: '#888' }}>CÓDIGO DE SALA</h3>
                    <div style={{ fontSize: '3rem', letterSpacing: '5px', fontWeight: '900', color: 'var(--accent-red-alt)', marginBottom: '40px' }}>
                        {lobbyId}
                    </div>

                    <div style={{ display: 'flex', gap: '30px', marginBottom: '50px' }}>
                        <div className="animate-pop-in">
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', marginBottom: '10px' }}>👤</div>
                            <div style={{ textAlign: 'center' }}>Tú</div>
                        </div>
                        {players[1] ? (
                            <div className="animate-pop-in">
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--accent-red-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', marginBottom: '10px' }}>👩</div>
                                <div style={{ textAlign: 'center' }}>Ana</div>
                            </div>
                        ) : (
                            <div style={{ opacity: 0.5 }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px dashed #666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
                                <div style={{ textAlign: 'center' }}>Esperando...</div>
                            </div>
                        )}
                    </div>

                    <div style={{ marginBottom: '20px', color: '#888', background: '#222', padding: '10px 20px', borderRadius: '20px' }}>
                        {gameConfig?.mediaType === 'movie' ? '🎬 Pelis' : '📺 Series'} • {gameConfig?.sourceType === 'trending' ? 'Trending' : 'Custom'}
                    </div>

                    <button
                        onClick={handleStartGame}
                        disabled={players.length < 2}
                        style={{
                            padding: '15px 50px',
                            background: players.length < 2 ? '#333' : 'var(--accent-red-alt)',
                            color: players.length < 2 ? '#666' : 'white',
                            border: 'none', borderRadius: '30px', fontSize: '1.2rem', fontWeight: 'bold', cursor: players.length < 2 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {players.length < 2 ? 'Esperando jugadores...' : 'Empezar Juego'}
                    </button>
                </div>
            )}

            {/* SWIPING - (Unchanged mostly) */}
            {phase === 'swiping' && movies.length > 0 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: timeLeft < 10 ? 'red' : 'white', marginBottom: '20px', animation: timeLeft < 10 ? 'pulse 0.5s infinite' : 'none' }}>
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </div>
                    <div style={{ position: 'relative', width: '90%', maxWidth: '350px', aspectRatio: '2/3', background: '#222', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                        <img src={movies[currentIndex].image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, black, transparent)', padding: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{movies[currentIndex].title}</h2>
                            <p style={{ margin: '5px 0', fontSize: '0.9rem', opacity: 0.8 }}>{movies[currentIndex].year} • ⭐ {movies[currentIndex].rating.toFixed(1)}</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '40px', marginTop: '30px' }}>
                        <button onClick={() => handleSwipe('left')} style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#333', color: 'var(--accent-red-alt)', border: '2px solid var(--accent-red-alt)', fontSize: '2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✖</button>
                        <button onClick={() => handleSwipe('right')} style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'var(--accent-green)', color: 'black', border: 'none', fontSize: '2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(75, 255, 179, 0.4)' }}>♥</button>
                    </div>
                </div>
            )}

            {/* SPINNING - UPDATED WHEEL */}
            {phase === 'spinning' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <h2 style={{ marginBottom: '20px' }}>¡Gira la Ruleta! 🎰</h2>

                    {/* WHEEL CONTAINER */}
                    <div style={{ position: 'relative', width: '320px', height: '320px', marginBottom: '30px' }}>
                        {/* POINTER */}
                        <div style={{
                            position: 'absolute', top: -15, left: '50%', transform: 'translateX(-50%)',
                            zIndex: 20, width: 0, height: 0,
                            borderLeft: '15px solid transparent', borderRight: '15px solid transparent', borderTop: '30px solid white'
                        }} />

                        {/* ROTATING WHEEL */}
                        <div style={{
                            width: '100%', height: '100%', borderRadius: '50%',
                            position: 'relative', overflow: 'hidden', border: '5px solid #fff',
                            transition: 'transform 4s cubic-bezier(0.1, 0, 0.2, 1)',
                            transform: `rotate(${spinRotation}deg)`,
                            background: '#222',
                            boxShadow: 'inset 0 0 50px black'
                        }}
                            onTransitionEnd={handleWheelTransitionEnd}
                        >
                            {/* GENERATE SLICES */}
                            {matches.map((movie, i) => {
                                const count = matches.length;
                                const angle = 360 / count;
                                const rotation = i * angle;

                                // We render "Spokes" with a card at the end.
                                // The background is a conic gradient for color separation.

                                return (
                                    <div key={i} style={{
                                        position: 'absolute', top: '50%', left: '50%',
                                        width: '150px', height: '0px',
                                        transformOrigin: '0 50%',
                                        transform: `rotate(${rotation + (angle / 2) - 90}deg)`,
                                        display: 'flex', justifyContent: 'flex-end', alignItems: 'center'
                                    }}>
                                        {/* Separator Line (Optional, maybe on the start angle?) */}

                                        {/* CONTENT CARD */}
                                        <div style={{
                                            transform: `rotate(90deg)`,
                                            width: '80px', textAlign: 'center', marginBottom: '20px'
                                        }}>
                                            <div style={{
                                                width: '50px', height: '75px', margin: '0 auto',
                                                borderRadius: '6px', overflow: 'hidden',
                                                border: '2px solid white', boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
                                                position: 'relative', background: '#000'
                                            }}>
                                                <img src={movie.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <div style={{
                                                fontSize: '0.65rem', fontWeight: 'bold', textShadow: '0 2px 4px black',
                                                marginTop: '4px', background: 'rgba(0,0,0,0.6)', padding: '2px 4px', borderRadius: '4px',
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                            }}>
                                                {movie.title}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Background Segments */}
                            <div style={{
                                position: 'absolute', inset: 0, zIndex: -1,
                                background: `conic-gradient(
                                    ${matches.map((_, i) => {
                                    const start = (i / matches.length) * 100;
                                    const end = ((i + 1) / matches.length) * 100;
                                    const color = i % 2 === 0 ? 'var(--accent-red-alt)' : '#2f3542';
                                    return `${color} ${start}% ${end}%`;
                                }).join(', ')}
                                 )`
                            }} />
                        </div>
                    </div>

                    <button
                        onClick={spinWheel}
                        disabled={spinRotation > 0}
                        style={{
                            padding: '15px 40px', background: '#ff9f43', color: 'black', fontWeight: 'bold', borderRadius: '30px', border: 'none', cursor: 'pointer', fontSize: '1.2rem',
                            opacity: spinRotation > 0 ? 0.5 : 1
                        }}
                    >
                        {spinRotation > 0 ? 'GIRANDO...' : 'GIRAR'}
                    </button>
                </div>
            )}

            {/* WINNER (Unchanged) */}
            {phase === 'winner' && winner && (
                <div className="animate-pop-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, #2d3436 0%, #000000 100%)' }}>
                    <h1 style={{ color: 'var(--accent-green)', fontSize: '3rem', marginBottom: '10px', textTransform: 'uppercase' }}>¡Tenemos Ganador!</h1>
                    <div style={{ fontSize: '1.5rem', marginBottom: '30px' }}>🥇 La Ruleta ha hablado</div>
                    <div style={{ width: '250px', borderRadius: '15px', overflow: 'hidden', border: '4px solid var(--accent-green)', boxShadow: '0 0 50px rgba(75, 255, 179, 0.3)', marginBottom: '30px' }}>
                        <img src={winner.image} style={{ width: '100%', display: 'block' }} />
                    </div>
                    <h2 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '40px', maxWidth: '80%' }}>{winner.title}</h2>
                    <button
                        onClick={async () => {
                            // Detect Region
                            const userRegion = typeof navigator !== 'undefined' ? (navigator.language.split('-')[1] || 'ES') : 'ES';

                            let finalLink = null;
                            let providerName = null;

                            try {
                                const result = await getWatchLink(winner.id, winner.type, platforms, userRegion);
                                finalLink = result.link;
                                providerName = result.providerName || (result.providers.length > 0 ? result.providers[0].name : null);
                            } catch (e) {
                                console.error('Link fetch failed');
                            }

                            // Deep Platform Search Fallback (If we know provider but have no link)
                            if (!finalLink && providerName) {
                                const query = encodeURIComponent(winner.title);
                                const provider = providerName.toLowerCase();

                                if (provider.includes('netflix')) finalLink = `https://www.netflix.com/search?q=${query}`;
                                else if (provider.includes('disney')) finalLink = `https://www.disneyplus.com/search?q=${query}`;
                                else if (provider.includes('amazon') || provider.includes('prime')) finalLink = `https://www.primevideo.com/search?q=${query}&i=instant-video`;
                                else if (provider.includes('hbo') || provider.includes('max')) finalLink = `https://www.hbomax.com/es/es/search?q=${query}`;
                                else if (provider.includes('crunchyroll')) finalLink = `https://www.crunchyroll.com/search?q=${query}`;
                            }

                            if (finalLink) {
                                window.open(finalLink, '_blank');
                            } else {
                                // Last Resort: Google
                                const query = encodeURIComponent(winner.title);
                                window.open(`https://www.google.com/search?q=ver+${query}+online`, '_blank');
                            }
                        }}
                        style={{
                            padding: '20px 50px', background: 'var(--accent-green)', color: 'black',
                            fontSize: '1.2rem', fontWeight: '900', borderRadius: '40px', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase'
                        }}
                    >
                        ▶ Ver Ahora
                    </button>
                    <button onClick={() => router.push('/')} style={{ marginTop: '20px', background: 'none', border: 'none', color: '#666', cursor: 'pointer', textDecoration: 'underline' }}>Volver al inicio</button>
                </div>
            )}
        </div>
    );
}

