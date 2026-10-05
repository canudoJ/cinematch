'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dices, RotateCcw, Frown } from 'lucide-react';
import { useLobby } from '@/context/LobbyContext';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageContext';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useCountdown } from '@/hooks/useCountdown';
import { useRouletteGame } from '@/hooks/useRouletteGame';
import { GameHeader } from '@/components/layout/GameHeader';
import { Button } from '@/components/ui/Button';
import MovieDetailsModal from '@/components/MovieDetailsModal';
import { WinnerReveal } from '@/components/WinnerReveal';
import RouletteSetupModal from '@/components/roulette/RouletteSetupModal';
import InviteFriendsModal from '@/components/roulette/InviteFriendsModal';
import { RouletteLanding } from '@/components/roulette/RouletteLanding';
import { RouletteWaitingRoom } from '@/components/roulette/RouletteWaitingRoom';
import { RouletteSwipeStage } from '@/components/roulette/RouletteSwipeStage';
import { RouletteWheel } from '@/components/roulette/RouletteWheel';
import type { Movie, RouletteConfig } from '@/types';

type Phase = 'landing' | 'waiting' | 'swiping' | 'noMatch' | 'spinning' | 'winner';

/** Cada cuánto comprueba el anfitrión si todos han terminado de votar */
const ALL_VOTED_POLL_MS = 2500;

