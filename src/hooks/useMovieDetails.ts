'use client';

import { useEffect, useState } from 'react';
import { fetchDetails } from '@/services/tmdb';
import { toTmdbLang } from '@/lib/region';
import type { AppLanguage, ContentType, TMDBDetails } from '@/types';

export interface MovieExtraDetails {
    overview: string;
    genres: string[];
    runtime?: number;
    /** Dirección (películas) o creadores (series) */
    makers: string[];
    cast: string[];
    production: string[];
    seasons: { seasonNumber: number; episodeCount: number }[];
}

const MAX_CAST = 5;
const MAX_COMPANIES = 3;

export function parseDetails(data: TMDBDetails, type: ContentType): MovieExtraDetails {
    const makers = type === 'movie'
        ? (data.credits?.crew ?? []).filter(p => p.job === 'Director').map(p => p.name)
        : (data.created_by ?? []).map(p => p.name);
    return {
        overview: data.overview ?? '',
        genres: (data.genres ?? []).map(g => g.name),
        runtime: data.runtime || data.episode_run_time?.[0] || undefined,
        makers,
        cast: (data.credits?.cast ?? []).slice(0, MAX_CAST).map(a => a.name),
        production: (data.production_companies ?? []).slice(0, MAX_COMPANIES).map(c => c.name),
        seasons: (data.seasons ?? [])
            .filter(s => s.season_number > 0 && s.episode_count > 0)
            .map(s => ({ seasonNumber: s.season_number, episodeCount: s.episode_count })),
    };
}

/** Detalles ampliados de TMDB (reparto, dirección, temporadas…), con caché y cancelación */
export function useMovieDetails(id: string, type: ContentType, language: AppLanguage) {
    const key = `${type}/${id}/${language}`;
    const [result, setResult] = useState<{ key: string; details: MovieExtraDetails | null } | null>(null);

    useEffect(() => {
        let cancelled = false;
        void fetchDetails(id, type, toTmdbLang(language), { withCredits: true }).then(data => {
            if (!cancelled) setResult({ key: `${type}/${id}/${language}`, details: data ? parseDetails(data, type) : null });
        });
        return () => {
            cancelled = true;
        };
    }, [id, type, language]);

    const current = result?.key === key ? result : null;
    return { details: current?.details ?? null, loading: !current };
}
