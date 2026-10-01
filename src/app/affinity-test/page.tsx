'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDecks } from '@/context/DeckContext';
import { useLanguage } from '@/context/LanguageContext';
import { discoverContent, TMDBItem } from '@/services/tmdb';
import { Movie } from '@/lib/data';
import BackButton from '@/components/ui/BackButton';
import { useToast } from '@/components/ui/Toast';
import {
    Frown, Laugh, AlertTriangle, Zap, Film, Palette, Dices, Brain, Heart, Search,
    Timer, Tv, Wine, Building2, Trash2, Sparkles, type LucideIcon
} from 'lucide-react';

// --- TYPES ---
type QuestionId = 'vibe' | 'style' | 'brain' | 'duration' | 'quality';

const AFFINITY_ICONS: Record<string, LucideIcon> = {
    Frown, Laugh, AlertTriangle, Zap, Film, Palette, Dices, Brain, Heart, Search,
    Timer, Tv, Wine, Building2, Trash2
};

interface QuizOption {
    label: string;
    iconName: keyof typeof AFFINITY_ICONS;
    value: string;
    color: string;
}

interface Question {
    id: QuestionId;
    title: string;
    options: QuizOption[];
}

// --- NEW QUESTIONS CONFIG (UI) ---
const QUESTIONS: Question[] = [
    {
        id: 'vibe',
        title: "¿Mood de hoy?",
        options: [
            { label: 'cry', iconName: 'Frown', value: 'cry', color: '#6c5ce7' },
            { label: 'laugh', iconName: 'Laugh', value: 'laugh', color: '#fab1a0' },
            { label: 'tension', iconName: 'AlertTriangle', value: 'tension', color: '#0984e3' },
            { label: 'adrenaline', iconName: 'Zap', value: 'adrenaline', color: '#ff7675' }
        ]
    },
    {
        id: 'style',
        title: "¿Mundo visual?",
        options: [
            { label: 'Carne y Hueso', iconName: 'Film', value: 'real', color: '#636e72' },
            { label: 'Píxeles y Tinta', iconName: 'Palette', value: 'animation', color: '#00b894' },
            { label: 'Sorpréndeme', iconName: 'Dices', value: 'mixed', color: '#a29bfe' }
        ]
    },
    {
        id: 'brain',
        title: "¿Nivel de atención?",
        options: [
            { label: 'Modo Zombi', iconName: 'Brain', value: 'zombie', color: '#fd79a8' },
            { label: 'Tranqui', iconName: 'Heart', value: 'casual', color: '#74b9ff' },
            { label: 'Sherlock', iconName: 'Search', value: 'sherlock', color: '#6c5ce7' }
        ]
    },
    {
        id: 'duration',
        title: "¿Cuánto tiempo tienes?",
        options: [
            { label: 'Cortita (<90m)', iconName: 'Timer', value: 'short', color: '#00cec9' },
            { label: 'Peli Estándar', iconName: 'Film', value: 'movie', color: '#55efc4' },
            { label: 'Maratón Serie', iconName: 'Tv', value: 'binge', color: '#fdcb6e' }
        ]
    },
    {
        id: 'quality',
        title: "¿Tu paladar hoy?",
        options: [
            { label: 'Gourmet / Culto', iconName: 'Wine', value: 'gourmet', color: '#d63031' },
            { label: 'Blockbuster', iconName: 'Building2', value: 'blockbuster', color: '#ffeaa7' },
            { label: 'Placer Culposo', iconName: 'Trash2', value: 'trash', color: '#b2bec3' }
        ]
    }
];

