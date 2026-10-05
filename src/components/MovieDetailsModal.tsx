'use client';

import React, { useId, useState } from 'react';
import { ChevronDown, ExternalLink, Heart, Star, Trash2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useMovieDetails } from '@/hooks/useMovieDetails';
import { useWatchOptions } from '@/hooks/useWatchOptions';
import { formatYear, getLocalizedSynopsis, getLocalizedTitle } from '@/lib/movies';
import { googleWatchUrl } from '@/lib/providers';
import { ModalShell } from '@/components/ui/ModalShell';
import { Poster } from '@/components/ui/Poster';
import { GenreChip } from '@/components/ui/GenreChip';
import { Spinner } from '@/components/ui/Spinner';
import BackButton from '@/components/ui/BackButton';
import type { Movie } from '@/types';
import { Button, buttonVariants } from '@/components/ui/Button';

interface MovieDetailsModalProps {
    movie: Movie;
    onClose: () => void;
    /** Desde el feed: botón para darle "me gusta" */
    onLike?: () => void;
    /** Desde la videoteca: botón para quitarla */
    onRemove?: () => void;
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="mb-6">
            <h3 className="title-section mb-2.5 text-[var(--secondary)]">{title}</h3>
            {children}
        </section>
    );
}

const bodyText = 'text-base leading-relaxed text-[var(--foreground)] opacity-95';

export default function MovieDetailsModal({ movie, onClose, onLike, onRemove }: MovieDetailsModalProps) {
    const { t, language } = useLanguage();
    const titleId = useId();
    const { details, loading } = useMovieDetails(movie.id, movie.type, language);
    const { options, loading: providersLoading } = useWatchOptions(movie);
    const [showSeasons, setShowSeasons] = useState(false);

    const title = getLocalizedTitle(movie, language);
    const synopsis = details?.overview || getLocalizedSynopsis(movie, language);
    const providers = options?.providers ?? [];

    return (
        <ModalShell
            onClose={onClose}
            labelledBy={titleId}
            layer="overlay"
            panelClassName="relative flex h-[calc(100dvh-10px)] w-[min(100%,440px)] flex-col overflow-hidden rounded-3xl border-[1.5px] border-transparent shadow-2xl [background:linear-gradient(var(--card),var(--card))_padding-box,linear-gradient(135deg,var(--secondary),var(--primary))_border-box]"
        >
            <header className="relative h-[250px] w-full shrink-0 overflow-hidden rounded-t-3xl">
                <Poster src={movie.image} alt="" sizes="440px" className="object-top" />
                <div className="absolute inset-x-0 bottom-0 bg-[image:var(--poster-fade)] px-6 pb-5 pt-10 text-[var(--on-media)]">
                    <h2 id={titleId} className="font-display text-3xl font-extrabold leading-tight tracking-tight">{title}</h2>
                    <div className="mt-2.5 flex flex-wrap items-center gap-4 text-sm">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--secondary)] px-3 py-1 font-bold text-[var(--secondary-foreground)]" aria-label={`${t.ratingLabel}: ${movie.rating.toFixed(1)}`}>
                            <Star size={14} fill="currentColor" aria-hidden /> {movie.rating.toFixed(1)}
                        </span>
                        <span className="opacity-80">{formatYear(movie.year)}</span>
                        {details?.runtime && (
                            <span className="opacity-80">
                                {movie.type === 'movie' ? t.runtimeMovie(details.runtime) : t.runtimeEpisode(details.runtime)}
                            </span>
                        )}
                    </div>
                </div>
                <div className="absolute left-4 top-4 z-10">
                    <BackButton onClick={onClose} />
                </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-t border-[var(--surface-border)] bg-[var(--card)] p-6 pb-8">
                {details && details.genres.length > 0 && (
                    <ul className="mb-5 flex flex-wrap gap-2">
                        {details.genres.map(genre => (
                            <li key={genre}>
                                <GenreChip genre={genre} size="md" />
                            </li>
                        ))}
                    </ul>
                )}

                {synopsis && (
                    <DetailSection title={t.synopsis}>
                        <p className={bodyText}>{synopsis}</p>
                    </DetailSection>
                )}

                {movie.type === 'tv' && details && details.seasons.length > 0 && (
                    <section className="mb-6">
                        <button
                            type="button"
                            onClick={() => setShowSeasons(open => !open)}
                            aria-expanded={showSeasons}
                            className="flex w-full items-center justify-between text-left"
                        >
                            <h3 className="title-section text-[var(--secondary)]">{t.seasonsAndEpisodes}</h3>
                            <ChevronDown size={20} className={`text-[var(--secondary)] transition-transform ${showSeasons ? 'rotate-180' : ''}`} aria-hidden />
                        </button>
                        <p className={`${bodyText} mt-2`}>{t.seasonsLabel}: {details.seasons.length}</p>
                        {showSeasons && (
                            <ul className="mt-2 flex flex-col gap-1">
                                {details.seasons.map(s => (
                                    <li key={s.seasonNumber} className={bodyText}>{t.seasonEpisodes(s.seasonNumber, s.episodeCount)}</li>
                                ))}
                                {details.runtime && <li className={bodyText}>{t.avgEpisodeRuntime(details.runtime)}</li>}
                            </ul>
                        )}
                    </section>
                )}

                {details && details.makers.length > 0 && (
                    <DetailSection title={movie.type === 'movie' ? t.director : t.createdBy}>
                        <p className={bodyText}>{details.makers.join(', ')}</p>
                    </DetailSection>
                )}
                {details && details.cast.length > 0 && (
                    <DetailSection title={t.mainCast}>
                        <p className={bodyText}>{details.cast.join(', ')}</p>
                    </DetailSection>
                )}
                {details && details.production.length > 0 && (
                    <DetailSection title={t.production}>
                        <p className={bodyText}>{details.production.join(', ')}</p>
                    </DetailSection>
                )}

                {loading && <Spinner label={t.loadingDetails} size={24} className="py-5" />}

                <section className="mt-2">
                    <h3 className="title-section mb-3 text-[var(--secondary)]">{t.whereToWatch}</h3>
                    {providersLoading ? (
                        <Spinner label={t.lookingUpPlatforms} size={20} className="items-start py-3" />
                    ) : providers.length > 0 ? (
                        <ul className="flex flex-col gap-2.5">
                            {providers.map((provider, index) => (
                                <li key={provider.name}>
                                    <a
                                        href={provider.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={buttonVariants({ variant: index === 0 ? 'default' : 'outline', size: 'lg', className: 'w-full justify-between' })}
                                    >
                                        <span>{t.watchOnProvider(provider.name)}</span>
                                        <ExternalLink size={18} aria-hidden />
                                        <span className="sr-only">{t.opensInNewTab}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <>
                            <p className="text-caption mb-3">{t.notOnPlatforms}</p>
                            <a
                                href={googleWatchUrl(title)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full justify-between' })}
                            >
                                <span>{t.findWhereToWatch}</span>
                                <ExternalLink size={18} aria-hidden />
                                <span className="sr-only">{t.opensInNewTab}</span>
                            </a>
                        </>
                    )}

                    {onLike && (
                        <Button size="lg" onClick={() => { onLike(); onClose(); }} className="mt-3 w-full">
                            <Heart size={18} fill="currentColor" aria-hidden /> {t.addToLibrary}
                        </Button>
                    )}
                    {onRemove && (
                        <Button variant="danger" size="lg" onClick={onRemove} className="mt-3 w-full">
                            <Trash2 size={18} aria-hidden /> {t.removeFromLibrary}
                        </Button>
                    )}
                </section>
            </div>
        </ModalShell>
    );
}
