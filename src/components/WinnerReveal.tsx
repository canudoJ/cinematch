'use client';

import React from 'react';
import { PartyPopper, Play } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useWatchOptions } from '@/hooks/useWatchOptions';
import { googleWatchUrl } from '@/lib/providers';
import { Poster } from '@/components/ui/Poster';
import type { Movie } from '@/types';
import { buttonVariants } from '@/components/ui/Button';

interface WinnerRevealProps {
    movie: Movie;
    subtitle?: string;
    onOpenDetails: () => void;
    /** Acciones extra bajo el botón principal (volver, nueva ronda…) */
    children?: React.ReactNode;
}

/** Pantalla de ganador compartida por la ruleta y la "muerte súbita" de las barajas */
export function WinnerReveal({ movie, subtitle, onOpenDetails, children }: WinnerRevealProps) {
    const { t } = useLanguage();
    const { options, loading } = useWatchOptions(movie);
    const best = options?.best ?? null;

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 overflow-y-auto bg-[radial-gradient(circle,var(--card)_0%,var(--background)_100%)] p-5 text-center animate-pop-in">
            <PartyPopper size={48} className="text-[var(--secondary)]" aria-hidden />
            <h2 className="title-page text-[var(--secondary)]">{t.weHaveAWinner}</h2>
            {subtitle && <p className="text-[var(--muted-foreground)]">{subtitle}</p>}

            <button
                type="button"
                onClick={onOpenDetails}
                aria-label={`${t.details}: ${movie.title}`}
                className="relative aspect-[2/3] w-[180px] shrink-0 overflow-hidden rounded-2xl border-4 border-[var(--secondary)] shadow-[0_0_50px_var(--secondary-glow)] transition-transform hover:scale-105"
            >
                <Poster src={movie.image} alt="" sizes="180px" priority />
            </button>
            <h3 className="max-w-[280px] font-display text-2xl font-extrabold leading-tight">{movie.title}</h3>

            <div className="flex flex-col items-center gap-1.5">
                <a
                    href={best?.link ?? googleWatchUrl(movie.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ size: 'lg' })}
                >
                    <Play size={18} aria-hidden /> {t.watchNow}
                </a>
                <span className="text-caption min-h-[1.2em]" aria-live="polite">
                    {loading ? t.searchingPlatform : best ? t.onPlatform(best.name) : ''}
                </span>
            </div>
            {children}
        </div>
    );
}
