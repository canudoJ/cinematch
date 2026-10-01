'use client';

import { useState, useEffect } from 'react';
import { useUser, ContentType } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

import { PROVIDERS, TMDB_GENRES } from '@/lib/constants';
import { useSwipeSession } from '@/context/SwipeSessionContext';

import BackButton from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Film, Tv } from 'lucide-react';

export default function SetupPage() {
    const { platforms, updatePlatforms, toggleContentType, contentTypes, preferredGenres, updatePreferredGenres } = useUser();
    const { language, t } = useLanguage();
    const router = useRouter();
    const { resetSession } = useSwipeSession();

    // Local state for UI — initialized from context (may arrive async from Supabase)
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(platforms);
    const [selectedGenres, setSelectedGenres] = useState<string[]>(preferredGenres);

    // Sync once context finishes loading preferences from Supabase
    useEffect(() => {
        setSelectedPlatforms(platforms);
    }, [platforms]);

    useEffect(() => {
        setSelectedGenres(preferredGenres);
    }, [preferredGenres]);

    const toggleProvider = (id: string) => {
        setSelectedPlatforms(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const toggleGenre = (genreId: string) => {
        setSelectedGenres(prev =>
            prev.includes(genreId) ? prev.filter(g => g !== genreId) : [...prev, genreId]
        );
    };

    const handleContinue = () => {
        updatePlatforms(selectedPlatforms);
        updatePreferredGenres(selectedGenres);

        // Resetear la sesión de swipe para que el próximo mazo
        // se genere con los nuevos filtros.
        resetSession();

        router.push('/');
    };

    return (
        <main className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
            {/* Contenedor scrollable que llega ópticamente hasta el borde del BottomNav fijo */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                <div className="relative min-h-full flex flex-col items-center p-6 pb-28">
                    <div className="w-full max-w-[600px] animate-fade-in mt-4">
                        {/* Header: botón salir fijo a la izquierda y título centrado en la página */}
                        <div className="relative flex items-center justify-center">
                            <BackButton href="/" className="absolute left-0 z-10" />
                            <h1 className="mb-2 text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] text-center leading-tight px-12">
                                {t.yourPlatforms}
                            </h1>
                        </div>
                        <p className="text-[var(--muted-foreground)] mb-8 text-center">
                            {t.selectEverything}
                        </p>

                {/* Platforms Grid */}
                <div className="grid grid-cols-2 gap-4 mb-10">
                    {PROVIDERS.map(p => {
                        const isSelected = selectedPlatforms.includes(p.id);
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => toggleProvider(p.id)}
                                className="flex items-center justify-center h-20 rounded-2xl font-bold text-base transition-all border-2 text-white"
                                style={{
                                    background: isSelected ? p.color : 'var(--card)',
                                    borderColor: isSelected ? p.color : 'var(--border)',
                                    boxShadow: isSelected ? `0 0 20px ${p.color}40` : 'none'
                                }}
                            >
                                {p.name}
                            </button>
                        );
                    })}
                </div>

                {/* Content Type */}
                <div className="mb-8 p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
                    <h3 className="text-base font-bold mb-4 text-[var(--foreground)]">
                        {language === 'es' ? 'Tipo de Contenido' : 'Content Type'}
                    </h3>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => toggleContentType('movie')}
                            className={`flex-1 py-4 rounded-xl font-semibold transition-all border-2 text-white ${
                                contentTypes.includes('movie')
                                    ? 'bg-[var(--primary)] border-[var(--primary)] shadow-[var(--shadow-neon-pink)]'
                                    : 'bg-[var(--card)] border-[var(--border)] opacity-70 hover:opacity-90'
                            }`}
                        >
                            <Film size={20} className="inline-block mr-1.5 -mt-0.5" aria-hidden /> {t.movies}
                        </button>
                        <button
                            type="button"
                            onClick={() => toggleContentType('tv')}
                            className={`flex-1 py-4 rounded-xl font-semibold transition-all border-2 text-white ${
                                contentTypes.includes('tv')
                                    ? 'bg-[var(--secondary)] border-[var(--secondary)] shadow-[var(--shadow-neon-cyan)]'
                                    : 'bg-[var(--card)] border-[var(--border)] opacity-70 hover:opacity-90'
                            }`}
                        >
                            <Tv size={20} className="inline-block mr-1.5 -mt-0.5" aria-hidden /> {t.tvShows}
                        </button>
                    </div>
                </div>

                {/* Géneros Favoritos */}
                <div className="mb-10 p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
                    <h3 className="text-base font-bold mb-3 text-[var(--foreground)]">
                        {language === 'es' ? 'Géneros (Opcional)' : 'Genres (Optional)'}
                    </h3>
                    <p className="text-sm text-[var(--muted-foreground)] mb-4">
                        {language === 'es' ? 'Selecciona tus géneros favoritos para personalizar tus recomendaciones.' : 'Select your favorite genres to personalize your recommendations.'}
                    </p>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
                        {TMDB_GENRES.map(genre => {
                            const isSelected = selectedGenres.includes(genre.id.toString());
                            return (
                                <button
                                    key={genre.id}
                                    type="button"
                                    onClick={() => toggleGenre(genre.id.toString())}
                                    className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all border-2 text-center shadow-[0_0_0_1px_rgba(148,163,184,0.2)] ${
                                        isSelected
                                            ? 'bg-[var(--secondary)] border-[var(--secondary)] text-[var(--background)]'
                                            : 'bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] hover:border-[var(--muted-foreground)]/50'
                                    }`}
                                >
                                    {language === 'es' ? genre.name : genre.name_en}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <Button
                    onClick={handleContinue}
                    disabled={selectedPlatforms.length === 0 || contentTypes.length === 0}
                    className="w-full py-6 text-lg"
                >
                    {t.startPlaying}
                </Button>
                    </div>
                </div>
            </div>
        </main>
    );
}