export default function AffinityPage() {
    const router = useRouter();
    const { saveDeck, setActiveDeck } = useDecks();
    const { showToast } = useToast();
    const { language } = useLanguage();
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    const currentQuestion = QUESTIONS[step];

    const handleAnswer = async (value: string) => {
        const newAnswers = { ...answers, [currentQuestion.id]: value };
        setAnswers(newAnswers);

        if (step < QUESTIONS.length - 1) {
            setStep(prev => prev + 1);
        } else {
            await generateDeck(newAnswers);
        }
    };

    const generateDeck = async (finalAnswers: Record<string, string>) => {
        setLoading(true);

        const mood = finalAnswers['vibe'];
        const style = finalAnswers['style'];
        const brain = finalAnswers['brain'];
        const duration = finalAnswers['duration'];
        const quality = finalAnswers['quality'];

        // --- MAPPING LOGIC ---

        let type: 'movie' | 'tv' = 'movie';
        if (duration === 'binge') type = 'tv';

        let withGenres: string[] = [];
        let withoutGenres: string[] = [];

        // 1. Mood Logic
        if (mood === 'cry') withGenres.push('18', '10752'); // Drama, War
        if (mood === 'laugh') withGenres.push('35'); // Comedy
        if (mood === 'tension') withGenres.push('53', '9648'); // Thriller, Mystery
        if (mood === 'adrenaline') withGenres.push('28', '12'); // Action, Adventure

        // 2. Style Logic
        if (style === 'animation') withGenres.push('16');
        if (style === 'real') withoutGenres.push('16'); // Exclude animation

        // 3. Brain Logic
        if (brain === 'zombie') {
            withGenres.push('28', '35', '10751'); // Action, Comedy, Family
            // Soft exclude heavy stuff? Maybe not strict exclude, but prioritize fun
        }
        if (brain === 'sherlock') {
            withGenres.push('9648', '53', '80', '878'); // Mystery, Thriller, Crime, Sci-Fi
        }

        // 4. Duration Logic
        let runtimeLte = undefined; // For movie
        let runtimeGte = undefined; // For movie

        if (duration === 'short') runtimeLte = '90';
        if (duration === 'movie') { runtimeLte = '150'; runtimeGte = '80'; }
        // For TV (binge), we don't strictly filter runtime per episode usually, but could filter by genre or total seasons?
        // TMDB discover/tv doesn't support 'runtime' well. We will ignore runtime for TV for now.

        // 5. Quality Logic
        let voteAverageGte = undefined;
        let voteAverageLte = undefined;
        let voteCountGte = '50'; // Base filter to avoid junk
        let sortBy = 'popularity.desc';

        if (quality === 'gourmet') {
            voteAverageGte = '7.0';
            voteCountGte = '200';
            // Boost Indie? TMDB doesn't have 'indie' genre. High rating is best proxy.
        }
        if (quality === 'blockbuster') {
            sortBy = 'popularity.desc';
            // Budget filter not available in discover easily, relying on popularity
        }
        if (quality === 'trash') {
            voteAverageLte = '6.0';
            sortBy = 'vote_count.desc'; // Popular trash? Or random?
        }

        // --- EXECUTE API ---
        const tmdbLang = language === 'es' ? 'es-ES' : 'en-US';
        const results = await discoverContent(type, {
            with_genres: withGenres.join(','),
            without_genres: withoutGenres.join(','),
            with_runtime_lte: type === 'movie' ? runtimeLte : undefined,
            with_runtime_gte: type === 'movie' ? runtimeGte : undefined,
            vote_average_gte: voteAverageGte,
            vote_average_lte: voteAverageLte,
            vote_count_gte: voteCountGte,
            sort_by: sortBy,
            lang: tmdbLang
        });

        if (results && results.length > 0) {
            const movies: Movie[] = results.slice(0, 15).map(item => ({
                id: item.id.toString(),
                type: type,
                title: type === 'movie' ? item.title! : item.name!,
                title_es: type === 'movie' ? item.title : item.name,
                year: new Date(item.release_date || item.first_air_date || Date.now()).getFullYear(),
                rating: item.vote_average,
                image: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
                synopsis: item.overview,
                synopsis_es: language === 'es' ? item.overview : '',
                genres: []
            }));

            const today = new Date().toLocaleDateString();
            // TEMPORARY DECK: Do not save to context/localStorage
            const tempId = `temp-${Date.now()}`;

            const newDeck = {
                id: tempId,
                creatorId: 'me',
                creatorName: 'Tú',
                title: `Match ${quality} ${today}`,
                description: `Mood: ${mood} • ${type === 'movie' ? 'Peli' : 'Serie'} • ${style}`,
                movies: movies,
                tags: ['Quiz', mood],
                likes: 0,
                isPublic: false,
                isOfficial: false,
                privacy: 'private' as const
            };

            // NO GUARDAR: Este es un deck temporal del modo de juego, no debe guardarse en la base de datos
            // Solo establecerlo como activeDeck para visualización temporal
            setActiveDeck(newDeck);
            router.push('/');

        } else {
            showToast("No se encontraron pelis con esos filtros tan específicos :( Intenta relajar tus estándares.", 'info');
            setLoading(false);
            setStep(0);
        }
    };

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'black', color: 'white' }}>
                <Sparkles size={64} className="animate-spin-slow text-[var(--secondary)] mx-auto mb-5" aria-hidden />
                <h2>Cocinando tu cartelera...</h2>
            </div>
        );
    }

    return (
        <div style={{
            height: '100vh',
            background: 'var(--background)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {/* BACK BUTTON */}
            <BackButton className="absolute top-5 left-5" />

            {/* PROGRESS (Shifted down) */}
            <div style={{ position: 'absolute', top: 80, left: 20, right: 20, display: 'flex', gap: '5px' }}>
                {QUESTIONS.map((_, i) => (
                    <div key={i} style={{
                        flex: 1,
                        height: '6px',
                        borderRadius: '3px',
                        background: i <= step ? 'var(--secondary)' : 'var(--card)',
                        transition: 'background 0.3s'
                    }} />
                ))}
            </div>

            <div className="animate-fade-in" key={step} style={{ width: '100%', maxWidth: '500px', textAlign: 'center' }}>
                <h1 style={{ marginBottom: '40px', fontSize: '2rem' }}>{currentQuestion.title}</h1>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px' }}>
                    {currentQuestion.options.map((opt, i) => (
                        <button
                            key={i}
                            onClick={() => handleAnswer(opt.value)}
                            style={{
                                background: 'var(--card)',
                                border: `2px solid ${opt.color}`,
                                borderRadius: '20px',
                                padding: '20px 10px',
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '10px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            {AFFINITY_ICONS[opt.iconName] && React.createElement(AFFINITY_ICONS[opt.iconName], { size: 48, style: { flexShrink: 0 }, 'aria-hidden': true })}
                            <span style={{ fontWeight: 'bold', fontSize: '1rem', color: 'white' }}>{opt.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
