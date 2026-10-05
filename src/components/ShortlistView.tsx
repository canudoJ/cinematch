'use client';

import React, { useState } from 'react';
import { Zap, X, Swords, DoorOpen, Star, Info, RotateCcw, HeartOff, Heart } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { choose, currentPair, duelProgress, stageOf, startTournament, type TournamentStage, type TournamentState } from '@/lib/tournament';
import { formatYear } from '@/lib/movies';
import { Poster } from '@/components/ui/Poster';
import { Button } from '@/components/ui/Button';
import { iconButtonClass } from '@/components/ui/iconButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { WinnerReveal } from './WinnerReveal';
import MovieDetailsModal from './MovieDetailsModal';
import type { Movie } from '@/types';

interface ShortlistViewProps {
    /** Películas elegidas al jugar una baraja */
    movies: Movie[];
    /** "Salir de la sala" en modos de juego, "Salir de la baraja" en barajas */
    exitLabel: string;
    onClose: () => void;
    onRestart: () => void;
}

interface FighterCardProps {
    movie: Movie;
    onChoose: () => void;
    onInfo: () => void;
    infoLabel: string;
}

/** Candidato de un duelo: tocar el póster lo elige; el botón ⓘ abre los detalles */
function FighterCard({ movie, onChoose, onInfo, infoLabel }: FighterCardProps) {
    return (
        <div className="relative flex-1">
            <button
                type="button"
                onClick={onChoose}
                aria-label={movie.title}
                className="relative block aspect-[2/3] w-full overflow-hidden rounded-[15px] border-2 border-[var(--border)] transition-transform hover:scale-105"
            >
                <Poster src={movie.image} alt="" sizes="200px" />
                <span className="absolute inset-0 bg-[image:var(--poster-fade)]" aria-hidden />
                <span className="absolute inset-x-0 bottom-2 px-1.5 text-center text-xs font-bold text-[var(--on-media)]">{movie.title}</span>
            </button>
            <button
                type="button"
                onClick={onInfo}
                aria-label={`${infoLabel}: ${movie.title}`}
                className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/30 bg-black/70 text-[var(--on-media)]"
            >
                <Info size={14} aria-hidden />
            </button>
        </div>
    );
}

/** Rondas del torneo como segmentos: jugadas, la actual y las que faltan hasta la final */
function RoundTrack({ round, total, label }: { round: number; total: number; label: string }) {
    return (
        <div className="flex w-full max-w-[260px] gap-1.5" role="img" aria-label={label}>
            {Array.from({ length: total }, (_, i) => {
                const n = i + 1;
                const tone = n < round ? 'bg-[var(--secondary)]' : n === round ? 'bg-[var(--destructive)] shadow-[0_0_10px_var(--destructive)]' : 'bg-[var(--border-strong)]';
                return <span key={n} className={`h-1.5 flex-1 rounded-full transition-colors ${tone}`} />;
            })}
        </div>
    );
}

