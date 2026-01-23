import { useState } from 'react';
import { Movie } from '@/lib/data';
import { useLanguage } from '@/context/LanguageContext';
import { useUser } from '@/context/UserContext';
import { getWatchLink } from '@/services/tmdb';

interface MovieCardProps {
    movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
    const { language } = useLanguage();
    const { platforms } = useUser();
    const [isLoading, setIsLoading] = useState(false);

    // Determine content based on language
    const title = language === 'es' && movie.title_es ? movie.title_es : movie.title;
    const synopsis = language === 'es' && movie.synopsis_es ? movie.synopsis_es : movie.synopsis;

    const handleClick = async () => {
        if (isLoading) return;

        setIsLoading(true);
        try {
            // Intentar usar el enlace existente si está disponible
            if (movie.watchLink) {
                window.open(movie.watchLink, '_blank', 'noopener,noreferrer');
                setIsLoading(false);
                return;
            }

            // Si hay providers en el objeto, usar el primero
            if (movie.providers && movie.providers.length > 0) {
                window.open(movie.providers[0].link, '_blank', 'noopener,noreferrer');
                setIsLoading(false);
                return;
            }

            // Si hay providerName, construir enlace de búsqueda
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

            // Obtener enlace desde TMDB
            const { link, providers } = await getWatchLink(movie.id, movie.type, platforms);
            
            if (link) {
                window.open(link, '_blank', 'noopener,noreferrer');
            } else if (providers && providers.length > 0) {
                // Usar el primer provider disponible
                window.open(providers[0].link, '_blank', 'noopener,noreferrer');
            } else {
                // Fallback: búsqueda en Google
                const query = encodeURIComponent(`watch ${movie.title}`);
                window.open(`https://www.google.com/search?q=${query}`, '_blank', 'noopener,noreferrer');
            }
        } catch (error) {
            console.error('Error obteniendo enlace de visualización:', error);
            // Fallback: búsqueda en Google
            const query = encodeURIComponent(`watch ${movie.title}`);
            window.open(`https://www.google.com/search?q=${query}`, '_blank', 'noopener,noreferrer');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div 
            onClick={handleClick}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                borderRadius: '20px',
                overflow: 'hidden',
                background: '#000',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                cursor: isLoading ? 'wait' : 'pointer',
                transition: 'transform 0.2s, opacity 0.2s',
                opacity: isLoading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
                if (!isLoading) {
                    e.currentTarget.style.transform = 'scale(1.02)';
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
            }}
        >
            {/* Movie Poster Background */}
            <img
                src={movie.image}
                alt={title}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 1
                }}
            />

            {/* Gradient Overlay */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.9) 90%)',
                zIndex: 2
            }} />

            {/* Content */}
            <div style={{
                position: 'relative',
                zIndex: 3,
                marginTop: 'auto',
                padding: '24px',
                color: 'white'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                        {title}
                    </h2>
                    <span style={{
                        background: 'var(--primary)',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                    }}>
                        {movie.rating?.toFixed(1) ?? 'N/A'}
                    </span>
                </div>

                <p style={{ fontSize: '1rem', opacity: 0.9, marginBottom: '12px', fontWeight: 500 }}>
                    {movie.year} • {movie.genres.join(', ')}
                </p>

                <p style={{
                    fontSize: '0.95rem',
                    lineHeight: 1.4,
                    opacity: 0.8,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                }}>
                    {synopsis}
                </p>
            </div>
        </div>
    );
}
