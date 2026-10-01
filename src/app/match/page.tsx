'use client';

import { useSearchParams } from 'next/navigation';
import { getMovies, Movie } from '@/lib/data';
import { getWatchLink, fetchDetails } from '@/services/tmdb';
import Link from 'next/link';
import { Play } from 'lucide-react';
import React, { Suspense, useEffect, useState } from 'react';
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

    if (!movie) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
                <p className="text-[var(--muted-foreground)]">Loading match details...</p>
            </div>
        );
    }

    const title = language === 'es' && movie.title_es ? movie.title_es : movie.title;
    const finalLink = getDirectLink();
    const providerDisplay = watchData.providerName || (language === 'es' ? 'Streaming' : 'Streaming');

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center p-6 relative">
            <BackButton href="/" className="absolute top-5 left-5 z-10" />

            <div className="animate-pop-in text-center max-w-md w-full">
                <h1 className="text-5xl font-black text-[var(--secondary)] mb-5 -rotate-[5deg] italic" style={{ fontFamily: 'Brush Script MT, cursive' }}>
                    {t.itsAMatch}
                </h1>

                <div className="relative w-[200px] h-[300px] mx-auto mb-8 rounded-2xl overflow-hidden shadow-[var(--shadow-neon-cyan)]">
                    <img src={movie.image} alt={title} className="w-full h-full object-cover" />
                </div>

                <h2 className="text-2xl font-bold mb-2 text-[var(--foreground)]">{title}</h2>
                <p className="text-[var(--muted-foreground)] mb-8">{movie.year} • {movie.rating}/10</p>

                <div className="flex flex-col gap-4">
                    {finalLink ? (
                        <a
                            href={finalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-full py-4 rounded-2xl bg-[var(--secondary)] text-[var(--background)] font-bold shadow-[var(--shadow-neon-cyan)] hover:brightness-110 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                        >
                            <Play size={18} className="inline-block mr-1.5 -mt-0.5" aria-hidden /> {language === 'es' ? 'Ver en' : 'Watch on'} {providerDisplay}
                        </a>
                    ) : (
                        <div className="py-4 px-4 border-2 border-dashed border-[var(--border)] rounded-xl text-[var(--muted-foreground)]">
                            {language === 'es' ? 'No disponible en tus plataformas' : 'Not available on your platforms'}
                        </div>
                    )}

                    <Link
                        href="/"
                        className="mt-2 text-[var(--muted-foreground)] text-sm font-medium hover:text-[var(--foreground)] transition-colors"
                    >
                        {t.keepPlaying}
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function MatchPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                <p className="text-[var(--muted-foreground)]">Loading...</p>
            </div>
        }>
            <MatchContent />
        </Suspense>
    );
}
