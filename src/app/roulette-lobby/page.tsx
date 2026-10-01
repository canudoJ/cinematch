'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLobby } from '@/context/LobbyContext';
import { useLanguage } from '@/context/LanguageContext';
import { useUser } from '@/context/UserContext';
import { discoverContent, getWatchLink } from '@/services/tmdb';
import { Movie, Deck, getMovies } from '@/lib/data';
import { useDecks } from '@/context/DeckContext';
import RouletteSetupModal, { RouletteConfig } from '@/components/RouletteSetupModal';
import RouletteInviteFriendsModal from '@/components/RouletteInviteFriendsModal';
import MovieDetailsModal from '@/components/MovieDetailsModal';
import BackButton from '@/components/ui/BackButton';
import { Dices, User, Clock, Film, Tv, X, Heart, Target, RotateCcw, Trophy, Play, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// --- TYPES ---
type GamePhase = 'setup' | 'lobby' | 'swiping' | 'spinning' | 'winner';

export default function RoulettePage() {
    const router = useRouter();
    const { t, language } = useLanguage();
    const { createLobby, joinLobby, lobbyId, players, leaveLobby, isHost, config, status } = useLobby();
    const { platforms, user } = useUser();
    const { decks: myDecks } = useDecks();

    const [phase, setPhase] = useState<GamePhase>('setup');
    const [movies, setMovies] = useState<Movie[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [matches, setMatches] = useState<Movie[]>([]);
    const [timeLeft, setTimeLeft] = useState(60);
    const [winner, setWinner] = useState<Movie | null>(null);
    const [winnerWatchInfo, setWinnerWatchInfo] = useState<{ link: string | null; providerName: string | null } | null>(null);
    const [spinRotation, setSpinRotation] = useState(0);

    const [gameConfig, setGameConfig] = useState<RouletteConfig | null>(null);
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [showTimeoutModal, setShowTimeoutModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showInviteFriendsModal, setShowInviteFriendsModal] = useState(false);
    // Para no repetir el giro cuando el ángulo viene del servidor
    const spinSyncedRef = useRef(false);
    // Ref de phase para acceder al valor actual desde callbacks sin stale closure
    const phaseRef = useRef<GamePhase>('setup');
    // Mantener phaseRef sincronizado con phase
    useEffect(() => { phaseRef.current = phase; }, [phase]);

    // Pre-cargar link de plataforma cuando hay ganador
    useEffect(() => {
        if (!winner) { setWinnerWatchInfo(null); return; }
        const region = typeof navigator !== 'undefined' ? (navigator.language.split('-')[1]?.toUpperCase() || 'ES') : 'ES';
        getWatchLink(winner.id, winner.type, platforms, region, winner.title).then(result => {
            // Prioridad: providers[0].link (search URL directo a plataforma) > link > null
            const bestLink = (result.providers.length > 0 ? result.providers[0].link : null) || result.link;
            const bestName = (result.providers.length > 0 ? result.providers[0].name : null) || result.providerName;
            setWinnerWatchInfo({ link: bestLink, providerName: bestName });
        }).catch(() => setWinnerWatchInfo({ link: null, providerName: null }));
    }, [winner?.id, platforms]);

    // Evitar múltiples intentos de auto-join en el invitado
    const autoJoinAttemptedRef = useRef(false);

    // --- EFFECTS ---
    // Invitados: si ya están en un lobby, ir directamente a la vista de lobby (no al setup)
    useEffect(() => {
        if (lobbyId && !isHost && phase === 'setup') {
            setPhase('lobby');
        }
    }, [lobbyId, isHost, phase]);

    // Reintentar UNA VEZ la conexión al lobby si venimos de una invitación
    useEffect(() => {
        if (lobbyId || isHost) return;
        if (typeof window === 'undefined') return;
        if (autoJoinAttemptedRef.current) return;

        const storedLobbyId = window.localStorage.getItem('lastRouletteLobbyId');
        if (storedLobbyId) {
            autoJoinAttemptedRef.current = true;
            joinLobby(storedLobbyId);
        }
    }, [lobbyId, isHost, joinLobby]);

    // Si el host ya tiene una config guardada en contexto (por ejemplo, al recargar),
    // sincronizarla con el estado local de juego.
    useEffect(() => {
        if (!gameConfig && config?.mode === 'roulette' && config.rouletteConfig) {
            setGameConfig(config.rouletteConfig as RouletteConfig);
        }
    }, [config, gameConfig]);

    // Sincronizar la fase local con el estado del lobby
    useEffect(() => {
        // Sin lobby: siempre volvemos al estado inicial de configuración
        if (!lobbyId) {
            if (phase !== 'setup') {
                setPhase('setup');
                setMovies([]);
                setMatches([]);
                setCurrentIndex(0);
                setTimeLeft(60);
            }
            return;
        }

        // Con lobby creado
        if (status === 'waiting' && phase !== 'lobby') {
            setPhase('lobby');
        }

        // Cuando el lobby entra en modo swiping y tenemos una baraja guardada en config,
        // todos los jugadores cargan esa baraja compartida.
        if (status === 'swiping' && phase !== 'swiping' && (config as any)?.roundMovies) {
            setMovies((config as any).roundMovies as Movie[]);
            setTimeLeft(60);
            setCurrentIndex(0);
            setMatches([]);
            setPhase('swiping');
        }

        // Cuando el lobby pasa a fase de ruleta, todos los jugadores deben ver la ruleta.
        // Solo transicionamos a 'spinning' desde una fase anterior (swiping/lobby), nunca desde 'winner'.
        if (status === 'spinning' && (phase === 'swiping' || phase === 'lobby')) {
            const cfg: any = config || {};

            // Si aún no tenemos coincidencias locales, intentamos cargarlas desde la config compartida
            if (matches.length === 0 && cfg.winningMatches) {
                setMatches(cfg.winningMatches as Movie[]);
            }

            // Sincronizar la rotación final de la ruleta si el host ya la ha calculado
            if (typeof cfg.spinRotation === 'number' && !Number.isNaN(cfg.spinRotation)) {
                setSpinRotation(cfg.spinRotation);
                spinSyncedRef.current = true;
            } else {
                spinSyncedRef.current = false;
            }

            setPhase('spinning');
        }
    }, [status, lobbyId, phase, config, matches.length]);

    // Invitados: si el host desaparece del lobby, salir automáticamente y volver al inicio
    useEffect(() => {
        if (!lobbyId || isHost) return;
        if (players.length === 0) return;

        const anyHost = players.some(p => p.isHost);
        if (!anyHost) {
            // Ya no queda host en este lobby: lo consideramos cerrado
            leaveLobby().catch(() => {});
            router.push('/');
        }
    }, [players, lobbyId, isHost, leaveLobby, router]);

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
            if (window.confirm(t.confirmExitGame)) {
                exit();
            }
        }
    };

    // --- SETUP & LOBBY ---
    const handleOpenSetup = () => {
        // Solo permitir abrir el setup si aún no hay sala creada
        if (lobbyId) return;
        setShowSetupModal(true);
    };

    const handleCreateGame = async (config: RouletteConfig) => {
        setGameConfig(config);
        setShowSetupModal(false);

        // Persistimos configuración en el lobby de ruleta.
        // Solo crear una nueva sala si todavía no existe una.
        if (lobbyId) return;

        await createLobby({
            platforms: config.providers,
            contentTypes: [config.mediaType === 'both' ? 'movie' : config.mediaType] as any,
            mode: 'roulette',
            rouletteConfig: config
        });

        setPhase('lobby');
    };

    const handleStartGame = async () => {
        if (!isHost || !gameConfig || !lobbyId) return;

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

            const tmdbLang = language === 'es' ? 'es-ES' : 'en-US';
            const rawResults = await discoverContent(gameConfig.mediaType === 'both' ? 'movie' : gameConfig.mediaType, { ...params, lang: tmdbLang });
            results = rawResults;
        }

        // Map to internal Movie format
        let mapped: Movie[] = results.slice(0, 30).map(item => ({
            id: item.id.toString(),
            type: item.type || (gameConfig.mediaType === 'both' ? 'movie' : gameConfig.mediaType),
            title: item.title || item.name || item.title_es || 'Unknown',
            title_es: item.title || item.name,
            year: typeof item.year === 'number' ? item.year : new Date(item.release_date || item.first_air_date || Date.now()).getFullYear(),
            rating: item.rating || item.vote_average || 0,
            image: item.image || (item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : ''),
            synopsis: item.synopsis || item.overview || '',
            synopsis_es: item.synopsis_es || (language === 'es' ? item.overview : ''),
            genres: item.genres || []
        })).filter(m => m.image);

        // Fallback: si por cualquier motivo no hemos obtenido resultados,
        // usamos el helper genérico getMovies que ya funciona en otros modos.
        if (mapped.length === 0) {
            try {
                const fallback = await getMovies(
                    gameConfig.providers,
                    [gameConfig.mediaType === 'both' ? 'movie' : gameConfig.mediaType] as any,
                    'ES',
                    [],
                    [],
                    language
                );
                mapped = fallback.slice(0, 30);
            } catch (e) {
                console.error('[handleStartGame] fallback getMovies failed', e);
            }
        }

        setMovies(mapped);
        setTimeLeft(60);
        setCurrentIndex(0);
        setMatches([]);
        setPhase('swiping');

        // Guardar baraja compartida y estado de ronda en el lobby para que
        // todos los jugadores la reciban vía Realtime
        const baseConfig = config || {
            platforms: gameConfig.providers,
            contentTypes: [gameConfig.mediaType === 'both' ? 'movie' : gameConfig.mediaType] as any,
            mode: 'roulette',
            rouletteConfig: gameConfig
        };

        const updatedConfig = {
            ...baseConfig,
            mode: 'roulette',
            platforms: (baseConfig as any).platforms ?? gameConfig.providers,
            contentTypes: (baseConfig as any).contentTypes ?? [gameConfig.mediaType === 'both' ? 'movie' : gameConfig.mediaType],
            rouletteConfig: gameConfig,
            roundMovies: mapped
        };

        await supabase
            .from('roulette_lobbies')
            .update({
                status: 'swiping',
                config: updatedConfig
            })
            .eq('id', lobbyId);
    };

    // --- SWIPE PHASE ---
    useEffect(() => {
        if (phase === 'swiping' && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    const next = prev <= 1 ? 0 : prev - 1;
                    return next;
                });
            }, 1000);
            return () => clearInterval(timer);
        }

        // Cuando el temporizador llega a 0:
        if (phase === 'swiping' && timeLeft === 0) {
            if (isHost) {
                // Solo el anfitrión dispara el cálculo de coincidencias
                handleTimeUp();
            } else {
                // Invitado: se queda esperando a que el host termine la ronda.
            }
        }
    }, [phase, timeLeft, isHost]);

    const handleTimeUp = async () => {
        // Solo el host calcula coincidencias reales y avanza de fase
        if (!isHost || !lobbyId) return;

        // Sin películas cargadas o sin jugadores en el lobby: mostrar timeout
        if (movies.length === 0 || players.length === 0) {
            setShowTimeoutModal(true);
            return;
        }

        const { data, error } = await supabase
            .from('roulette_votes')
            .select('movie_id, user_id')
            .eq('lobby_id', lobbyId)
            .eq('vote', 'like');

        if (error) {
            console.error('Error fetching votes', error);
            setShowTimeoutModal(true);
            return;
        }

        const likesByMovie = new Map<string, Set<string>>();
        (data || []).forEach((row: any) => {
            const movieId = row.movie_id as string;
            const userId = row.user_id as string;
            if (!likesByMovie.has(movieId)) {
                likesByMovie.set(movieId, new Set());
            }
            likesByMovie.get(movieId)!.add(userId);
        });

        const requiredLikes = players.length;
        const winningMovieIds = new Set<string>();
        likesByMovie.forEach((userSet, movieId) => {
            if (userSet.size === requiredLikes) {
                winningMovieIds.add(movieId);
            }
        });

        const sharedMatches = movies.filter(m => winningMovieIds.has(m.id));

        if (sharedMatches.length === 0) {
            // Sin coincidencias: abrir modal de tiempo agotado para que el host decida
            setShowTimeoutModal(true);
            return;
        }

        // Tenemos coincidencias: todos verán la misma ruleta
        setMatches(sharedMatches);
        setPhase('spinning');

        // Construir una config final que incluya las coincidencias para sincronizar la ruleta
        const baseConfig = config || {
            platforms: gameConfig?.providers ?? [],
            contentTypes: [gameConfig?.mediaType === 'both' ? 'movie' : gameConfig?.mediaType] as any,
            mode: 'roulette',
            rouletteConfig: gameConfig ?? null
        };

        const finalConfig = {
            ...baseConfig,
            mode: 'roulette',
            platforms: (baseConfig as any).platforms ?? gameConfig?.providers ?? [],
            contentTypes: (baseConfig as any).contentTypes ?? [gameConfig?.mediaType === 'both' ? 'movie' : gameConfig?.mediaType],
            rouletteConfig: (baseConfig as any).rouletteConfig ?? gameConfig ?? null,
            roundMovies: (baseConfig as any).roundMovies ?? movies,
            winningMatches: sharedMatches
        };

        // Marcar el lobby como en fase de ruleta y persistir coincidencias para que el resto de jugadores avancen también
        await supabase
            .from('roulette_lobbies')
            .update({
                status: 'spinning',
                config: finalConfig
            })
            .eq('id', lobbyId);
    };

    const handleRestart = () => {
        setShowTimeoutModal(false);
        setTimeLeft(60);
        setCurrentIndex(0);
        setMatches([]);
        setPhase('swiping');
    };

    const handleSurpriseMe = () => {
        setShowTimeoutModal(false);
        // Seleccionar una película al azar de la lista
        const randomIndex = Math.floor(Math.random() * movies.length);
        const randomMovie = movies[randomIndex];
        setMatches([randomMovie]);
        setWinner(randomMovie);
        setPhase('winner');
    };

    const handleSwipe = (direction: 'left' | 'right') => {
        const currentMovie = movies[currentIndex];

        // Registrar voto en Supabase para este lobby/jugador
        const vote = direction === 'right' ? 'like' : 'skip';
        if (lobbyId && user?.id && currentMovie) {
            // En supabase-js v2 las queries devuelven un objeto, no una Promise encadenable con .catch().
            // Disparamos la escritura de forma asíncrona sin romper la UI.
            (async () => {
                const { error } = await supabase
                    .from('roulette_votes')
                    .upsert(
                        {
                            lobby_id: lobbyId,
                            user_id: user.id,
                            movie_id: currentMovie.id,
                            vote
                        },
                        { onConflict: 'lobby_id,user_id,movie_id' }
                    );
                if (error) {
                    console.error('Error saving vote', error);
                }
            })();
        }

        if (currentIndex < movies.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else if (isHost) {
            // Solo el host puede forzar el final de la ronda al agotar la baraja
            handleTimeUp();
        }
    };

    // --- SPIN PHASE ---
    const spinWheel = async () => {
        if (matches.length === 0) return;
        if (!isHost && spinSyncedRef.current) {
            // Invitados no pueden iniciar el giro, solo observar el que viene del host.
            return;
        }

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
        // Cada segmento comienza en rotation (i * sliceAngle). Queremos que el centro del segmento del ganador
        // quede alineado con el puntero superior (0deg). El centro del segmento i está en rotation + sliceAngle/2.
        const targetRotation = 360 - (winnerIndex * sliceAngle + sliceAngle / 2);
        // Añadimos varias vueltas completas para dar sensación de giro largo.
        const totalSpins = 360 * 8;

        const finalDeg = totalSpins + targetRotation;

        setSpinRotation(finalDeg);
        setWinner(selectedWinner);
        if (navigator.vibrate) navigator.vibrate(200);

        // En modo solitario no sincronizamos con Supabase para evitar que el listener
        // Realtime provoque un re-render que interrumpa la transición CSS del giro.
        const isSolo = players.length < 2;

        if (isHost && lobbyId && !isSolo) {
            try {
                const cfg: any = config || {};
                await supabase
                    .from('roulette_lobbies')
                    .update({
                        config: {
                            ...cfg,
                            spinRotation: finalDeg
                        }
                    })
                    .eq('id', lobbyId);
                spinSyncedRef.current = true;
            } catch (e) {
                console.error('Error syncing spinRotation', e);
            }
        }

        // Fallback: si onTransitionEnd no se dispara (ej. modo solitario sin Realtime),
        // avanzamos al ganador después de que la transición debería haber terminado (4s + margen).
        setTimeout(() => {
            if (phaseRef.current === 'spinning') {
                setPhase('winner');
                phaseRef.current = 'winner';
            }
        }, 4800);
    };

    const handleWheelTransitionEnd = () => {
        if (spinRotation > 0 && phaseRef.current !== 'winner') {
            setPhase('winner');
            phaseRef.current = 'winner';
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        }
    };

    // --- RENDER ---
    return (
        <div style={{ minHeight: '100vh', paddingBottom: 88, background: 'var(--background)', color: 'var(--foreground)', overflow: phase === 'winner' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>

            {showSetupModal && (
                <RouletteSetupModal
                    onClose={() => setShowSetupModal(false)}
                    onCreate={handleCreateGame}
                />
            )}

            {showInviteFriendsModal && (
                <RouletteInviteFriendsModal
                    lobbyId={lobbyId}
                    onClose={() => setShowInviteFriendsModal(false)}
                />
            )}

            {/* Header / Exit */}
            <div
                style={{
                    padding: '16px 20px 8px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative',
                    zIndex: 100
                }}
            >
                <BackButton onClick={handleBack} className="absolute top-5 left-5" />
                <h2
                    className="heading-lg"
                    style={{
                        margin: 0,
                        color: 'var(--destructive)',
                        textShadow: '0 0 10px rgba(255, 71, 87, 0.5)',
                        lineHeight: '40px',
                        fontSize: '1.6em',
                        fontWeight: 900
                    }}
                >
                    Ruleta Rusa <Target size={24} className="inline-block ml-1 -mt-0.5 text-[var(--destructive)]" aria-hidden />
                </h2>
            </div>

            {/* SETUP (Landing) - visible cuando aún no hay sala creada */}
            {phase === 'setup' && !lobbyId && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Dices size={64} className="animate-bounce mx-auto mb-5 text-[var(--secondary)]" aria-hidden />
                    <p style={{ textAlign: 'center', maxWidth: '300px', marginBottom: '30px', color: 'var(--muted-foreground)' }}>
                        Toma decisiones rápidas con tu grupo. Nada de discusiones. La suerte decide.
                    </p>
                    <button onClick={handleOpenSetup} className="btn-primary" style={{ maxWidth: 360, width: 280 }}>
                        Configurar partida
                    </button>
                </div>
            )}

            {/* LOBBY */}
            {phase === 'lobby' && lobbyId && (
                <div className="animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <h3 style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem', letterSpacing: '0.15em', marginBottom: '8px' }}>{t.roomCode}</h3>
                    <div
                        onClick={() => { navigator.clipboard.writeText(lobbyId); }}
                        title="Copiar código"
                        style={{
                            fontSize: '0.95rem', letterSpacing: '0.05em', fontWeight: '700',
                            color: 'var(--destructive)', marginBottom: '32px',
                            background: 'rgba(255,0,85,0.08)', border: '1px solid rgba(255,0,85,0.3)',
                            borderRadius: '12px', padding: '10px 20px',
                            fontFamily: 'monospace', cursor: 'pointer',
                            maxWidth: '320px', textAlign: 'center', wordBreak: 'break-all',
                            userSelect: 'all',
                        }}
                    >
                        {lobbyId}
                    </div>

                    <div style={{ display: 'flex', gap: '30px', marginBottom: '50px' }}>
                        {/* Círculo 1: Host (o tú si eres el host) */}
                        <div className="animate-pop-in" style={{ textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                                <User size={40} className="text-[var(--background)]" aria-hidden />
                            </div>
                            <div>{isHost ? 'Tú (host)' : 'Host'}</div>
                        </div>

                        {/* Círculo 2: otro jugador (si existe) o placeholder */}
                        <div className="animate-pop-in" style={{ textAlign: 'center' }}>
                            {players.filter(p => !p.isHost).length > 0 ? (
                                <>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                                        <User size={40} className="text-[var(--secondary)]" aria-hidden />
                                    </div>
                                    <div>{players.filter(p => !p.isHost)[0].name}</div>
                                </>
                            ) : (
                                <>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                                        <Clock size={32} className="text-[var(--muted-foreground)]" aria-hidden />
                                    </div>
                                    <div>Esperando jugadores…</div>
                                </>
                            )}
                        </div>

                        {/* Círculo 3: sólo el host ve el botón de invitar */}
                        {isHost && (
                            <button
                                type="button"
                                onClick={() => setShowInviteFriendsModal(true)}
                                className="animate-pop-in"
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    padding: 0,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '6px',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--destructive)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                                    <Plus size={40} className="text-white" aria-hidden />
                                </div>
                                <div style={{ fontSize: '0.9rem' }}>{t.invite}</div>
                            </button>
                        )}
                    </div>

                    <div style={{ marginBottom: '20px', color: 'var(--muted-foreground)', background: 'var(--card)', padding: '10px 20px', borderRadius: '20px' }}>
                        {gameConfig?.mediaType === 'movie' ? <><Film size={18} className="inline-block mr-1 -mt-0.5" aria-hidden /> Pelis</> : <><Tv size={18} className="inline-block mr-1 -mt-0.5" aria-hidden /> Series</>} • {gameConfig?.sourceType === 'trending' ? 'Trending' : 'Custom'}
                    </div>

                    {isHost ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                            <button
                                onClick={handleStartGame}
                                disabled={players.length < 2 || status !== 'waiting'}
                                style={{
                                    padding: '15px 50px',
                                    background: (players.length < 2 || status !== 'waiting') ? 'var(--muted)' : 'var(--destructive)',
                                    color: (players.length < 2 || status !== 'waiting') ? 'var(--muted-foreground)' : 'white',
                                    border: 'none',
                                    borderRadius: '30px',
                                    fontSize: '1.2rem',
                                    fontWeight: 'bold',
                                    cursor: (players.length < 2 || status !== 'waiting') ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {players.length < 2
                                    ? t.waitingForPlayers
                                    : (status !== 'waiting' ? t.searching : t.startGame)}
                            </button>

                            {players.length < 2 && status === 'waiting' && (
                                <button
                                    onClick={handleStartGame}
                                    style={{
                                        padding: '10px 30px',
                                        background: 'transparent',
                                        color: 'var(--muted-foreground)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '20px',
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                    }}
                                >
                                    🎮 {language === 'es' ? 'Jugar en solitario' : 'Play solo'}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div style={{ padding: '12px 24px', borderRadius: '24px', background: 'var(--card)', color: 'var(--muted-foreground)', fontSize: '0.95rem' }}>
                            Espera a que el host inicie la partida.
                        </div>
                    )}
                </div>
            )}

            {/* SWIPING - Ajustado para que los botones se vean completamente y la imagen sea clicable */}
            {phase === 'swiping' && movies.length > 0 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', position: 'relative', padding: '20px 0 28px', overflow: 'hidden' }}>
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: timeLeft < 10 ? 'red' : 'white', marginBottom: '8px', animation: timeLeft < 10 ? 'pulse 0.5s infinite' : 'none' }}>
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </div>
                    {!isHost && timeLeft === 0 && (
                        <div style={{ marginBottom: '8px', color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>
                            Esperando a que el anfitrión termine la ronda…
                        </div>
                    )}
                    <div 
                        onClick={() => setShowDetailsModal(true)}
                        style={{ 
                            position: 'relative', 
                            width: '92%', 
                            maxWidth: '380px', 
                            aspectRatio: '2/3.3', 
                            background: 'var(--card)', 
                            borderRadius: '20px', 
                            overflow: 'hidden', 
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                            cursor: 'pointer',
                            transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <img 
                            src={movies[currentIndex].image} 
                            style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'cover',
                                objectPosition: 'top'
                            }} 
                            alt={movies[currentIndex].title}
                        />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, black, transparent)', padding: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{movies[currentIndex].title}</h2>
                            <p style={{ margin: '5px 0', fontSize: '0.9rem', opacity: 0.8 }}>{movies[currentIndex].year} • ⭐ {movies[currentIndex].rating.toFixed(1)}</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '40px', marginTop: '24px', marginBottom: '8px' }}>
                        <button
                            onClick={() => timeLeft > 0 && handleSwipe('left')}
                            disabled={timeLeft === 0}
                            style={{
                                width: '70px',
                                height: '70px',
                                borderRadius: '50%',
                                background: 'var(--card)',
                                color: timeLeft === 0 ? '#666' : 'var(--destructive)',
                                border: '2px solid var(--destructive)',
                                cursor: timeLeft === 0 ? 'not-allowed' : 'pointer',
                                opacity: timeLeft === 0 ? 0.5 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <X size={32} aria-hidden />
                        </button>
                        <button
                            onClick={() => timeLeft > 0 && handleSwipe('right')}
                            disabled={timeLeft === 0}
                            style={{
                                width: '70px',
                                height: '70px',
                                borderRadius: '50%',
                                background: 'var(--secondary)',
                                color: 'var(--background)',
                                border: 'none',
                                cursor: timeLeft === 0 ? 'not-allowed' : 'pointer',
                                opacity: timeLeft === 0 ? 0.5 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: 'var(--shadow-neon-cyan)'
                            }}
                        >
                            <Heart size={32} fill="currentColor" aria-hidden />
                        </button>
                    </div>
                </div>
            )}

            {/* SPINNING - UPDATED WHEEL */}
            {phase === 'spinning' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <h2 style={{ marginBottom: '20px' }}>¡Gira la Ruleta! <Dices size={28} className="inline-block ml-1 -mt-0.5 text-[var(--secondary)]" aria-hidden /></h2>

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
                            background: 'var(--card)',
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
                                    const color = i % 2 === 0 ? 'var(--destructive)' : '#2f3542';
                                    return `${color} ${start}% ${end}%`;
                                }).join(', ')}
                                 )`
                            }} />
                        </div>
                    </div>

                    <button
                        onClick={spinWheel}
                        disabled={spinRotation > 0 || !isHost}
                        style={{
                            padding: '15px 40px',
                            background: isHost ? '#ff9f43' : '#444',
                            color: isHost ? 'black' : '#888',
                            fontWeight: 'bold',
                            borderRadius: '30px',
                            border: 'none',
                            cursor: spinRotation > 0 || !isHost ? 'not-allowed' : 'pointer',
                            fontSize: '1.2rem',
                            opacity: spinRotation > 0 || !isHost ? 0.5 : 1
                        }}
                    >
                        {spinRotation > 0 ? 'GIRANDO...' : (isHost ? 'GIRAR' : 'Esperando giro del anfitrión…')}
                    </button>
                </div>
            )}

            {/* Timeout Modal - Aparece si no se seleccionó ninguna película en el minuto */}
            {showTimeoutModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.95)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }} className="animate-pop-in">
                    <div style={{
                        background: 'var(--background)',
                        border: '2px solid var(--destructive)',
                        borderRadius: '24px',
                        padding: '40px',
                        maxWidth: '400px',
                        width: '100%',
                        textAlign: 'center',
                        boxShadow: '0 0 30px rgba(255, 71, 87, 0.3)'
                    }}>
                        <h2 style={{ color: 'var(--destructive)', fontSize: '2rem', marginBottom: '20px' }}>
                            ⏰ Tiempo Agotado
                        </h2>
                        <p style={{ color: '#ddd', fontSize: '1.1rem', marginBottom: '30px' }}>
                            No seleccionaste ninguna película. ¿Qué quieres hacer?
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <button
                                onClick={handleRestart}
                                style={{
                                    padding: '15px 30px',
                                    background: 'var(--secondary)',
                                    color: 'black',
                                    border: 'none',
                                    borderRadius: '20px',
                                    fontSize: '1.1rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <RotateCcw size={20} className="inline-block mr-1.5 -mt-0.5" aria-hidden /> Volver a Empezar
                            </button>
                            <button
                                onClick={handleSurpriseMe}
                                style={{
                                    padding: '15px 30px',
                                    background: 'var(--destructive)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '20px',
                                    fontSize: '1.1rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <Dices size={20} className="inline-block mr-1.5 -mt-0.5" aria-hidden />{t.surpriseMe}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* WINNER - Ajustado para que todo se vea sin scroll */}
            {phase === 'winner' && winner && (
                <div className="animate-pop-in" style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    background: 'radial-gradient(circle, #2d3436 0%, #000000 100%)',
                    overflow: 'hidden',
                    padding: '20px',
                    minHeight: 0
                }}>
                    <h1 style={{ color: 'var(--secondary)', fontSize: '2rem', marginBottom: '8px', textTransform: 'uppercase' }}>{t.weHaveAWinner || '¡Tenemos Ganador!'}</h1>
                    <div style={{ fontSize: '1.2rem', marginBottom: '20px' }} className="flex items-center justify-center gap-2"><Trophy size={24} className="text-[var(--secondary)]" aria-hidden /> La Ruleta ha hablado</div>
                    <div 
                        onClick={() => setShowDetailsModal(true)}
                        style={{ 
                            width: '200px', 
                            borderRadius: '15px', 
                            overflow: 'hidden', 
                            border: '4px solid var(--secondary)', 
                            boxShadow: '0 0 50px rgba(75, 255, 179, 0.3)', 
                            marginBottom: '20px',
                            cursor: 'pointer',
                            transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <img src={winner.image} style={{ width: '100%', display: 'block' }} alt={winner.title} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', textAlign: 'center', marginBottom: '20px', maxWidth: '80%' }}>{winner.title}</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={() => {
                                const link = winnerWatchInfo?.link
                                    || `https://www.google.com/search?q=ver+${encodeURIComponent(winner.title)}+online`;
                                window.open(link, '_blank', 'noopener,noreferrer');
                            }}
                            style={{
                                padding: '15px 40px', background: 'var(--secondary)', color: 'black',
                                fontSize: '1.1rem', fontWeight: '900', borderRadius: '40px', border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase'
                            }}
                        >
                            <Play size={18} aria-hidden /> Ver Ahora
                        </button>
                        {winnerWatchInfo?.providerName && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', letterSpacing: '0.03em' }}>
                                en {winnerWatchInfo.providerName}
                            </span>
                        )}
                        {winnerWatchInfo === null && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{t.searchingPlatform}</span>
                        )}
                    </div>
                </div>
            )}

            {/* Movie Details Modal - Para fase de swiping y winner */}
            {showDetailsModal && (
                (phase === 'swiping' && movies.length > 0 && movies[currentIndex]) || (phase === 'winner' && winner) ? (
                    <MovieDetailsModal
                        movie={phase === 'swiping' && movies.length > 0 ? movies[currentIndex] : winner!}
                        onClose={() => setShowDetailsModal(false)}
                    />
                ) : null
            )}
        </div>
    );
}

