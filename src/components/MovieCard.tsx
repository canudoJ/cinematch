'use client';

import React from 'react';
import Image from 'next/image';
import { Film, Star, Tv } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { formatYear, getLocalizedSynopsis, getLocalizedTitle } from '@/lib/movies';
import { POSTER_PLACEHOLDER } from '@/components/ui/Poster';
import { GenreChip } from '@/components/ui/GenreChip';
import type { Movie } from '@/types';

interface MovieCardProps {
    movie: Movie;
    /** Si se indica, la tarjeta es interactiva y abre los detalles */
    onOpenDetails?: () => void;
    /** Tarjeta visible al cargar: su póster se pide con prioridad (es el LCP de la home) */
    priority?: boolean;
}

/** Píldora translúcida sobre el póster */
const glassPill = 'flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--on-media)_22%,transparent)] bg-[color-mix(in_srgb,var(--media-bg)_55%,transparent)] px-3 py-1 text-xs font-bold backdrop-blur-md';

/** Tarjeta de película del feed de swipe */
export default function MovieCard({ movie, onOpenDetails, priority = false }: MovieCardProps) {
    const { language, t } = useLanguage();
    const title = getLocalizedTitle(movie, language);
    const synopsis = getLocalizedSynopsis(movie, language);
    const interactive = !!onOpenDetails;
    const TypeIcon = movie.type === 'tv' ? Tv : Film;

    return (
        <div
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : -1}
            aria-label={interactive ? `${t.details}: ${title}` : undefined}
            aria-hidden={interactive ? undefined : true}
            onClick={onOpenDetails}
            onKeyDown={e => {
                if (interactive && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onOpenDetails?.();
                }
            }}
            className={`relative flex h-full w-full flex-col overflow-hidden rounded-[20px] border border-[var(--surface-border)] bg-[var(--media-bg)] shadow-[0_25px_50px_rgba(0,0,0,0.5)] ${interactive ? 'cursor-pointer' : ''}`}
        >
            {/* Fondo: el mismo póster difuminado, para que la tarjeta ancha no deje franjas vacías */}
            <Image
                src={movie.image || POSTER_PLACEHOLDER}
                alt=""
                fill
                sizes="64px"
                className="scale-110 object-cover blur-2xl brightness-50"
            />
            {/* Póster completo sin recortar */}
            <Image
                src={movie.image || POSTER_PLACEHOLDER}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                priority={priority}
                className="z-[1] object-contain object-top"
            />
            <div className="pointer-events-none absolute inset-0 z-[2] rounded-[20px] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.35)_0%,transparent_18%,transparent_42%,rgba(0,0,0,0.95)_88%)]" />

            {/* El texto va sobre la imagen oscurecida: siempre claro, en ambos temas */}
            <div className="relative z-[3] flex items-start justify-between p-4 text-[var(--on-media)]">
                <span className={glassPill}>
                    <TypeIcon size={14} aria-hidden />
                    {movie.type === 'tv' ? t.mediaTv : t.mediaMovie}
                </span>
                {movie.rating > 0 && (
                    <span className={glassPill} aria-label={`${t.ratingLabel}: ${movie.rating.toFixed(1)}`}>
                        <Star size={14} className="text-[var(--media-amber)]" fill="currentColor" aria-hidden />
                        {movie.rating.toFixed(1)}
                    </span>
                )}
            </div>

            <div className="relative z-[3] mt-auto max-w-3xl p-6 text-[var(--on-media)]">
                <h2 className="mb-3 font-display text-[clamp(1.9rem,4.5vw,2.6rem)] font-extrabold leading-[1.02] tracking-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.85)]">
                    {title}
                </h2>
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    {movie.year > 0 && (
                        <span className="rounded-full border border-[color-mix(in_srgb,var(--on-media)_35%,transparent)] px-2.5 py-0.5 text-xs font-semibold tabular-nums">
                            {formatYear(movie.year)}
                        </span>
                    )}
                    {movie.genres.slice(0, 3).map(genre => <GenreChip key={genre} genre={genre} on="media" />)}
                </div>
                <p className="line-clamp-3 max-w-[62ch] text-[0.95rem] leading-snug opacity-85">{synopsis}</p>
            </div>
        </div>
    );
}
