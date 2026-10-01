import React, { useState, useEffect, useRef } from 'react';
import { Movie } from '@/lib/data';
import { useLanguage } from '@/context/LanguageContext';
import { PartyPopper, Trash2, Zap, X, Swords, DoorOpen, Star, Play, Info } from 'lucide-react';
import { getWatchLink } from '@/services/tmdb';
import { useUser } from '@/context/UserContext';
import MovieDetailsModal from './MovieDetailsModal';

interface ShortlistViewProps {
    movies: Movie[];
    onClose: () => void;
    onRestart: () => void;
}

export default function ShortlistView({ movies, onClose, onRestart }: ShortlistViewProps) {
    const { t } = useLanguage();
    const { platforms } = useUser();
    const [winner, setWinner] = useState<Movie | null>(null);
    const [winnerWatchInfo, setWinnerWatchInfo] = useState<{ link: string | null; providerName: string | null } | null>(null);
    const [showNudge, setShowNudge] = useState(false);
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

    // --- SUDDEN DEATH STATE ---
    const [isSuddenDeath, setIsSuddenDeath] = useState(false);
    const [candidates, setCandidates] = useState<Movie[]>([]);
    const [nextRound, setNextRound] = useState<Movie[]>([]);
    // currentPairIndex tracks the start of the pair (0, 2, 4...)
    const [pairIndex, setPairIndex] = useState(0);

    // Pre-cargar link de plataforma al tener ganador
    useEffect(() => {
        if (!winner) { setWinnerWatchInfo(null); return; }
        const region = typeof navigator !== 'undefined' ? (navigator.language.split('-')[1]?.toUpperCase() || 'ES') : 'ES';
        getWatchLink(winner.id, winner.type, platforms, region, winner.title).then(result => {
            const bestLink = (result.providers.length > 0 ? result.providers[0].link : null) || result.link;
            const bestName = (result.providers.length > 0 ? result.providers[0].name : null) || result.providerName;
            setWinnerWatchInfo({ link: bestLink, providerName: bestName });
        }).catch(() => setWinnerWatchInfo({ link: null, providerName: null }));
    }, [winner?.id, platforms]);

    // Inactivity Timer (Only in list mode)
    useEffect(() => {
        if (winner || isSuddenDeath || movies.length < 2) return;

        const timer = setTimeout(() => {
            setShowNudge(true);
        }, 8000); // 8s Nudge

        return () => clearTimeout(timer);
    }, [winner, movies.length, isSuddenDeath]);

    // Handle initial start of tournament
    const startSuddenDeath = () => {
        if (movies.length < 2) return;
        // Shuffle candidates for randomness?
        const shuffled = [...movies].sort(() => Math.random() - 0.5);
        setCandidates(shuffled);
        setNextRound([]);
        setPairIndex(0);
        setIsSuddenDeath(true);
        setShowNudge(false);
    };

    const handleTournamentChoice = (chosen: Movie) => {
        const newNextRound = [...nextRound, chosen];
        setNextRound(newNextRound);

        // Move to next pair
        const nextPairIndex = pairIndex + 2;

        if (nextPairIndex < candidates.length) {
            // Still have pairs in this round
            if (nextPairIndex === candidates.length - 1) {
                // Odd one out! Auto-advance the last one to next round?
                // Or maybe just add it now and finish round?
                // Let's add the straggler to next round immediately.
                const lastOne = candidates[nextPairIndex];
                const roundComplete = [...newNextRound, lastOne];
                advanceRound(roundComplete);
            } else {
                setPairIndex(nextPairIndex);
            }
        } else {
            // Round complete
            advanceRound(newNextRound);
        }
    };

    const advanceRound = (survivors: Movie[]) => {
        if (survivors.length === 1) {
            setWinner(survivors[0]);
            setIsSuddenDeath(false);
        } else {
            // Shuffle again for variety? Or keep bracket?
            // Let's shuffle to keep it spicy.
            setCandidates(survivors.sort(() => Math.random() - 0.5));
            setNextRound([]);
            setPairIndex(0);
        }
    };


    // click on a shortlist card → open details modal (no delete button)


    // --- VIEWS ---

    // 1. WINNER VIEW
    if (winner) {
        return (
            <>
            <div className="animate-pop-in" style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', padding: '20px 20px 30px',
                background: 'linear-gradient(135deg, var(--background) 0%, var(--card) 100%)',
                overflowY: 'auto', gap: '12px'
            }}>
                <PartyPopper size={56} className="text-[var(--secondary)]" aria-hidden />
                <h2 style={{ color: 'var(--secondary)', margin: 0 }}>{t.weHaveAWinner}</h2>
                <div
                    onClick={() => setSelectedMovie(winner)}
                    style={{
                        borderRadius: '20px', overflow: 'hidden',
                        boxShadow: '0 0 50px rgba(0, 229, 255, 0.4)',
                        cursor: 'pointer', border: '4px solid var(--secondary)',
                        flexShrink: 0
                    }}
                >
                    <img src={winner.image} style={{ maxWidth: '180px', display: 'block' }} alt={winner.title} />
                </div>
                <h3 style={{ margin: '4px 0 0', maxWidth: '280px' }}>{winner.title}</h3>

                {/* VER AHORA button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <button
                        onClick={() => {
                            const link = winnerWatchInfo?.link
                                || `https://www.google.com/search?q=ver+${encodeURIComponent(winner.title)}+online`;
                            window.open(link, '_blank', 'noopener,noreferrer');
                        }}
                        style={{
                            padding: '12px 32px', background: 'var(--secondary)', color: 'black',
                            fontSize: '1rem', fontWeight: '900', borderRadius: '40px', border: 'none',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                            textTransform: 'uppercase'
                        }}
                    >
                        <Play size={16} aria-hidden /> {t.watchNow || 'Ver Ahora'}
                    </button>
                    {winnerWatchInfo?.providerName && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>
                            en {winnerWatchInfo.providerName}
                        </span>
                    )}
                </div>

                <button
                    onClick={() => { setWinner(null); setIsSuddenDeath(false); }}
                    style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted-foreground)', padding: '8px 18px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                    {t.backToShortlist}
                </button>
            </div>

            {selectedMovie && (
                <MovieDetailsModal
                    movie={selectedMovie}
                    onClose={() => setSelectedMovie(null)}
                    skipSave={true}
                />
            )}
            </>
        );
    }

    // 2. SUDDEN DEATH BATTLE VIEW
    if (isSuddenDeath && candidates.length >= 2) {
        const left = candidates[pairIndex];
        const right = candidates[pairIndex + 1];

        if (!left || !right) return <div>Error in bracket</div>;

        const FighterCard = ({ movie, onChoose }: { movie: Movie; onChoose: () => void }) => (
            <div style={{ flex: 1, position: 'relative' }}>
                <div
                    onClick={onChoose}
                    className="hover:scale-105"
                    style={{ borderRadius: '15px', overflow: 'hidden', border: '2px solid var(--border)', aspectRatio: '2/3', position: 'relative', cursor: 'pointer', transition: 'transform 0.2s' }}
                >
                    <img src={movie.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={movie.title} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, black 30%, transparent)', opacity: 0.85 }} />
                    <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem', padding: '0 6px' }}>{movie.title}</div>
                </div>
                {/* Info button — opens details without choosing */}
                <button
                    onClick={(e) => { e.stopPropagation(); setSelectedMovie(movie); }}
                    style={{
                        position: 'absolute', top: 6, right: 6,
                        width: '26px', height: '26px', borderRadius: '50%',
                        background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.3)',
                        color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10
                    }}
                    title={t.details || 'Ver detalles'}
                >
                    <Info size={13} aria-hidden />
                </button>
            </div>
        );

        return (
            <>
            <div className="animate-fade-in" style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '20px', overflow: 'hidden', position: 'relative'
            }}>
                <h2 style={{ color: 'var(--destructive)', fontStyle: 'italic', marginBottom: '24px', animation: 'pulse 1s infinite' }}>
                    {t.suddenDeath || 'Muerte Súbita'} <Zap size={20} className="inline-block ml-1 -mt-0.5 text-[var(--destructive)]" aria-hidden />
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginBottom: '20px', marginTop: '-18px' }}>
                    {t.tapToChoose || 'Toca para elegir · ⓘ para ver detalles'}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', width: '100%', maxWidth: '500px' }}>
                    <FighterCard movie={left} onChoose={() => handleTournamentChoice(left)} />
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', fontStyle: 'italic', flexShrink: 0 }}>VS</div>
                    <FighterCard movie={right} onChoose={() => handleTournamentChoice(right)} />
                </div>

                <div style={{ marginTop: '24px', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                    {Math.floor(candidates.length / 2)} {t.matchesLeft || 'combates restantes'}
                </div>

                <button
                    onClick={() => setIsSuddenDeath(false)}
                    style={{ position: 'absolute', top: 20, right: 20, color: 'var(--muted-foreground)', border: 'none', background: 'none', cursor: 'pointer' }}
                ><X size={20} aria-hidden /></button>
            </div>

            {selectedMovie && (
                <MovieDetailsModal
                    movie={selectedMovie}
                    onClose={() => setSelectedMovie(null)}
                    skipSave={true}
                />
            )}
            </>
        );
    }

    // 3. EMPTY LIST
    if (movies.length === 0) {
        return (
            <div style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center',
                color: 'var(--muted-foreground)'
            }}>
                <Trash2 size={48} className="mx-auto mb-2.5 text-[var(--muted-foreground)]" aria-hidden />
                <p>{t.noLikesYet || "Aún no te ha gustado nada"}</p>
                <button
                    onClick={onClose}
                    style={{ marginTop: '20px', padding: '10px 30px', background: 'var(--card)', border: 'none', borderRadius: '20px', color: 'var(--foreground)' }}
                >
                    {t.back || "Volver"}
                </button>
            </div>
        );
    }

    // 4. SHORTLIST GRID (Default)
    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', position: 'relative', height: '100%' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--secondary)' }}>{t.yourShortlist} ({movies.length})</h2>

            <div style={{
                flex: 1,
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: '15px',
                paddingBottom: '80px' // Space for floating buttons
            }}>
                {movies.map(movie => (
                    <div
                        key={movie.id}
                        onClick={() => setSelectedMovie(movie)}
                        className="animate-fade-in"
                        style={{ cursor: 'pointer' }}
                    >
                        <div style={{
                            width: '100%',
                            aspectRatio: '2/3',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            marginBottom: '8px',
                            border: '1px solid var(--border)'
                        }}>
                            <img src={movie.image} alt={movie.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {movie.title}
                        </h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{movie.year}</span>
                            {movie.rating && <span style={{ fontSize: '0.75rem', color: 'var(--secondary)' }} className="inline-flex items-center gap-0.5"><Star size={12} fill="currentColor" aria-hidden /> {movie.rating.toFixed(1)}</span>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Inactivity Nudge / Can't Decide Button */}
            {(showNudge || movies.length > 1) && (
                <div
                    className={showNudge ? "animate-slide-up" : ""}
                    onClick={startSuddenDeath}
                    style={{
                        position: 'absolute',
                        bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                        background: 'var(--card)', border: '2px solid var(--secondary)',
                        padding: '12px 20px', borderRadius: '30px',
                        display: 'flex', alignItems: 'center', gap: '10px',
                        cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        width: '90%', maxWidth: '300px', zIndex: 50,
                        transition: 'all 0.3s'
                    }}
                >
                    <Swords size={24} className="text-[var(--secondary)]" aria-hidden />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: 'bold' }}>{t.cantDecide || "¿No te decides?"}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>{t.suddenDeath || "Muerte Súbita"} <Zap size={14} className="inline-block ml-0.5 -mt-0.5 text-[var(--secondary)]" aria-hidden /></div>
                    </div>
                </div>
            )}

            {/* Botón de reinicio (esquina inferior derecha) */}
            <div style={{ position: 'absolute', bottom: '20px', right: '20px' }}>
                <button
                    onClick={onRestart}
                    style={{
                        padding: '10px', borderRadius: '50%', background: '#222', border: '1px solid #444', color: 'var(--muted-foreground)', width: '40px', height: '40px', cursor: 'pointer'
                    }}
                    title={t.restart || "Reiniciar"}
                >
                    ↻
                </button>
            </div>

            {/* Botón para salir del deck (esquina inferior izquierda) */}
            <div style={{ position: 'absolute', bottom: '20px', left: '20px' }}>
                <button
                    onClick={onClose}
                    style={{
                        padding: '10px 16px',
                        borderRadius: '25px',
                        background: 'var(--destructive)',
                        color: 'white',
                        border: 'none',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(255,0,85,0.4)',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(255,0,85,0.5)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,0,85,0.4)';
                    }}
                    title={t.back || "Volver al modo principal de descubrimiento"}
                >
                    <DoorOpen size={18} aria-hidden />
                    <span>{t.exitDeck}</span>
                </button>
            </div>

            {/* Details modal — no delete button since this is deck mode */}
            {selectedMovie && (
                <MovieDetailsModal
                    movie={selectedMovie}
                    onClose={() => setSelectedMovie(null)}
                    skipSave={true}
                />
            )}
        </div>
    );
}
