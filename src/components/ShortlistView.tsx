import React, { useState, useEffect, useRef } from 'react';
import { Movie } from '@/lib/data';
import { useLanguage } from '@/context/LanguageContext';

interface ShortlistViewProps {
    movies: Movie[];
    onClose: () => void;
    onRestart: () => void;
}

export default function ShortlistView({ movies, onClose, onRestart }: ShortlistViewProps) {
    const { t } = useLanguage();
    const [winner, setWinner] = useState<Movie | null>(null);
    const [showNudge, setShowNudge] = useState(false);

    // --- SUDDEN DEATH STATE ---
    const [isSuddenDeath, setIsSuddenDeath] = useState(false);
    const [candidates, setCandidates] = useState<Movie[]>([]);
    const [nextRound, setNextRound] = useState<Movie[]>([]);
    // currentPairIndex tracks the start of the pair (0, 2, 4...)
    const [pairIndex, setPairIndex] = useState(0);

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


    const handleItemClick = (movie: Movie) => {
        // Smart Linking: Prioritize specific platform link
        let targetLink = movie.watchLink;
        let targetProvider = movie.providerName || (movie.providers && movie.providers.length > 0 ? movie.providers[0].name : null);

        // ... (Same link logic as before) ...
        if (!targetLink && movie.providers && movie.providers.length > 0) {
            targetLink = movie.providers[0].link;
            targetProvider = movie.providers[0].name;
        }

        if (!targetLink && targetProvider) {
            const query = encodeURIComponent(movie.title);
            const provider = targetProvider.toLowerCase();
            if (provider.includes('netflix')) targetLink = `https://www.netflix.com/search?q=${query}`;
            else if (provider.includes('disney')) targetLink = `https://www.disneyplus.com/search?q=${query}`;
            else if (provider.includes('amazon') || provider.includes('prime')) targetLink = `https://www.primevideo.com/search?q=${query}&i=instant-video`;
            else if (provider.includes('hbo') || provider.includes('max')) targetLink = `https://www.hbomax.com/es/es/search?q=${query}`;
            else if (provider.includes('crunchyroll')) targetLink = `https://www.crunchyroll.com/search?q=${query}`;
        }

        if (!targetLink) {
            targetLink = `https://www.google.com/search?q=watch+${encodeURIComponent(movie.title)}`;
        }

        window.open(targetLink, '_blank', 'noopener,noreferrer');
    };


    // --- VIEWS ---

    // 1. WINNER VIEW
    if (winner) {
        return (
            <div className="animate-pop-in" style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', padding: '20px',
                background: 'linear-gradient(135deg, var(--bg-darker) 0%, #2a2a2a 100%)'
            }}>
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎉</div>
                <h2 style={{ color: 'var(--accent-green)' }}>{t.weHaveAWinner}</h2>
                <div
                    onClick={() => handleItemClick(winner)}
                    style={{
                        margin: '30px 0',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        boxShadow: '0 0 50px rgba(75, 255, 179, 0.4)',
                        cursor: 'pointer',
                        transform: 'scale(1.1)',
                        border: '4px solid var(--accent-green)'
                    }}
                >
                    <img src={winner.image} style={{ maxWidth: '200px', display: 'block' }} />
                </div>
                <h3>{winner.title}</h3>
                <p style={{ color: '#888' }}>{t.tapToWatch}</p>
                <button
                    onClick={() => { setWinner(null); setIsSuddenDeath(false); }}
                    style={{ marginTop: '30px', background: 'transparent', border: '1px solid #666', color: '#888', padding: '10px 20px', borderRadius: '20px', cursor: 'pointer' }}
                >
                    {t.backToShortlist}
                </button>
            </div>
        );
    }

    // 2. SUDDEN DEATH BATTLE VIEW
    if (isSuddenDeath && candidates.length >= 2) {
        const left = candidates[pairIndex];
        const right = candidates[pairIndex + 1];

        // Safe check for odd numbers handled in logic, but UI check:
        if (!left || !right) return <div>Error in bracket</div>;

        return (
            <div className="animate-fade-in" style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '20px', overflow: 'hidden', position: 'relative'
            }}>
                <h2 style={{ color: 'var(--accent-red-alt)', fontStyle: 'italic', marginBottom: '30px', animation: 'pulse 1s infinite' }}>{t.suddenDeath || 'Muerte Súbita'} ⚡</h2>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', width: '100%', maxWidth: '500px' }}>

                    {/* LEFT FIGHTER */}
                    <div
                        onClick={() => handleTournamentChoice(left)}
                        style={{ flex: 1, cursor: 'pointer', transition: 'transform 0.2s', position: 'relative' }}
                        className="hover:scale-105"
                    >
                        <div style={{ borderRadius: '15px', overflow: 'hidden', border: '2px solid #333', aspectRatio: '2/3', position: 'relative' }}>
                            <img src={left.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, black, transparent)', opacity: 0.8 }} />
                            <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center', fontWeight: 'bold' }}>{left.title}</div>
                        </div>
                    </div>

                    <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', fontStyle: 'italic' }}>VS</div>

                    {/* RIGHT FIGHTER */}
                    <div
                        onClick={() => handleTournamentChoice(right)}
                        style={{ flex: 1, cursor: 'pointer', transition: 'transform 0.2s', position: 'relative' }}
                        className="hover:scale-105"
                    >
                        <div style={{ borderRadius: '15px', overflow: 'hidden', border: '2px solid #333', aspectRatio: '2/3', position: 'relative' }}>
                            <img src={right.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, black, transparent)', opacity: 0.8 }} />
                            <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center', fontWeight: 'bold' }}>{right.title}</div>
                        </div>
                    </div>

                </div>

                <div style={{ marginTop: '30px', color: '#666' }}>
                    Ronda: {Math.floor(candidates.length / 2)} combates restantes
                </div>

                <button
                    onClick={() => setIsSuddenDeath(false)}
                    style={{ position: 'absolute', top: 20, right: 20, color: '#666', border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
                >✕</button>
            </div>
        );
    }

    // 3. EMPTY LIST
    if (movies.length === 0) {
        return (
            <div style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center',
                color: '#666'
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🗑️</div>
                <p>{t.noLikesYet || "Aún no te ha gustado nada"}</p>
                <button
                    onClick={onClose}
                    style={{ marginTop: '20px', padding: '10px 30px', background: '#333', border: 'none', borderRadius: '20px', color: 'white' }}
                >
                    {t.back || "Volver"}
                </button>
            </div>
        );
    }

    // 4. SHORTLIST GRID (Default)
    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', position: 'relative', height: '100%' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--accent-green)' }}>{t.yourShortlist} ({movies.length})</h2>

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
                        onClick={() => handleItemClick(movie)}
                        className="animate-fade-in"
                        style={{ cursor: 'pointer' }}
                    >
                        <div style={{
                            width: '100%',
                            aspectRatio: '2/3',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            marginBottom: '8px',
                            border: '1px solid #333'
                        }}>
                            <img src={movie.image} alt={movie.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {movie.title}
                        </h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: '#888' }}>{movie.year}</span>
                            {movie.rating && <span style={{ fontSize: '0.75rem', color: '#f5c518' }}>★ {movie.rating.toFixed(1)}</span>}
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
                        background: '#333', border: '2px solid #4bffb3',
                        padding: '12px 20px', borderRadius: '30px',
                        display: 'flex', alignItems: 'center', gap: '10px',
                        cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        width: '90%', maxWidth: '300px', zIndex: 50,
                        transition: 'all 0.3s'
                    }}
                >
                    <span style={{ fontSize: '1.5rem' }}>🥊</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: 'bold' }}>{t.cantDecide || "¿No te decides?"}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-green)' }}>{t.suddenDeath || "Muerte Súbita"} ⚡</div>
                    </div>
                </div>
            )}

            <div style={{ position: 'absolute', bottom: '20px', right: '20px' }}>
                <button
                    onClick={onRestart}
                    style={{
                        padding: '10px', borderRadius: '50%', background: '#222', border: '1px solid #444', color: '#666', width: '40px', height: '40px', cursor: 'pointer'
                    }}
                    title={t.restart || "Reiniciar"}
                >
                    ↻
                </button>
            </div>
        </div>
    );
}