export default function RouletteLobbyPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { user } = useAuth();
    const confirm = useConfirm();
    const {
        lobbyId, lobbyCode, isHost, players, config, status,
        createLobby, joinLobbyByCode, leaveLobby, castVote, countVotes,
    } = useLobby();
    const { startRound, endRound, spin, surpriseMe, starting } = useRouletteGame();

    const [showSetup, setShowSetup] = useState(false);
    const [creating, setCreating] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
    /** Progreso de voto de la ronda actual (la ronda se identifica por su hora de fin) */
    const [progress, setProgress] = useState<{ round: number | null; index: number }>({ round: null, index: 0 });
    /** Giro cuya animación ya ha terminado en este dispositivo */
    const [revealedRotation, setRevealedRotation] = useState<number | null>(null);

    const roundEndsAt = config?.roundEndsAt ?? null;
    const roundMovies = config?.roundMovies ?? [];
    const secondsLeft = useCountdown(status === 'swiping' ? roundEndsAt : null);
    const voteIndex = progress.round === roundEndsAt ? progress.index : 0;
    const finishedVoting = roundMovies.length > 0 && voteIndex >= roundMovies.length;

    const winner = config?.winnerId
        ? [...(config.winningMatches ?? []), ...roundMovies].find(m => m.id === config.winnerId) ?? null
        : null;

    const phase: Phase = !lobbyId ? 'landing'
        : status === 'swiping' ? (config?.noMatch ? 'noMatch' : 'swiping')
        : status === 'spinning' ? (winner && revealedRotation !== null && revealedRotation === config?.spinRotation ? 'winner' : 'spinning')
        : status === 'finished' && winner ? 'winner'
        : 'waiting';

    // Anfitrión: cerrar la ronda al acabar el tiempo…
    useEffect(() => {
        if (isHost && phase === 'swiping' && roundEndsAt && secondsLeft === 0) void endRound();
    }, [isHost, phase, roundEndsAt, secondsLeft, endRound]);

    // …o antes, en cuanto todos han votado todas las películas
    useEffect(() => {
        if (!isHost || phase !== 'swiping' || !finishedVoting) return;
        const id = window.setInterval(async () => {
            if (await countVotes() >= players.length * roundMovies.length) void endRound();
        }, ALL_VOTED_POLL_MS);
        return () => window.clearInterval(id);
    }, [isHost, phase, finishedVoting, countVotes, players.length, roundMovies.length, endRound]);

    const handleSpinEnd = useCallback((rotation: number) => setRevealedRotation(rotation), []);

    const handleVote = (vote: 'like' | 'skip') => {
        const movie = roundMovies[voteIndex];
        if (!movie) return;
        void castVote(movie.id, vote);
        setProgress({ round: roundEndsAt, index: voteIndex + 1 });
    };

    const handleCreate = async (rouletteConfig: RouletteConfig) => {
        setCreating(true);
        const ok = await createLobby(rouletteConfig);
        setCreating(false);
        if (ok) setShowSetup(false);
    };

    const handleBack = async () => {
        const inGame = phase === 'swiping' || phase === 'spinning' || phase === 'noMatch';
        if (lobbyId && inGame && !(await confirm({ title: t.confirmExitGame, destructive: true, confirmLabel: t.exitLobby }))) return;
        if (lobbyId) await leaveLobby();
        router.push('/');
    };

    return (
        <div className="flex min-h-full flex-1 flex-col overflow-y-auto bg-[var(--background)] text-[var(--foreground)]">
            <GameHeader mode="roulette" title={t.rouletteModeTitle} onBack={() => void handleBack()} />

            {phase === 'landing' && (
                <RouletteLanding onSetup={() => setShowSetup(true)} onJoin={joinLobbyByCode} />
            )}

            {phase === 'waiting' && lobbyCode && (
                <RouletteWaitingRoom
                    code={lobbyCode}
                    players={players}
                    currentUserId={user?.id ?? null}
                    isHost={isHost}
                    config={config?.rouletteConfig ?? null}
                    starting={starting}
                    onInvite={() => setShowInvite(true)}
                    onStart={() => void startRound()}
                />
            )}

            {phase === 'swiping' && (
                <RouletteSwipeStage
                    key={roundEndsAt ?? 0}
                    movie={roundMovies[voteIndex] ?? null}
                    secondsLeft={secondsLeft}
                    finished={finishedVoting}
                    isHost={isHost}
                    onVote={handleVote}
                    onOpenDetails={() => setDetailsMovie(roundMovies[voteIndex] ?? null)}
                    onEndRound={() => void endRound()}
                />
            )}

            {phase === 'noMatch' && (
                <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center animate-pop-in">
                    <Frown size={56} className="text-[var(--destructive)]" aria-hidden />
                    <h2 className="title-section text-[var(--destructive)]">{t.noMatchTitle}</h2>
                    <p className="max-w-xs text-[var(--muted-foreground)]">{isHost ? t.noMatchHost : t.noMatchGuest}</p>
                    {isHost && (
                        <div className="flex w-full max-w-xs flex-col gap-3">
                            <Button size="lg" variant="outline" isLoading={starting} onClick={() => void startRound()}>
                                <RotateCcw size={18} aria-hidden /> {t.playAgain}
                            </Button>
                            <Button size="lg" onClick={() => void surpriseMe()}>
                                <Dices size={18} aria-hidden /> {t.surpriseMe}
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {phase === 'spinning' && (
                <RouletteWheel
                    matches={config?.winningMatches ?? []}
                    matchCount={config?.matchCount ?? null}
                    rotation={config?.spinRotation ?? null}
                    isHost={isHost}
                    onSpin={() => void spin()}
                    onSpinEnd={handleSpinEnd}
                />
            )}

            {phase === 'winner' && winner && (
                <WinnerReveal movie={winner} subtitle={t.theWheelHasSpoken} onOpenDetails={() => setDetailsMovie(winner)}>
                    {isHost && (
                        <Button variant="outline" isLoading={starting} onClick={() => void startRound()}>
                            <RotateCcw size={18} aria-hidden /> {t.newRound}
                        </Button>
                    )}
                </WinnerReveal>
            )}

            {showSetup && <RouletteSetupModal onClose={() => setShowSetup(false)} onCreate={handleCreate} creating={creating} />}
            {showInvite && <InviteFriendsModal onClose={() => setShowInvite(false)} />}
            {detailsMovie && <MovieDetailsModal movie={detailsMovie} onClose={() => setDetailsMovie(null)} />}
        </div>
    );
}
