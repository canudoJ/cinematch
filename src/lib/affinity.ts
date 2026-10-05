import type { ContentType, Deck, Movie } from '@/types';

/** Respuestas del test de afinidad */
export interface AffinityAnswers {
    vibe: 'cry' | 'laugh' | 'tension' | 'adrenaline';
    style: 'real' | 'animation' | 'mixed';
    brain: 'zombie' | 'casual' | 'sherlock';
    duration: 'short' | 'movie' | 'binge';
    quality: 'gourmet' | 'blockbuster' | 'trash';
}

export type AffinityQuestionId = keyof AffinityAnswers;

/** Parámetros de /discover (nombres de TMDB) que salen de las respuestas */
export interface AffinityQuery {
    type: ContentType;
    with_genres?: string;
    without_genres?: string;
    sort_by: string;
    'with_runtime.gte'?: number;
    'with_runtime.lte'?: number;
    'vote_average.gte'?: number;
    'vote_average.lte'?: number;
    'vote_count.gte': number;
}

const ANIMATION = '16';

const VIBE_GENRES: Record<AffinityAnswers['vibe'], string[]> = {
    cry: ['18', '10752'], // drama, bélica
    laugh: ['35'], // comedia
    tension: ['53', '9648'], // suspense, misterio
    adrenaline: ['28', '12'], // acción, aventura
};

const BRAIN_GENRES: Record<AffinityAnswers['brain'], string[]> = {
    zombie: ['28', '35', '10751'], // acción, comedia, familiar
    casual: [],
    sherlock: ['9648', '53', '80', '878'], // misterio, suspense, crimen, ciencia ficción
};

/**
 * Traduce las respuestas a una búsqueda de TMDB.
 * Los géneros se combinan con OR ("|"): con AND (",") casi ninguna película
 * cumplía todos a la vez y el test acababa sin resultados.
 */
export function answersToQuery(a: AffinityAnswers): AffinityQuery {
    const type: ContentType = a.duration === 'binge' ? 'tv' : 'movie';
    const genres = [...new Set([...VIBE_GENRES[a.vibe], ...BRAIN_GENRES[a.brain]])];

    const query: AffinityQuery = {
        type,
        // Animación: se exige ese género; si no, vale cualquiera de los elegidos
        with_genres: a.style === 'animation' ? ANIMATION : genres.join('|'),
        without_genres: a.style === 'real' ? ANIMATION : undefined,
        sort_by: 'popularity.desc',
        'vote_count.gte': 50,
    };

    if (type === 'movie') {
        if (a.duration === 'short') query['with_runtime.lte'] = 90;
        if (a.duration === 'movie') {
            query['with_runtime.gte'] = 80;
            query['with_runtime.lte'] = 150;
        }
    }

    if (a.quality === 'gourmet') {
        query['vote_average.gte'] = 7;
        query['vote_count.gte'] = 200;
    } else if (a.quality === 'trash') {
        query['vote_average.lte'] = 6;
        query.sort_by = 'vote_count.desc';
    }
    return query;
}

/** Baraja temporal del test (no se guarda: solo vive mientras se juega) */
export function buildQuizDeck(
    movies: Movie[],
    labels: { title: string; description: string; creator: string; tag: string },
): Deck {
    return {
        // "temp-" marca la baraja como temporal (no se guarda ni se puede editar)
        id: `temp-${crypto.randomUUID()}`,
        creatorId: 'me',
        creatorName: labels.creator,
        title: labels.title,
        description: labels.description,
        items: movies.map(m => ({ id: m.id, type: m.type })),
        movies,
        moviesLoaded: true,
        isPublic: false,
        tags: [labels.tag],
        privacy: 'private',
        views: 0,
    };
}
