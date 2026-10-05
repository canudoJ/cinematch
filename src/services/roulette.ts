import { discover } from '@/services/tmdb';
import { getMovies } from '@/lib/data';
import { isShowable, tmdbItemToMovie } from '@/lib/movies';
import { shuffle } from '@/lib/random';
import { ROUND_SIZE, resolveMediaTypes } from '@/lib/roulette';
import { toTmdbLang } from '@/lib/region';
import type { AppLanguage, Deck, Movie, RouletteConfig } from '@/types';

/** Páginas de "Sorpréndeme": se elige una al azar del top para variar */
const SURPRISE_MAX_PAGE = 10;

/**
 * Baraja de una ronda de ruleta según la configuración de la sala.
 * Si el filtro elegido no devuelve nada, cae al feed general de esas plataformas.
 */
export async function buildRoundMovies(
    config: RouletteConfig,
    options: { deck?: Deck | null; language: AppLanguage; region: string },
): Promise<Movie[]> {
    const { deck, language, region } = options;

    if (config.sourceType === 'deck') {
        return shuffle(deck?.movies ?? []).slice(0, ROUND_SIZE);
    }

    const types = resolveMediaTypes(config.mediaType);
    const page = config.sourceType === 'surprise' ? Math.floor(Math.random() * SURPRISE_MAX_PAGE) + 1 : 1;
    const results = await Promise.all(
        types.map(type =>
            discover(type, {
                language: toTmdbLang(language),
                watch_region: region,
                page,
                providers: config.providers,
                with_genres: config.sourceType === 'genre' ? config.sourceValue.split(',').join('|') : undefined,
                'vote_average.gte': config.minRating || undefined,
                'vote_count.gte': config.minRating ? 100 : undefined,
            }).then(items => items.filter(isShowable).map(i => tmdbItemToMovie(i, type, language))),
        ),
    );

    const movies = shuffle(results.flat()).slice(0, ROUND_SIZE);
    if (movies.length > 0) return movies;

    const fallback = await getMovies({ platforms: config.providers, types, region, language });
    return fallback.slice(0, ROUND_SIZE);
}
