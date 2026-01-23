'use client';

import { useSearchParams } from 'next/navigation';
import { getMovies, Movie } from '@/lib/data';
import { getWatchLink, fetchDetails } from '@/services/tmdb';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useUser } from '@/context/UserContext';
import BackButton from '@/components/ui/BackButton';

function MatchContent() {
    const searchParams = useSearchParams();
    const movieId = searchParams.get('movieId');
    const typeParam = searchParams.get('type') as 'movie' | 'tv' | null;
    const { t, language } = useLanguage();
    const { platforms } = useUser();

    const [movie, setMovie] = useState<Movie | null>(null);
    const [watchData, setWatchData] = useState<{ link: string | null, providerName: string | null }>({ link: null, providerName: null });

    useEffect(() => {
        async function loadData() {
            if (!movieId) return;
            const contentType = typeParam || 'movie'; // Fallback

            try {
                // Fetch details directly to ensure we have the correct item (movie vs tv)
                const details = await fetchDetails(movieId, contentType);

                if (details) {
                    const foundMovie: Movie = {
                        id: details.id.toString(),
                        type: contentType,
                        title: details.title || details.name || '',
                        title_es: details.title || details.name, // Simplified
                        year: new Date(details.release_date || details.first_air_date || Date.now()).getFullYear(),
                        rating: details.vote_average,
                        image: `https://image.tmdb.org/t/p/w500${details.poster_path}`,
                        synopsis: details.overview,
                        synopsis_es: details.overview,
                        genres: [] // Not critical for match page
                    };

                    setMovie(foundMovie);
                    // Pass platforms to prioritize user's providers
                    const data = await getWatchLink(movieId, contentType, platforms);
                    setWatchData(data);
                } else {
                    console.error("Fetch details returned null for ID:", movieId);
                    // Fallback or error state? For now, let's alert (in dev) or just return to session
                    // window.location.href = '/session'; // Too aggressive?
                }
            } catch (e) {
                console.error("Error loading match data", e);
            }
        }
        loadData();
    }, [movieId, typeParam, platforms]);

    // Construct Direct Link (Smart Search Fallback)
    const getDirectLink = () => {
        if (!movie) return null;
        if (!watchData.providerName) return watchData.link;

        // Normalize provider name
        const provider = watchData.providerName.toLowerCase();
        const query = encodeURIComponent(movie.title);

        if (provider.includes('netflix')) return `https://www.netflix.com/search?q=${query}`;
        if (provider.includes('disney')) return `https://www.disneyplus.com/search?q=${query}`;
        if (provider.includes('amazon') || provider.includes('prime')) return `https://www.primevideo.com/search?q=${query}&i=instant-video`;
        // HBO link is often tricky. Use search.
        if (provider.includes('hbo')) return `https://www.hbomax.com/es/es/search?q=${query}`;
        if (provider.includes('crunchyroll')) return `https://www.crunchyroll.com/search?q=${query}`;

        // If it's "TMDB" (default fallback) but we have a link, use the link (might be JustWatch)
        if (watchData.providerName === 'TMDB' && watchData.link) return watchData.link;

        return watchData.link || `https://www.${provider}.com/search?q=watch+${query}`;
    };

    if (!movie) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading match details...</div>;

    const title = language === 'es' && movie.title_es ? movie.title_es : movie.title;
    const finalLink = getDirectLink();
    const providerDisplay = watchData.providerName || (language === 'es' ? 'Streaming' : 'Streaming');

    return (
        <div className="container" style={{ textAlign: 'center', justifyContent: 'center', height: '100vh', padding: '40px 20px', position: 'relative' }}>
            {/* Absolute Back Button */}
            <BackButton href="/" className="absolute top-5 left-5" />

            <div className="animate-pop-in">
                <h1 style={{ fontFamily: 'Brush Script MT, cursive', fontSize: '4rem', color: 'var(--accent-green)', marginBottom: '20px', transform: 'rotate(-5deg)' }}>
                    {t.itsAMatch}
                </h1>

                <div style={{ position: 'relative', width: '200px', height: '300px', margin: '0 auto 30px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 0 40px rgba(75, 255, 179, 0.4)' }}>
                    <img src={movie.image} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>

                <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>{title}</h2>
                <p style={{ color: '#888', marginBottom: '40px' }}>{movie.year} • {movie.rating}/10</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {finalLink ? (
                        <a href={finalLink} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ background: 'white', color: 'black', textDecoration: 'none' }}>
                            ▶ {language === 'es' ? 'Ver en' : 'Watch on'} {providerDisplay}
                        </a>
                    ) : (
                        <div style={{ padding: '15px', border: '1px dashed #666', borderRadius: '8px', color: '#888' }}>
                            {language === 'es' ? 'No disponible en tus plataformas' : 'Not available on your platforms'}
                        </div>
                    )}

                    <Link href="/" style={{ marginTop: '20px', color: '#666', fontSize: '0.9rem' }}>
                        {t.keepPlaying}
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function MatchPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <MatchContent />
        </Suspense>
    );
}
