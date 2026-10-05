'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Frown, Laugh, AlertTriangle, Zap, Film, Palette, Dices, Brain, Heart, Search,
    Timer, Tv, Wine, Building2, Popcorn, Sparkles, type LucideIcon,
} from 'lucide-react';
import { useDecks } from '@/context/DeckContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import { discover } from '@/services/tmdb';
import { tmdbItemToMovie } from '@/lib/movies';
import { getUserRegion, toTmdbLang } from '@/lib/region';
import { answersToQuery, buildQuizDeck, type AffinityAnswers, type AffinityQuestionId } from '@/lib/affinity';
import { GameHeader } from '@/components/layout/GameHeader';
import type { Translations } from '@/i18n/es';

/** Títulos de la baraja que genera el test */
const QUIZ_DECK_SIZE = 15;

interface Question<K extends AffinityQuestionId = AffinityQuestionId> {
    id: K;
    options: { value: AffinityAnswers[K]; icon: LucideIcon }[];
}

const QUESTIONS: Question[] = [
    { id: 'vibe', options: [{ value: 'cry', icon: Frown }, { value: 'laugh', icon: Laugh }, { value: 'tension', icon: AlertTriangle }, { value: 'adrenaline', icon: Zap }] },
    { id: 'style', options: [{ value: 'real', icon: Film }, { value: 'animation', icon: Palette }, { value: 'mixed', icon: Dices }] },
    { id: 'brain', options: [{ value: 'zombie', icon: Brain }, { value: 'casual', icon: Heart }, { value: 'sherlock', icon: Search }] },
    { id: 'duration', options: [{ value: 'short', icon: Timer }, { value: 'movie', icon: Film }, { value: 'binge', icon: Tv }] },
    { id: 'quality', options: [{ value: 'gourmet', icon: Wine }, { value: 'blockbuster', icon: Building2 }, { value: 'trash', icon: Popcorn }] },
];

/** Cada opción toma un color de marca, en orden */
const OPTION_COLORS = ['var(--primary)', 'var(--secondary)', 'var(--accent-mid)', 'var(--warning)'];

type TextKey = keyof Translations;
const questionText = (t: Translations, id: AffinityQuestionId) => t[`quiz_${id}` as TextKey] as string;
const optionText = (t: Translations, id: AffinityQuestionId, value: string) => t[`quiz_${id}_${value}` as TextKey] as string;

export default function AffinityPage() {
    const router = useRouter();
    const { setActiveDeck } = useDecks();
    const { showToast } = useToast();
    const { t, language } = useLanguage();
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<Partial<AffinityAnswers>>({});
    const [loading, setLoading] = useState(false);

    const question = QUESTIONS[step];

    const generateDeck = async (final: AffinityAnswers) => {
        setLoading(true);
        const { type, ...params } = answersToQuery(final);
        const items = await discover(type, { ...params, language: toTmdbLang(language), watch_region: getUserRegion() });
        const movies = items.filter(i => i.poster_path).slice(0, QUIZ_DECK_SIZE).map(i => tmdbItemToMovie(i, type, language));

        if (movies.length === 0) {
            showToast(t.quizNoResults, 'info');
            setLoading(false);
            setStep(0);
            setAnswers({});
            return;
        }

        const mood = optionText(t, 'vibe', final.vibe);
        setActiveDeck(buildQuizDeck(movies, {
            title: t.quizDeckTitle(mood),
            description: [mood, optionText(t, 'style', final.style), type === 'movie' ? t.movies : t.tvShows].join(' · '),
            creator: t.youLabel,
            tag: t.quizTag,
        }));
        router.push('/');
    };

    const handleAnswer = (value: string) => {
        const next = { ...answers, [question.id]: value };
        setAnswers(next);
        if (step < QUESTIONS.length - 1) setStep(step + 1);
        else void generateDeck(next as AffinityAnswers);
    };

    if (loading) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-[var(--background)]" role="status">
                <Sparkles size={64} className="animate-spin-slow text-[var(--secondary)]" aria-hidden />
                <h2 className="title-section">{t.quizCooking}</h2>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col bg-[var(--background)]">
            <GameHeader mode="iceBreaker" title={t.iceBreakerTitle} />

            <div
                className="mx-auto flex w-full max-w-[500px] gap-1.5 px-5"
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={QUESTIONS.length}
                aria-valuenow={step + 1}
                aria-label={t.quizProgress(step + 1, QUESTIONS.length)}
            >
                {QUESTIONS.map((q, i) => (
                    <div key={q.id} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-[var(--primary)]' : 'bg-[var(--border-strong)]'}`} />
                ))}
            </div>

            <div className="flex flex-1 flex-col items-center justify-center p-5">
                <div key={step} className="w-full max-w-[500px] text-center animate-fade-in">
                    <h2 className="title-page mb-10">{questionText(t, question.id)}</h2>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4">
                        {question.options.map((option, i) => {
                            const Icon = option.icon;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleAnswer(option.value)}
                                    className="flex flex-col items-center gap-2.5 rounded-[20px] border-2 bg-[var(--card)] px-2.5 py-5 transition-transform hover:scale-105"
                                    style={{ borderColor: OPTION_COLORS[i % OPTION_COLORS.length] }}
                                >
                                    <Icon size={48} className="shrink-0" style={{ color: OPTION_COLORS[i % OPTION_COLORS.length] }} aria-hidden />
                                    <span className="font-bold">{optionText(t, question.id, option.value)}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
