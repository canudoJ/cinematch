'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useUser } from '@/context/UserContext';
import { Movie } from '@/lib/data';
import { getWatchLink, fetchDetails } from '@/services/tmdb';


import { useChallenge } from '@/context/ChallengeContext';
import CloseButton from './ui/CloseButton';

interface LibraryModalProps {
    onClose: () => void;
}

export default function LibraryModal({ onClose }: LibraryModalProps) {
    const { t } = useLanguage();
    const { likedContent, removeLike, updateLike, platforms } = useUser();
    const { sendChallenge } = useChallenge(); // Hook added

    const [selectedItem, setSelectedItem] = useState<Movie | null>(null);
    const [watchLink, setWatchLink] = useState<string | null>(null);
    const [providerName, setProviderName] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'movie' | 'tv'>('all');
    const [filterPlatform, setFilterPlatform] = useState<string>('all');
    const [enriching, setEnriching] = useState(false);

    // Auto-Enrich Missing Data (Updated for Multi-Provider)
    React.useEffect(() => {
        const enrichContent = async () => {
            if (enriching || likedContent.length === 0) return;
            
            // Identificar películas que necesitan enriquecimiento
            const moviesToEnrich = likedContent.filter(m => 
                m.id && (
                    !m.providers || 
                    m.providers.length === 0 || 
                    !m.providerName
                )
            );

            if (moviesToEnrich.length === 0) return;

            setEnriching(true);

            // Enriquecer en paralelo (limitado a 5 a la vez para no sobrecargar)
            const batchSize = 5;
            for (let i = 0; i < moviesToEnrich.length; i += batchSize) {
                const batch = moviesToEnrich.slice(i, i + batchSize);
                
                await Promise.allSettled(
                    batch.map(async (movie) => {
                        try {
                            const { link, providerName, providers } = await getWatchLink(
                                movie.id, 
                                movie.type || 'movie', 
                                platforms
                            );
                            
                            const updated = {
                                ...movie,
                                providerName: providerName || movie.providerName || undefined,
                                watchLink: link || movie.watchLink || undefined,
                                providers: providers && providers.length > 0 ? providers : (movie.providers || [])
                            };
                            
                            // Actualizar si hay nueva información
                            if ((providers && providers.length > 0) || providerName) {
                                updateLike(updated);
                            }
                        } catch (e) {
                            console.error("Enrichment error for movie:", movie.id, e);
                        }
                    })
                );

                // Pequeña pausa entre lotes para no sobrecargar la API
                if (i + batchSize < moviesToEnrich.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            setEnriching(false);
        };

        // Ejecutar inmediatamente y también cuando cambien los likes o plataformas
        enrichContent();
    }, [likedContent.length, platforms, updateLike]);

    const filteredContent = likedContent.filter(movie => {
        const matchesType = filterType === 'all' || movie.type === filterType;
        const matchesSearch = !searchQuery || movie.title.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesPlatform = true;
        if (filterPlatform !== 'all') {
            const fName = filterPlatform.toLowerCase().trim();
            
            // Normalizar nombres comunes de plataformas para matching más flexible
            const normalizePlatformName = (name: string): string => {
                const normalized = name.toLowerCase().trim();
                // Mapeos comunes
                if (normalized.includes('hbo') || normalized.includes('max')) return 'hbo';
                if (normalized.includes('netflix')) return 'netflix';
                if (normalized.includes('disney') || normalized.includes('disney+')) return 'disney';
                if (normalized.includes('amazon') || normalized.includes('prime')) return 'amazon';
                if (normalized.includes('crunchyroll')) return 'crunchyroll';
                return normalized;
            };

            const normalizedFilter = normalizePlatformName(fName);
            const targetIsHBO = normalizedFilter === 'hbo';

            // Prioridad 1: Check against the providers array (más completo)
            if (movie.providers && movie.providers.length > 0) {
                matchesPlatform = movie.providers.some((p: { name: string; link: string }) => {
                    const pName = normalizePlatformName(p.name);
                    if (targetIsHBO) {
                        return pName === 'hbo' || pName.includes('hbo') || pName.includes('max');
                    }
                    return pName === normalizedFilter || pName.includes(normalizedFilter) || normalizedFilter.includes(pName);
                });
            } 
            // Prioridad 2: Fallback to providerName (legacy single-provider)
            else if (movie.providerName) {
                const pName = normalizePlatformName(movie.providerName);
                if (targetIsHBO) {
                    matchesPlatform = pName === 'hbo' || pName.includes('hbo') || pName.includes('max');
                } else {
                    matchesPlatform = pName === normalizedFilter || pName.includes(normalizedFilter) || normalizedFilter.includes(pName);
                }
            } 
            // Prioridad 3: Si no hay información de plataforma, no mostrar en filtro específico
            else {
                matchesPlatform = false;
            }
        }

        return matchesType && matchesSearch && matchesPlatform;
    });

    const handleItemClick = async (movie: Movie) => {
        setSelectedItem(movie);

        // Obtener información de plataforma ANTES de mostrar el detalle
        let targetLink = movie.watchLink;
        let targetProvider = movie.providerName || null;

        // Prioridad 1: Si hay providers en el objeto, usar el primero o el que coincida con el filtro
        if (movie.providers && movie.providers.length > 0) {
            if (filterPlatform !== 'all') {
                const fName = filterPlatform.toLowerCase();
                const targetIsHBO = fName.includes('hbo') || fName.includes('max');

                const match = movie.providers.find((p: { name: string; link: string }) => {
                    const pName = p.name.toLowerCase();
                    if (targetIsHBO) return pName.includes('hbo') || pName.includes('max');
                    return pName.includes(fName) || fName.includes(pName);
                });

                if (match) {
                    targetLink = match.link;
                    targetProvider = match.name;
                } else {
                    // Usar el primero disponible si no hay match con el filtro
                    targetLink = movie.providers[0].link;
                    targetProvider = movie.providers[0].name;
                }
            } else {
                // Sin filtro, usar el primero disponible
                targetLink = movie.providers[0].link;
                targetProvider = movie.providers[0].name;
            }
        }

        // Prioridad 2: Si no hay enlace, obtener desde TMDB
        if (!targetLink && movie.id) {
            try {
                const { link, providerName, providers } = await getWatchLink(movie.id, movie.type, platforms);
                if (link) {
                    targetLink = link;
                    targetProvider = providerName || targetProvider;
                } else if (providers && providers.length > 0) {
                    // Usar el primer provider disponible
                    targetLink = providers[0].link;
                    targetProvider = providers[0].name;
                }
            } catch (error) {
                console.error('Error obteniendo enlace de plataforma:', error);
            }
        }

        // Prioridad 3: Si hay providerName pero no link, construir enlace de búsqueda en la plataforma
        if (!targetLink && targetProvider) {
            const query = encodeURIComponent(movie.title);
            const provider = targetProvider.toLowerCase();

            if (provider.includes('netflix')) {
                targetLink = `https://www.netflix.com/search?q=${query}`;
            } else if (provider.includes('disney')) {
                targetLink = `https://www.disneyplus.com/search?q=${query}`;
            } else if (provider.includes('amazon') || provider.includes('prime')) {
                targetLink = `https://www.primevideo.com/search?q=${query}&i=instant-video`;
            } else if (provider.includes('hbo') || provider.includes('max')) {
                targetLink = `https://www.hbomax.com/es/es/search?q=${query}`;
            } else if (provider.includes('crunchyroll')) {
                targetLink = `https://www.crunchyroll.com/search?q=${query}`;
            }
        }

        setWatchLink(targetLink || null);
        setProviderName(targetProvider || null);
    };

    const closeDetail = () => {
        setSelectedItem(null);
        setWatchLink(null);
        setProviderName(null);
    };

    return (
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
            <div className="animate-pop-in" style={{
                background: 'var(--bg-darker)',
                padding: '30px',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '600px',
                border: '1px solid #333',
                position: 'relative',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <CloseButton onClose={onClose} />

                {!selectedItem ? (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0 }}>{t.library || 'My Library'} ❤️</h2>
                        </div>

                        {/* Filters */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    flex: 1, minWidth: '120px',
                                    padding: '10px', borderRadius: '8px', border: '1px solid #333', background: '#222', color: 'white'
                                }}
                            />
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as any)}
                                style={{
                                    padding: '10px', borderRadius: '8px', border: '1px solid #333', background: '#222', color: 'white'
                                }}
                            >
                                <option value="all">All Types</option>
                                <option value="movie">Movies</option>
                                <option value="tv">TV Shows</option>
                            </select>
                            <select
                                value={filterPlatform}
                                onChange={(e) => setFilterPlatform(e.target.value)}
                                style={{
                                    padding: '10px', borderRadius: '8px', border: '1px solid #333', background: '#222', color: 'white'
                                }}
                            >
                                <option value="all">All Platforms</option>
                                <option value="Netflix">Netflix</option>
                                <option value="Prime Video">Prime Video</option>
                                <option value="Disney+">Disney+</option>
                                <option value="HBO Max">HBO Max</option>
                                <option value="Crunchyroll">Crunchyroll</option>
                            </select>
                        </div>

                        {filteredContent.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                <p>No matching items found.</p>
                            </div>
                        ) : (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                                gap: '15px',
                                overflowY: 'auto',
                                paddingRight: '5px'
                            }}>
                                {filteredContent.map((movie: Movie) => (
                                    <div
                                        key={movie.id}
                                        onClick={() => handleItemClick(movie)}
                                        style={{ position: 'relative', cursor: 'pointer', borderRadius: '8px', overflow: 'hidden' }}
                                    >
                                        <img
                                            src={movie.image}
                                            alt={movie.title}
                                            style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover' }}
                                        />
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, black)', padding: '5px', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {movie.title}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <img
                                src={selectedItem.image}
                                alt={selectedItem.title}
                                style={{ width: '120px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}
                            />
                            <h2 style={{ fontSize: '1.5rem', margin: '10px 0' }}>{selectedItem.title}</h2>
                            <p style={{ color: '#888', fontSize: '0.9rem' }}>{selectedItem.year} • ⭐ {selectedItem.rating}</p>
                        </div>

                        <p style={{ color: '#ddd', fontSize: '0.9rem', lineHeight: '1.5', flex: 1, overflowY: 'auto' }}>
                            {selectedItem.synopsis || selectedItem.synopsis_es}
                        </p>

                        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {watchLink && providerName ? (
                                <a
                                    href={watchLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        background: 'var(--accent-green)',
                                        color: 'black',
                                        padding: '15px',
                                        borderRadius: '12px',
                                        textAlign: 'center',
                                        textDecoration: 'none',
                                        fontWeight: 'bold',
                                        display: 'block'
                                    }}
                                >
                                    Ver en {providerName} ↗
                                </a>
                            ) : watchLink ? (
                                <a
                                    href={watchLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        background: 'var(--accent-green)',
                                        color: 'black',
                                        padding: '15px',
                                        borderRadius: '12px',
                                        textAlign: 'center',
                                        textDecoration: 'none',
                                        fontWeight: 'bold',
                                        display: 'block'
                                    }}
                                >
                                    Ver en Plataforma ↗
                                </a>
                            ) : (
                                <a
                                    href={`https://www.google.com/search?q=ver+${encodeURIComponent(selectedItem.title)}+online`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        background: '#666',
                                        color: 'white',
                                        padding: '15px',
                                        borderRadius: '12px',
                                        textAlign: 'center',
                                        textDecoration: 'none',
                                        fontWeight: 'bold',
                                        display: 'block',
                                        opacity: 0.7
                                    }}
                                >
                                    Buscar en Google (último recurso) ↗
                                </a>
                            )}

                            <button
                                onClick={() => {
                                    removeLike(selectedItem.id);
                                    closeDetail();
                                }}
                                style={{ flex: 1, padding: '15px', borderRadius: '15px', background: 'rgba(255, 75, 75, 0.1)', color: 'var(--accent-red)', border: 'none', cursor: 'pointer' }}
                            >
                                Eliminar 💔
                            </button>
                            <button
                                onClick={closeDetail}
                                style={{ marginTop: '10px', width: '100%', padding: '12px', borderRadius: '12px', background: '#333', color: 'white', border: 'none', cursor: 'pointer' }}
                            >
                                Volver
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
