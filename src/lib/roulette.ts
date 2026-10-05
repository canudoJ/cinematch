import type { ContentType, Movie, RouletteMediaType } from '@/types';

/** Duración de una ronda de swipe */
export const ROUND_SECONDS = 60;
/** Títulos por ronda */
export const ROUND_SIZE = 30;
/** Gajos máximos de la ruleta: con más, los pósters y títulos no caben */
export const MAX_WHEEL_SLOTS = 8;
/** Duración de la animación del giro (debe coincidir con la transición CSS de la ruleta) */
export const SPIN_DURATION_MS = 4000;

export interface VoteRow {
    movie_id: string;
    user_id: string;
}

/** Tipos de contenido a pedir según la opción elegida ("Ambos" = películas y series) */
export function resolveMediaTypes(mediaType: RouletteMediaType): ContentType[] {
    return mediaType === 'both' ? ['movie', 'tv'] : [mediaType];
}

/**
 * Películas que han gustado a TODOS los jugadores actuales.
 * Solo cuentan los votos de quien sigue en la sala (si alguien se fue, no bloquea el match).
 */
export function computeUnanimousMatches(likes: VoteRow[], memberIds: string[], movies: Movie[]): Movie[] {
    if (memberIds.length === 0) return [];
    const members = new Set(memberIds);
    const likesByMovie = new Map<string, Set<string>>();
    likes.forEach(({ movie_id, user_id }) => {
        if (!members.has(user_id)) return;
        const voters = likesByMovie.get(movie_id) ?? new Set<string>();
        voters.add(user_id);
        likesByMovie.set(movie_id, voters);
    });
    return movies.filter(m => (likesByMovie.get(m.id)?.size ?? 0) >= members.size);
}

/** Las coincidencias que entran en la ruleta: las mejor valoradas (a igual nota, en el orden de la ronda) */
export function wheelCandidates(matches: Movie[], max = MAX_WHEEL_SLOTS): Movie[] {
    if (matches.length <= max) return matches;
    return matches
        .map((movie, index) => ({ movie, index }))
        .sort((a, b) => b.movie.rating - a.movie.rating || a.index - b.index)
        .slice(0, max)
        .map(({ movie }) => movie);
}

/**
 * Grados de giro para que el centro del gajo ganador quede bajo el puntero (arriba),
 * con varias vueltas completas para que el giro se vea largo.
 */
export function spinRotationFor(winnerIndex: number, sliceCount: number, fullTurns = 8): number {
    const slice = 360 / sliceCount;
    return fullTurns * 360 + (360 - (winnerIndex * slice + slice / 2));
}

/** Segundos que quedan hasta `endsAt` (nunca negativo) */
export function secondsLeft(endsAt: number | null | undefined, now: number): number {
    if (!endsAt) return 0;
    return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

/** "1:05" */
export function formatCountdown(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