export default function ShortlistView({ movies, exitLabel, onClose, onRestart }: ShortlistViewProps) {
    const { t } = useLanguage();
    const [tournament, setTournament] = useState<TournamentState<Movie> | null>(null);
    const [winner, setWinner] = useState<Movie | null>(null);
    const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);

    const pair = tournament ? currentPair(tournament) : null;

    const stageLabels: Record<Exclude<TournamentStage, null>, string> = {
        final: t.stageFinal,
        semifinal: t.stageSemifinal,
        quarterfinal: t.stageQuarterfinal,
    };

    const handleChoose = (chosen: Movie) => {
        if (!tournament) return;
        const next = choose(tournament, chosen);
        if ('winner' in next) {
            setWinner(next.winner);
            setTournament(null);
        } else {
            setTournament(next);
        }
    };

    let content: React.ReactNode;

    if (winner) {
        content = (
            <WinnerReveal movie={winner} onOpenDetails={() => setDetailsMovie(winner)}>
                <Button variant="outline" size="sm" onClick={() => setWinner(null)}>{t.backToShortlist}</Button>
            </WinnerReveal>
        );
    } else if (tournament && pair) {
        const stage = stageOf(tournament);
        const roundLabel = t.tournamentRound(tournament.round, tournament.totalRounds);
        const duel = duelProgress(tournament);
        content = (
            <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden p-5 animate-fade-in">
                <div className="mb-2 flex w-full max-w-[500px] justify-end">
                    <button
                        type="button"
                        onClick={() => setTournament(null)}
                        aria-label={t.exitTournament}
                        title={t.exitTournament}
                        className={`${iconButtonClass} h-12 w-12 hover:border-[var(--destructive)] hover:text-[var(--destructive)]`}
                    >
                        <X size={24} aria-hidden />
                    </button>
                </div>
                <h2 className="title-page mb-3 flex items-center gap-1.5 italic text-[var(--destructive)]">
                    {t.suddenDeath} <Zap size={22} aria-hidden />
                </h2>
                <div className="mb-4 flex w-full flex-col items-center gap-2">
                    <p className="flex items-center gap-2 text-sm font-bold">
                        <span>{roundLabel}</span>
                        {stage && (
                            <span className="rounded-full border border-[var(--destructive)] bg-[var(--destructive-soft)] px-2.5 py-0.5 text-xs uppercase tracking-wider text-[var(--destructive)]">
                                {stageLabels[stage]}
                            </span>
                        )}
                    </p>
                    <RoundTrack round={tournament.round} total={tournament.totalRounds} label={roundLabel} />
                </div>
                <p className="text-caption mb-5">{t.tapToChoose}</p>

                <div className="flex w-full max-w-[500px] items-center justify-center gap-5">
                    <FighterCard movie={pair[0]} onChoose={() => handleChoose(pair[0])} onInfo={() => setDetailsMovie(pair[0])} infoLabel={t.details} />
                    <span className="shrink-0 text-3xl font-black italic">{t.versus}</span>
                    <FighterCard movie={pair[1]} onChoose={() => handleChoose(pair[1])} onInfo={() => setDetailsMovie(pair[1])} infoLabel={t.details} />
                </div>

                <p className="mt-6 text-sm font-semibold text-[var(--muted-foreground)]" aria-live="polite">
                    {t.duelOf(duel.current, duel.total)}
                </p>
            </div>
        );
    } else if (movies.length === 0) {
        content = (
            <EmptyState
                icon={HeartOff}
                title={t.nothingLikedInDeck}
                className="flex-1"
                action={
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onRestart}><RotateCcw size={16} aria-hidden /> {t.replayDeck}</Button>
                        <Button variant="danger" onClick={onClose}><DoorOpen size={16} aria-hidden /> {exitLabel}</Button>
                    </div>
                }
            />
        );
    } else {
        content = (
            <div className="relative flex h-full min-h-0 flex-1 flex-col p-5">
                <header className="mb-5 text-center">
                    <h2 className="title-page flex items-center justify-center gap-3">
                        <Heart size={26} className="text-[var(--secondary)]" fill="currentColor" aria-hidden />
                        {t.yourShortlist}
                        <span className="rounded-full border-2 border-[var(--secondary)] bg-[var(--secondary-soft)] px-3 py-0.5 font-sans text-lg font-bold tabular-nums text-[var(--secondary)]">
                            {movies.length}
                        </span>
                    </h2>
                    <p className="text-caption mt-1.5">{t.shortlistHint}</p>
                </header>

                <ul className="custom-scrollbar grid min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(100px,1fr))] content-start gap-4 overflow-y-auto pb-2">
                    {movies.map(movie => (
                        <li key={movie.id}>
                            <button type="button" onClick={() => setDetailsMovie(movie)} className="w-full text-left animate-fade-in">
                                <span className="relative mb-2 block aspect-[2/3] w-full overflow-hidden rounded-xl border border-[var(--border)]">
                                    <Poster src={movie.image} alt="" sizes="120px" />
                                </span>
                                <span className="block truncate text-sm font-semibold">{movie.title}</span>
                                <span className="flex items-center justify-between text-xs">
                                    <span className="text-[var(--muted-foreground)]">{formatYear(movie.year)}</span>
                                    {movie.rating > 0 && (
                                        <span className="inline-flex items-center gap-0.5 text-[var(--secondary)]">
                                            <Star size={12} fill="currentColor" aria-hidden /> {movie.rating.toFixed(1)}
                                        </span>
                                    )}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>

                {/* Salir · muerte súbita (centrada y destacada) · reiniciar */}
                <div className="mt-3 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-[var(--surface-border)] pt-4">
                    <Button variant="danger" size="lg" onClick={onClose} aria-label={exitLabel} className="justify-self-start max-sm:w-12 max-sm:px-0">
                        <DoorOpen size={20} aria-hidden /> <span className="hidden sm:inline">{exitLabel}</span>
                    </Button>
                    {movies.length > 1 ? (
                        <button
                            type="button"
                            onClick={() => setTournament(startTournament(movies))}
                            className="flex items-center gap-3 rounded-full bg-[linear-gradient(135deg,var(--primary),var(--accent-mid))] px-5 py-3 text-left text-[var(--primary-foreground)] transition-transform hover:scale-105 active:scale-95 animate-glow sm:px-7"
                        >
                            <Swords size={26} className="shrink-0" aria-hidden />
                            <span className="min-w-0">
                                <span className="flex items-center gap-1 font-display text-lg font-extrabold leading-tight">
                                    {t.suddenDeath} <Zap size={16} fill="currentColor" aria-hidden />
                                </span>
                                <span className="block text-xs font-medium opacity-90">{t.cantDecide}</span>
                            </span>
                        </button>
                    ) : (
                        <span />
                    )}
                    <Button variant="outline" size="lg" onClick={onRestart} aria-label={t.playAgain} className="justify-self-end max-sm:w-12 max-sm:px-0">
                        <RotateCcw size={20} aria-hidden /> <span className="hidden sm:inline">{t.playAgain}</span>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <>
            {content}
            {detailsMovie && <MovieDetailsModal movie={detailsMovie} onClose={() => setDetailsMovie(null)} />}
        </>
    );
}
