'use client';

import { useEffect, useState } from 'react';
import { getWatchOptions, type WatchOptions } from '@/services/tmdb';
import { getUserRegion } from '@/lib/region';
import { useUser } from '@/context/UserContext';
import type { Movie } from '@/types';

type Target = Pick<Movie, 'id' | 'type' | 'title'>;

/**
 * Plataformas donde ver un título (con enlace directo si existe).
 * `options` es null mientras carga; las respuestas de títulos anteriores se descartan.
 */
export function useWatchOptions(movie: Target | null): { options: WatchOptions | null; loading: boolean } {
    const { platforms } = useUser();
    const [result, setResult] = useState<{ key: string; options: WatchOptions } | null>(null);
    const key = movie ? `${movie.type}/${movie.id}` : '';
    const id = movie?.id;
    const type = movie?.type;
    const title = movie?.title;

    useEffect(() => {
        if (!id || !type || !title) return;
        let cancelled = false;
        void getWatchOptions({ id, type, title }, getUserRegion(), platforms).then(options => {
            if (!cancelled) setResult({ key: `${type}/${id}`, options });
        });
        return () => {
            cancelled = true;
        };
    }, [id, type, title, platforms]);

    const options = result && result.key === key ? result.options : null;
    return { options, loading: !!movie && !options };
}
