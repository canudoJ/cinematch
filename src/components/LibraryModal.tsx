'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useUser } from '@/context/UserContext';
import { Movie } from '@/lib/data';
import { getWatchLink } from '@/services/tmdb';

import { useChallenge } from '@/context/ChallengeContext';
import CloseButton from './ui/CloseButton';
import MovieDetailsModal from './MovieDetailsModal';
import { Heart, Film } from 'lucide-react';

interface LibraryModalProps {
    onClose: () => void;
}

export default function LibraryModal({ onClose }: LibraryModalProps) {
    const { t, language } = useLanguage();
    const { likedContent, removeLike, updateLike, platforms } = useUser();
    const { sendChallenge } = useChallenge();

    const [selectedItem, setSelectedItem] = useState<Movie | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'movie' | 'tv'>('all');
    const [filterPlatforms, setFilterPlatforms] = useState<string[]>([]);
    const [enriching, setEnriching] = useState(false);
    const [sortBy, setSortBy] = useState<'alpha' | 'liked' | 'year'>('alpha');
    const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);

    // Auto-Enrich Missing Data
    React.useEffect(() => {
        const enrichContent = async () => {
            if (enriching || likedContent.length === 0) return;

            const moviesToEnrich = likedContent.filter(m =>
                m.id && (!m.providers || m.providers.length === 0 || !m.providerName)
            );

            if (moviesToEnrich.length === 0) return;

            setEnriching(true);

            const batchSize = 5;
            for (let i = 0; i < moviesToEnrich.length; i += batchSize) {
                const batch = moviesToEnrich.slice(i, i + batchSize);

                await Promise.allSettled(
                    batch.map(async (movie) => {
                        try {
                            const _region = typeof navigator !== 'undefined' ? (navigator.language.split('-')[1]?.toUpperCase() || 'ES') : 'ES';
                            const { link, providerName, providers } = await getWatchLink(
                                movie.id,
                                movie.type || 'movie',
                                platforms,
                                _region,
                                movie.title
                            );

                            const updated = {
                                ...movie,
                                providerName: providerName || movie.providerName || undefined,
                                watchLink: link || movie.watchLink || undefined,
                                providers: providers && providers.length > 0 ? providers : (movie.providers || [])
                            };

                            if ((providers && providers.length > 0) || providerName) {
                                updateLike(updated);
                            }
                        } catch {
                            // silencio
                        }
                    })
                );

                if (i + batchSize < moviesToEnrich.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            setEnriching(false);
        };

        enrichContent();
    }, [likedContent.length, platforms, updateLike]);

    const normalizePlatformName = (name: string): string => {
        const n = name.toLowerCase().trim();
        if (n.includes('hbo') || n.includes('max')) return 'hbo';
        if (n.includes('netflix')) return 'netflix';
        if (n.includes('disney')) return 'disney';
        if (n.includes('amazon') || n.includes('prime')) return 'amazon';
        if (n.includes('crunchyroll')) return 'crunchyroll';
        return n;
    };

    const movieMatchesPlatformKey = (movie: Movie, platformKey: string): boolean => {
        const nf = normalizePlatformName(platformKey);
        const match = (pName: string) => {
            const n = normalizePlatformName(pName);
            return n === nf || n.includes(nf) || nf.includes(n);
        };
        if (movie.providers && movie.providers.length > 0) {
            return movie.providers.some((p: { name: string; link: string }) => match(p.name));
        }
        if (movie.providerName) return match(movie.providerName);
        return false;
    };

    const togglePlatform = (key: string) => {
        setFilterPlatforms(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
    };

    const PLATFORM_CHIPS = [
        { key: 'Netflix', label: 'Netflix' },
        { key: 'Prime Video', label: 'Prime' },
        { key: 'Disney+', label: 'Disney+' },
        { key: 'HBO Max', label: 'HBO Max' },
        { key: 'Crunchyroll', label: 'Crunchyroll' },
    ];

    const filteredContent = likedContent.filter(movie => {
        const matchesType = filterType === 'all' || movie.type === filterType;
        const matchesSearch = !searchQuery || movie.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPlatform = filterPlatforms.length === 0 || filterPlatforms.some(p => movieMatchesPlatformKey(movie, p));
        return matchesType && matchesSearch && matchesPlatform;
    });

    const sortedContent = React.useMemo(() => {
        const base = [...filteredContent];

        if (sortBy === 'alpha') {
            base.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'es', { sensitivity: 'base' }));
        } else if (sortBy === 'year') {
            base.sort((a, b) => (b.year || 0) - (a.year || 0));
        }

        return base;
    }, [filteredContent, sortBy]);

    return (
        <>
            {/* Modal principal de la videoteca */}
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px'
            }}>
                <div className="animate-pop-in modal-surface" style={{
                    width: '100%',
                    maxWidth: '600px',
                    position: 'relative',
                    background: 'var(--card)'
                }}>
                    <div style={{ position: 'absolute', top: 12, left: 12 }}>
                        <CloseButton onClose={onClose} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px', paddingTop: '32px' }}>
                        <div style={{
                            borderRadius: '999px',
                            border: '2px solid var(--secondary)',
                            padding: '8px 16px',
                            boxShadow: '0 0 18px rgba(0,229,255,0.35)',
                        }}>
                            <h2 className="heading-lg" style={{ margin: 0, textAlign: 'center' }}>
                                {t.library || 'My Library'}{' '}
                                <Heart
                                    size={24}
                                    className="inline-block ml-1 -mt-0.5 text-[var(--primary)]"
                                    strokeWidth={2}
                                    aria-hidden
                                />
                            </h2>
                        </div>
                    </div>

                    {/* Filters */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'stretch', position: 'relative' }}>
                        <input
                            type="text"
                            placeholder={`${t.search}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                flex: 1,
                                minWidth: '120px',
                                padding: '10px',
                                borderRadius: '8px',
                                border: '1px solid var(--secondary)',
                                background: 'var(--card)',
                                color: 'var(--foreground)'
                            }}
                        />
                        <div style={{ position: 'relative' }}>
                            <button
                                type="button"
                                onClick={() => setShowFiltersDropdown(!showFiltersDropdown)}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--secondary)',
                                    background: 'var(--card)',
                                    color: 'var(--foreground)',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    minWidth: '120px',
                                    justifyContent: 'space-between',
                                    touchAction: 'manipulation'
                                }}
                            >
                                <span>{t.filters}</span>
                                <span style={{ fontSize: '0.8rem' }}>{showFiltersDropdown ? '▲' : '▼'}</span>
                            </button>

                            {showFiltersDropdown && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: '8px',
                                        background: 'var(--card)',
                                        border: '1px solid var(--secondary)',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        minWidth: '200px',
                                        zIndex: 1000,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: 600 }}>
                                            {t.platform}
                                        </label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {PLATFORM_CHIPS.map(({ key, label }) => {
                                                const active = filterPlatforms.includes(key);
                                                return (
                                                    <button
                                                        key={key}
                                                        onClick={() => togglePlatform(key)}
                                                        style={{
                                                            padding: '5px 12px',
                                                            borderRadius: '20px',
                                                            border: `1px solid ${active ? 'var(--secondary)' : 'var(--border)'}`,
                                                            background: active ? 'rgba(0,229,255,0.12)' : 'var(--surface)',
                                                            color: active ? 'var(--secondary)' : 'var(--muted-foreground)',
                                                            fontSize: '0.8rem',
                                                            fontWeight: active ? 700 : 400,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s',
                                                        }}
                                                    >
                                                        {label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {filterPlatforms.length > 0 && (
                                            <button
                                                onClick={() => setFilterPlatforms([])}
                                                style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                            >
                                                ✕ {language === 'en' ? 'Clear' : 'Limpiar'}
                                            </button>
                                        )}
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: 600 }}>
                                            {t.selectContent}
                                        </label>
                                        <select
                                            value={filterType}
                                            onChange={(e) => setFilterType(e.target.value as any)}
                                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', fontSize: '0.9rem' }}
                                        >
                                            <option value="all">{t.all}</option>
                                            <option value="movie">{t.movies}</option>
                                            <option value="tv">{t.tvShows}</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: 600 }}>
                                            {t.sortBy}
                                        </label>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value as any)}
                                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', fontSize: '0.9rem' }}
                                        >
                                            <option value="alpha">{t.sortAlpha}</option>
                                            <option value="liked">{t.sortLiked}</option>
                                            <option value="year">{t.sortYear}</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {showFiltersDropdown && (
                        <div
                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                            onClick={() => setShowFiltersDropdown(false)}
                        />
                    )}

                    {filteredContent.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted-foreground)' }}>
                            <Film size={48} className="mx-auto mb-2.5 text-[var(--muted-foreground)]" aria-hidden />
                            {likedContent.length === 0 ? (
                                <>
                                    <p style={{ marginBottom: '5px', fontWeight: 600 }}>
                                        {t.noLikesYet || 'Aún no te ha gustado nada'}
                                    </p>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
                                        {t.startSwiping}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p style={{ marginBottom: '5px', fontWeight: 600 }}>{t.noMatches}</p>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>{t.tryOtherSearch}</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignContent: 'flex-start',
                            gap: '16px',
                            overflowY: 'auto',
                            paddingRight: '5px'
                        }}>
                            {sortedContent.map((movie: Movie) => (
                                <div
                                    key={movie.id}
                                    onClick={() => setSelectedItem(movie)}
                                    className="library-card"
                                    style={{ cursor: 'pointer', flex: '0 0 calc((100% - 16px) / 2)' }}
                                >
                                    <div className="library-card-inner">
                                        <img
                                            src={movie.image}
                                            alt={movie.title}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover'
                                            }}
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            background: 'linear-gradient(transparent, #000)',
                                            padding: '6px 8px 10px',
                                            fontSize: '0.85rem',
                                            lineHeight: 1.25,
                                            color: '#ffffff',
                                            textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                        }}>
                                            {movie.title}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de detalles completo — se monta encima del modal de librería */}
            {selectedItem && (
                <MovieDetailsModal
                    movie={selectedItem}
                    onClose={() => setSelectedItem(null)}
                    skipSave={true}
                    onDislike={() => {
                        removeLike(selectedItem.id);
                        setSelectedItem(null);
                    }}
                    dislikeLabel={language === 'es' ? 'Eliminar de mi videoteca' : 'Remove from library'}
                />
            )}
        </>
    );
}
