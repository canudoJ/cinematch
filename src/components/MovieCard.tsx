import React, { useState } from 'react';
import Image from 'next/image';
import { Movie } from '@/lib/data';
import { useLanguage } from '@/context/LanguageContext';
import { useUser } from '@/context/UserContext';
import { getWatchLink } from '@/services/tmdb';

interface MovieCardProps {
    movie: Movie;
    showDetailsOnClick?: boolean;
    onLike?: () => void;
    onDislike?: () => void;
    isDeckMode?: boolean;
    onOpenDetails?: () => void;
}

export default function MovieCard({
    movie,
    showDetailsOnClick = false,
    onLike,
    onDislike,
    isDeckMode = false,
    onOpenDetails,
}: MovieCardProps) {
    const { language } = useLanguage();
    const { platforms } = useUser();
    const [isLoading, setIsLoading] = useState(false);

    const title = language === 'es' && movie.title_es ? movie.title_es : movie.title;
    const synopsis = language === 'es' && movie.synopsis_es ? movie.synopsis_es : movie.synopsis;

    const handleClick = async () => {
        if (isLoading) return;

        // Prioridad máxima: si el padre pasa un manejador externo, usarlo siempre
        if (onOpenDetails) {
            onOpenDetails();
            return;
        }

        // showDetailsOnClick sin manejador externo → no hacer nada
        if (showDetailsOnClick) return;

        // Comportamiento original: abrir enlace de plataforma
        setIsLoading(true);
        try {
            if (movie.watchLink) {
                window.open(movie.watchLink, '_blank', 'noopener,noreferrer');
                setIsLoading(false);
                return;
            }

            if (movie.providers && movie.providers.length > 0) {
                window.open(movie.providers[0].link, '_blank', 'noopener,noreferrer');
                setIsLoading(false);
                return;
            }

            if (movie.providerName) {
                const query = encodeURIComponent(movie.title);
                const provider = movie.providerName.toLowerCase();
                let searchLink = '';

                if (provider.includes('netflix')) {
                    searchLink = `https://www.netflix.com/search?q=${query}`;
                } else if (provider.includes('disney')) {
                    searchLink = `https://www.disneyplus.com/search?q=${query}`;
                } else if (provider.includes('amazon') || provider.includes('prime')) {
                    searchLink = `https://www.primevideo.com/search?q=${query}&i=instant-video`;
                } else if (provider.includes('hbo') || provider.includes('max')) {
                    searchLink = `https://www.hbomax.com/es/es/search?q=${query}`;
                } else if (provider.includes('crunchyroll')) {
                    searchLink = `https://www.crunchyroll.com/search?q=${query}`;
                }

                if (searchLink) {
                    window.open(searchLink, '_blank', 'noopener,noreferrer');
                    setIsLoading(false);
                    return;
                }
            }

            const { link, providers } = await getWatchLink(movie.id, movie.type, platforms);

            if (link) {
                window.open(link, '_blank', 'noopener,noreferrer');
            } else if (providers && providers.length > 0) {
                window.open(providers[0].link, '_blank', 'noopener,noreferrer');
            } else {
                const query = encodeURIComponent(`watch ${movie.title}`);
                window.open(`https://www.google.com/search?q=${query}`, '_blank', 'noopener,noreferrer');
            }
        } catch (error) {
            const query = encodeURIComponent(`watch ${movie.title}`);
            window.open(`https://www.google.com/search?q=${query}`, '_blank', 'noopener,noreferrer');
        } finally {
            setIsLoading(false);
        }
    };

    const isChallenge = movie.source === 'challenge' && movie.challengeId;

    return (
        <>
        <div
            role="button"
            aria-label={title}
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void handleClick(); } }}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                borderRadius: '20px',
                overflow: 'hidden',
                background: 'var(--background)',
                boxShadow: isChallenge
                    ? '0 0 30px rgba(255, 215, 0, 0.6), 0 25px 50px rgba(0,0,0,0.5)'
                    : '0 25px 50px rgba(0,0,0,0.5)',
                border: isChallenge
                    ? '2px solid var(--secondary)'
                    : isDeckMode
                        ? '1px solid var(--primary)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                cursor: isLoading ? 'wait' : 'pointer',
                transition: 'opacity 0.2s',
                opacity: isLoading ? 0.7 : 1,
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
            }}
        >
            {/* Póster completo sin recortar */}
            <Image
                src={movie.image}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                className="object-contain object-top"
                style={{ zIndex: 1 }}
                priority={false}
            />

            {/* Gradient overlay */}
            <div
                className="movie-card-overlay"
                style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '20px',
                    pointerEvents: 'none',
                    background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.95) 90%)',
                    zIndex: 2
                }}
            />

            {/* Contenido */}
            <div style={{
                position: 'relative',
                zIndex: 3,
                marginTop: 'auto',
                padding: '24px',
                color: '#ffffff'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                    <h2 style={{
                        fontSize: '2rem',
                        fontWeight: 800,
                        lineHeight: 1.1,
                        textShadow: '0 2px 8px rgba(0,0,0,0.9)',
                        color: '#ffffff'
                    }}>
                        {title}
                    </h2>
                    <span style={{
                        background: 'var(--primary)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        flexShrink: 0,
                        marginLeft: '8px'
                    }}>
                        {movie.rating?.toFixed(1) ?? 'N/A'}
                    </span>
                </div>

                <p style={{
                    fontSize: '1rem',
                    color: '#ffffff',
                    opacity: 0.9,
                    marginBottom: '12px',
                    fontWeight: 500
                }}>
                    {movie.year} • {movie.genres.join(', ')}
                </p>

                <p style={{
                    fontSize: '0.95rem',
                    lineHeight: 1.4,
                    color: '#ffffff',
                    opacity: 0.88,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                }}>
                    {synopsis}
                </p>
            </div>
        </div>
        </>
    );
}
