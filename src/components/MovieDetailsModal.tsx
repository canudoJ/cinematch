'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Movie } from '@/lib/data';
import { useLanguage } from '@/context/LanguageContext';
import { useUser } from '@/context/UserContext';
import { getWatchLink, buildPlatformSearchUrl } from '@/services/tmdb';
import BackButton from './ui/BackButton';

interface MovieDetailsModalProps {
    movie: Movie;
    onClose: () => void;
    onLike?: () => void;
    onDislike?: () => void;
    /** Si es true, no guarda en la videoteca al pulsar Ver (uso desde LibraryModal) */
    skipSave?: boolean;
    /** Etiqueta del botón de eliminar (solo cuando viene de la videoteca) */
    dislikeLabel?: string;
}

interface MovieDetails {
    overview?: string;
    director?: string;
    cast?: string[];
    runtime?: number;
    genres?: string[];
    production_companies?: string[];
    seasonsCount?: number;
    episodesPerSeason?: { seasonNumber: number; episodeCount: number }[];
    averageEpisodeRuntime?: number;
}

interface Provider {
    name: string;
    link: string;
}

export default function MovieDetailsModal({
    movie,
    onClose,
    onLike,
    onDislike,
    skipSave = false,
    dislikeLabel,
}: MovieDetailsModalProps) {
    const { t, language } = useLanguage();
    const { platforms, addLike } = useUser();

    const [details, setDetails] = useState<MovieDetails | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(true);
    const [showSeasonDetails, setShowSeasonDetails] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Plataformas disponibles con links directos
    const [providers, setProviders] = useState<Provider[]>([]);
    const [providersLoading, setProvidersLoading] = useState(true);
    // Link de JustWatch como fallback (contenido específico)
    const [justwatchFallback, setJustwatchFallback] = useState<string | null>(null);

    // ── Fetch detalles TMDB ──────────────────────────────────────────────────
    useEffect(() => {
        setDetailsLoading(true);
        const fetchMovieDetails = async () => {
            try {
                const response = await fetch(
                    `https://api.themoviedb.org/3/${movie.type}/${movie.id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&language=${language === 'es' ? 'es-ES' : 'en-US'}&append_to_response=credits`
                );
                if (response.ok) {
                    const data = await response.json();

                    let director: string | undefined;
                    if (movie.type === 'movie' && data.credits?.crew) {
                        const d = data.credits.crew.find((p: any) => p.job === 'Director');
                        director = d?.name;
                    }

                    const cast = data.credits?.cast?.slice(0, 5).map((a: any) => a.name) || [];
                    const genres = data.genres?.map((g: any) => g.name) || [];
                    const production_companies = data.production_companies?.slice(0, 3).map((c: any) => c.name) || [];

                    let seasonsCount: number | undefined;
                    let episodesPerSeason: { seasonNumber: number; episodeCount: number }[] | undefined;
                    let averageEpisodeRuntime: number | undefined;

                    if (movie.type === 'tv') {
                        seasonsCount = data.number_of_seasons;
                        if (Array.isArray(data.seasons)) {
                            episodesPerSeason = data.seasons
                                .filter((s: any) => s.season_number > 0 && s.episode_count)
                                .map((s: any) => ({ seasonNumber: s.season_number, episodeCount: s.episode_count }));
                        }
                        if (Array.isArray(data.episode_run_time) && data.episode_run_time.length > 0) {
                            averageEpisodeRuntime = data.episode_run_time[0];
                        }
                    }

                    setDetails({ overview: data.overview, director, cast, runtime: data.runtime || data.episode_run_time?.[0], genres, production_companies, seasonsCount, episodesPerSeason, averageEpisodeRuntime });
                }
            } catch {
                // silencio
            } finally {
                setDetailsLoading(false);
            }
        };
        fetchMovieDetails();
    }, [movie.id, movie.type, language]);

    // ── Fetch links de plataformas ───────────────────────────────────────────
    useEffect(() => {
        setProviders([]);
        setProvidersLoading(true);
        setJustwatchFallback(null);

        // Usar el locale del navegador para la región (más preciso que el idioma de la app)
        const country = (typeof navigator !== 'undefined'
            ? (navigator.language.split('-')[1]?.toUpperCase() || navigator.language.toUpperCase())
            : 'ES') || 'ES';

        // Llamada paralela:
        // 1) JustWatch GraphQL (links directos al contenido en la plataforma)
        // 2) TMDB watch/providers (lista de qué plataformas lo tienen + search URLs)
        Promise.allSettled([
            fetch('/api/justwatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tmdbId: movie.id, type: movie.type, title: movie.title, country }),
            }).then(r => r.json()) as Promise<{ providers: Provider[] }>,

            getWatchLink(movie.id, movie.type, platforms || [], country, movie.title),
        ]).then(([jwResult, tmdbResult]) => {
            // Links directos de JustWatch GraphQL (ej: netflix.com/title/12345)
            const directLinks: Provider[] =
                jwResult.status === 'fulfilled' ? (jwResult.value.providers ?? []) : [];

            // Providers de TMDB con search URLs por plataforma
            const tmdbProviders: Provider[] =
                tmdbResult.status === 'fulfilled' ? (tmdbResult.value.providers ?? []) : [];

            // JustWatch URL del contenido (solo como fuente de verdad extra)
            const jwFallback: string | null =
                tmdbResult.status === 'fulfilled' ? (tmdbResult.value.justwatchLink ?? null) : null;

            /**
             * Fusión: tomamos la lista de plataformas de TMDB (la más completa)
             * y para cada una buscamos si JustWatch GraphQL tiene un link directo.
             * Si lo tiene → link directo (netflix.com/title/…)
             * Si no       → search URL en esa plataforma (netflix.com/search?q=…)
             * Crunchyroll → siempre search URL (no está en JustWatch)
             */
            const merged: Provider[] = tmdbProviders.map(tp => {
                const name = tp.name;

                // Crunchyroll nunca está en JustWatch → siempre search URL
                if (name.toLowerCase().includes('crunchyroll')) {
                    return { name, link: buildPlatformSearchUrl(name, movie.title) };
                }

                // Buscar link directo de JustWatch GraphQL (normalizar nombre para comparar)
                const direct = directLinks.find(
                    dl => dl.name.toLowerCase().replace(/[^a-z0-9]/g, '') ===
                          name.toLowerCase().replace(/[^a-z0-9]/g, '')
                );
                if (direct?.link) return { name, link: direct.link };

                // Fallback: search URL en la plataforma específica
                return { name, link: buildPlatformSearchUrl(name, movie.title) };
            });

            // Si TMDB no dio providers pero JustWatch GraphQL sí → usar directLinks
            const finalProviders = merged.length > 0 ? merged : directLinks;

            if (finalProviders.length > 0) {
                setProviders(finalProviders);
            } else if (movie.providers && movie.providers.length > 0) {
                // Últimos recursos: los que tenga guardados el objeto movie
                setProviders(
                    movie.providers.map(p => ({
                        name: p.name,
                        link: buildPlatformSearchUrl(p.name, movie.title),
                    }))
                );
            }

            setJustwatchFallback(jwFallback);
            setProvidersLoading(false);
        });
    }, [movie.id]);

    // Resetear scroll cuando cambia la película
    useEffect(() => {
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    }, [movie.id]);

    // Notificar apertura/cierre para ocultar barra de navegación
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('cinematch:details-opened'));
        return () => { window.dispatchEvent(new CustomEvent('cinematch:details-closed')); };
    }, []);

    const title = language === 'es' && movie.title_es ? movie.title_es : movie.title;
    const synopsis = language === 'es' && movie.synopsis_es ? movie.synopsis_es : movie.synopsis;

    const handleWatchOn = (provider: Provider) => {
        if (!skipSave) {
            addLike({
                ...movie,
                providers: providers.length > 0 ? providers : (movie.providers || []),
                providerName: provider.name,
                watchLink: provider.link,
            });
        }
        window.open(provider.link, '_blank', 'noopener,noreferrer');
        if (onLike) onLike();
        onClose();
    };

    const handleSearchOnline = () => {
        // Siempre buscar en Google — nunca JustWatch como destino final
        const query = encodeURIComponent(title);
        const url = `https://www.google.com/search?q=ver+${query}+online`;
        if (!skipSave) addLike({ ...movie, providers: [] });
        window.open(url, '_blank', 'noopener,noreferrer');
        if (onLike) onLike();
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[2000] flex items-center justify-center"
            style={{
                background: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(12px)',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                padding: '5px',
            }}
            onClick={onClose}
        >
            <div
                className="relative w-full rounded-3xl overflow-hidden shadow-2xl shadow-black/50"
                style={{
                    width: 'min(100%, 440px)',
                    height: 'calc(100vh - 10px)',
                    border: '1.5px solid transparent',
                    boxSizing: 'border-box',
                    backgroundImage: 'linear-gradient(var(--card), var(--card)), linear-gradient(135deg, #00E5FF, #FF0055)',
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: 'var(--card)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Cabecera con póster ── */}
                <header
                    className="rounded-t-3xl overflow-hidden"
                    style={{ position: 'relative', width: '100%', height: '250px', flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <Image
                        src={movie.image}
                        alt={title}
                        fill
                        sizes="(max-width: 768px) 100vw, 640px"
                        className="object-cover object-top"
                        style={{ width: '100%', height: '100%' }}
                        priority={false}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-6 pt-10 pb-5">
                        <h1 className="text-3xl font-bold text-white m-0">{title}</h1>
                        <div className="flex gap-4 items-center mt-2.5 flex-wrap text-sm">
                            <span className="inline-flex items-center gap-1 bg-[var(--secondary)] text-black px-3 py-1 rounded-lg font-bold">
                                <span>⭐</span>
                                <span>{movie.rating?.toFixed(1) || 'N/A'}</span>
                            </span>
                            <span className="text-white/80">{movie.year}</span>
                            {details?.runtime && (
                                <span className="text-white/80">
                                    {details.runtime} {movie.type === 'movie' ? 'min' : 'min/ep'}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="absolute top-4 left-4">
                        <BackButton onClick={onClose} />
                    </div>
                </header>

                {/* Separador */}
                <div style={{ width: '100%', height: '1px', backgroundColor: 'var(--surface-border)', flexShrink: 0 }} />

                {/* ── Cuerpo scrollable ── */}
                <div
                    ref={scrollContainerRef}
                    className="overflow-y-auto overflow-x-hidden bg-[var(--card)]"
                    style={{ padding: 24, paddingBottom: 32, flex: '1 1 0', minHeight: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Géneros */}
                    {details?.genres && details.genres.length > 0 && (
                        <div className="mb-5 flex gap-2 flex-wrap">
                            {details.genres.map((genre, i) => (
                                <span key={i} className="text-[var(--secondary)] px-3 py-1.5 rounded-xl text-sm font-bold" style={{ backgroundColor: 'rgba(0,229,255,0.15)' }}>
                                    {genre}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Sinopsis */}
                    {(details?.overview || synopsis) && (
                        <section className="mb-6">
                            <h3 className="text-xl font-bold mb-2.5 text-[var(--secondary)]">
                                {language === 'es' ? 'Sinopsis' : 'Synopsis'}
                            </h3>
                            <p className="text-base leading-relaxed text-[var(--foreground)] opacity-95">
                                {details?.overview || synopsis}
                            </p>
                        </section>
                    )}

                    {/* Temporadas (TV) */}
                    {movie.type === 'tv' && (details?.seasonsCount || details?.episodesPerSeason?.length || details?.averageEpisodeRuntime) && (
                        <section className="mb-6">
                            <button type="button" onClick={() => setShowSeasonDetails(p => !p)} className="w-full flex items-center justify-between text-left">
                                <h3 className="text-xl font-bold mb-0 text-[var(--secondary)]">
                                    {language === 'es' ? 'Temporadas y episodios' : 'Seasons & episodes'}
                                </h3>
                                <span className="text-[var(--secondary)] text-lg ml-2">{showSeasonDetails ? '▴' : '▾'}</span>
                            </button>
                            {details?.seasonsCount && (
                                <p className="text-base leading-relaxed text-[var(--foreground)] opacity-95 mt-2 mb-2">
                                    {language === 'es' ? 'Temporadas' : 'Seasons'}: {details.seasonsCount}
                                </p>
                            )}
                            {showSeasonDetails && (
                                <>
                                    {details?.episodesPerSeason && details.episodesPerSeason.length > 0 && (
                                        <div className="mb-2 flex flex-col">
                                            {details.episodesPerSeason.map((s) => (
                                                <p key={s.seasonNumber} className="text-base leading-relaxed text-[var(--foreground)] opacity-95 mb-1">
                                                    {language === 'es' ? `Temporada ${s.seasonNumber}: ${s.episodeCount} episodios` : `Season ${s.seasonNumber}: ${s.episodeCount} episodes`}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                    {details?.averageEpisodeRuntime && (
                                        <p className="text-base leading-relaxed text-[var(--foreground)] opacity-95">
                                            {language === 'es' ? 'Duración media por capítulo' : 'Average runtime per episode'}: {details.averageEpisodeRuntime} min
                                        </p>
                                    )}
                                </>
                            )}
                        </section>
                    )}

                    {/* Director */}
                    {details?.director && (
                        <section className="mb-6">
                            <h3 className="text-xl font-bold mb-2.5 text-[var(--secondary)]">Director</h3>
                            <p className="text-base leading-relaxed text-[var(--foreground)] opacity-95">{details.director}</p>
                        </section>
                    )}

                    {/* Reparto */}
                    {details?.cast && details.cast.length > 0 && (
                        <section className="mb-6">
                            <h3 className="text-xl font-bold mb-2.5 text-[var(--secondary)]">
                                {language === 'es' ? 'Reparto principal' : 'Main cast'}
                            </h3>
                            <p className="text-base leading-relaxed text-[var(--foreground)] opacity-95">{details.cast.join(', ')}</p>
                        </section>
                    )}

                    {/* Producción */}
                    {details?.production_companies && details.production_companies.length > 0 && (
                        <section className="mb-6">
                            <h3 className="text-xl font-bold mb-2.5 text-[var(--secondary)]">
                                {language === 'es' ? 'Producción' : 'Production'}
                            </h3>
                            <p className="text-base leading-relaxed text-[var(--foreground)] opacity-95">{details.production_companies.join(', ')}</p>
                        </section>
                    )}

                    {detailsLoading && (
                        <div className="text-center py-5 text-[var(--muted-foreground)]">
                            {language === 'es' ? 'Cargando detalles...' : 'Loading details...'}
                        </div>
                    )}

                    {/* ── Sección dónde verlo ── */}
                    <section className="mt-2">
                        <h3 className="text-xl font-bold mb-3 text-[var(--secondary)]">
                            {language === 'es' ? 'Dónde verlo' : 'Where to watch'}
                        </h3>

                        {providersLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 0' }}>
                                <div style={{
                                    width: '18px', height: '18px', borderRadius: '50%',
                                    border: '2px solid var(--secondary)',
                                    borderTopColor: 'transparent',
                                    animation: 'spin 0.8s linear infinite',
                                    flexShrink: 0,
                                }} />
                                <span style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
                                    {language === 'es' ? 'Buscando plataformas...' : 'Looking up platforms...'}
                                </span>
                                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                            </div>
                        ) : providers.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {providers.map((provider, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleWatchOn(provider)}
                                        style={{
                                            width: '100%',
                                            padding: '14px 18px',
                                            borderRadius: '14px',
                                            background: idx === 0
                                                ? 'var(--secondary)'
                                                : 'rgba(0,229,255,0.1)',
                                            color: idx === 0 ? '#000' : 'var(--secondary)',
                                            border: idx === 0 ? 'none' : '1.5px solid rgba(0,229,255,0.35)',
                                            fontWeight: 'bold',
                                            fontSize: '1rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            transition: 'filter 0.15s',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.12)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
                                    >
                                        <span>
                                            {language === 'es' ? 'Ver en' : 'Watch on'} {provider.name}
                                        </span>
                                        <span style={{ fontSize: '1.1rem' }}>↗</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            /* Sin providers conocidos → fallback JustWatch o Google */
                            <button
                                type="button"
                                onClick={handleSearchOnline}
                                style={{
                                    width: '100%',
                                    padding: '14px 18px',
                                    borderRadius: '14px',
                                    background: 'rgba(255,255,255,0.07)',
                                    color: 'var(--foreground)',
                                    border: '1.5px solid rgba(255,255,255,0.15)',
                                    fontWeight: 'bold',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <span>{language === 'es' ? 'Buscar dónde ver' : 'Find where to watch'}</span>
                                <span style={{ fontSize: '1.1rem' }}>↗</span>
                            </button>
                        )}

                        {/* Botón eliminar (solo desde la videoteca) */}
                        {onDislike && (
                            <button
                                type="button"
                                onClick={onDislike}
                                style={{
                                    width: '100%',
                                    marginTop: '10px',
                                    padding: '14px 18px',
                                    borderRadius: '14px',
                                    background: 'rgba(255,75,75,0.08)',
                                    color: 'var(--destructive)',
                                    border: '1.5px solid rgba(255,75,75,0.3)',
                                    fontWeight: 'bold',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                }}
                            >
                                <span>🗑</span>
                                <span>{dislikeLabel || (language === 'es' ? 'Eliminar de mi videoteca' : 'Remove from library')}</span>
                            </button>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
