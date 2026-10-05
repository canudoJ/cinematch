'use client';

import React from 'react';
import { Heart, Star, X, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { formatCountdown } from '@/lib/roulette';
import { formatYear } from '@/lib/movies';
import { Poster } from '@/components/ui/Poster';
import { Button } from '@/components/ui/Button';
import type { Movie } from '@/types';

interface RouletteSwipeStageProps {
    movie: Movie | null;
    secondsLeft: number;
    /** Ya he votado todas las películas de la ronda */
    finished: boolean;
    isHost: boolean;
    onVote: (vote: 'like' | 'skip') => void;
    onOpenDetails: () => void;
    onEndRound: () => void;
}

const URGENT_SECONDS = 10;

export function RouletteSwipeStage({ movie, secondsLeft, finished, isHost, onVote, onOpenDetails, onEndRound }: RouletteSwipeStageProps) {
    const { t } = useLanguage();
    const timeUp = secondsLeft === 0;
    const urgent = secondsLeft > 0 && secondsLeft <= URGENT_SECONDS;

    return (
        <div className="flex flex-1 flex-col items-center justify-between gap-4 overflow-hidden px-4 pb-7 pt-4">
            <div
                role="timer"
                aria-label={t.timeLeftLabel}
                aria-live={urgent ? 'assertive' : 'off'}
                className={`text-4xl font-black tabular-nums ${urgent ? 'animate-pulse text-[var(--destructive)]' : 'text-[var(--foreground)]'}`}
            >
                {formatCountdown(secondsLeft)}
            </div>

            {finished || timeUp || !movie ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                    <CheckCircle2 size={56} className="text-[var(--secondary)]" aria-hidden />
                    <p className="max-w-xs text-[var(--muted-foreground)]">
                        {isHost || !timeUp ? t.doneWaitingOthers : t.waitingHostRound}
                    </p>
                    {isHost && <Button variant="outline" onClick={onEndRound}>{t.endRoundNow}</Button>}
                </div>
            ) : (
                <>
                    <button
                        type="button"
                        onClick={onOpenDetails}
                        aria-label={`${t.details}: ${movie.title}`}
                        className="relative aspect-[2/3.3] w-[92%] max-w-[380px] overflow-hidden rounded-[20px] bg-[var(--card)] text-left shadow-[var(--shadow-lg)] transition-transform hover:scale-[1.02]"
                    >
                        <Poster src={movie.image} alt="" sizes="380px" className="object-top" priority />
                        <div className="absolute inset-x-0 bottom-0 bg-[image:var(--poster-fade)] p-5 text-[var(--on-media)]">
                            <h2 className="font-display text-2xl font-extrabold leading-tight">{movie.title}</h2>
                            <p className="mt-1 flex items-center gap-1.5 text-sm opacity-80">
                                {formatYear(movie.year)} · <Star size={14} fill="currentColor" aria-hidden /> {movie.rating.toFixed(1)}
                            </p>
                        </div>
                    </button>

                    <div className="flex gap-10">
                        <button
                            type="button"
                            onClick={() => onVote('skip')}
                            aria-label={t.notInterested}
                            className="flex h-[70px] w-[70px] items-center justify-center rounded-full border-2 border-[var(--destructive)] bg-[var(--card)] text-[var(--destructive)] transition-transform hover:scale-105"
                        >
                            <X size={32} aria-hidden />
                        </button>
                        <button
                            type="button"
                            onClick={() => onVote('like')}
                            aria-label={t.iLikeIt}
                            className="flex h-[70px] w-[70px] items-center justify-center rounded-full bg-[var(--secondary)] text-[var(--secondary-foreground)] shadow-[var(--shadow-neon-cyan)] transition-transform hover:scale-105"
                        >
                            <Heart size={32} fill="currentColor" aria-hidden />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
