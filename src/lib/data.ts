import { discover } from '@/services/tmdb';
import { isShowable, tmdbItemToMovie } from '@/lib/movies';
import { shuffle } from '@/lib/random';
import { toTmdbLang } from '@/lib/region';
import type { AppLanguage, ContentType, Movie } from '@/types';

export interface FeedOptions {
    /** IDs principales de plataforma (p. ej. ['8', '337']) */
    platforms: string[];
    types: ContentType[];
    region: string;
    /** IDs de género de TMDB (OR) */
    genreIds?: string[];
    /** IDs ya mostrados en esta sesión: se excluyen */
    seenIds?: string[];
    language: AppLanguage;
}

/** Páginas de TMDB por petición y tamaño del pool del que se eligen al azar */
const PAGES_PER_BATCH = 4;
const FIRST_POOL = 10;
const MAX_POOL = 30;

function pickPages(count: number, from: number, to: number): number[] {
    const pool = Array.from({ length: to - from + 1 }, (_, i) => from + i);
    return shuffle(pool).slice(0, count);
}

async function fetchBatch(options: FeedOptions, pages: number[]): Promise<Movie[]> {
    const { platforms, types, region, genreIds = [], seenIds = [], language } = options;
    const seen = new Set(seenIds);

    const responses = await Promise.all(
        types.flatMap(type =>
            pages.map(page =>
                discover(type, {
                    language: toTmdbLang(language),
                    watch_region: region,
                    page,
                    providers: platforms,
                    with_genres: genreIds.length ? genreIds.join('|') : undefined,
                }).then(results => ({ type, results })),
            ),
        ),
    );

    const unique = new Map<string, Movie>();
    responses.forEach(({ type, results }) => {
        results.forEach(item => {
            const id = String(item.id);
            if (seen.has(id) || unique.has(id) || !isShowable(item)) return;
            unique.set(id, tmdbItemToMovie(item, type, language));
        });
    });
    return shuffle([...unique.values()]);
}

/**
 * Contenido para el feed de swipe según las preferencias del usuario.
 * Pide páginas aleatorias del top de popularidad para que cada sesión sea distinta;
 * si todo lo devuelto ya se ha visto, amplía a páginas más profundas.
 * Devuelve [] si no queda nada nuevo.
 */
export async function getMovies(options: FeedOptions): Promise<Movie[]> {
    const firstBatch = await fetchBatch(options, pickPages(PAGES_PER_BATCH, 1, FIRST_POOL));
    if (firstBatch.length > 0) return firstBatch;
    return fetchBatch(options, pickPages(PAGES_PER_BATCH, FIRST_POOL + 1, MAX_POOL));
}
