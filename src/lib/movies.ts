import { TMDB_GENRES } from '@/lib/constants';
import type { AppLanguage, ContentType, Movie, TMDBDetails, TMDBListItem } from '@/types';

export type PosterSize = 'w200' | 'w342' | 'w500' | 'original';

const IMAGE_BASE = 'https://image.tmdb.org/t/p';

/** URL completa del póster de TMDB ('' si no hay póster) */
export function posterUrl(path: string | null | undefined, size: PosterSize = 'w500'): string {
    return path ? `${IMAGE_BASE}/${size}${path}` : '';
}

/** Géneros exclusivos de series en TMDB (los de películas están en TMDB_GENRES) */
const TV_GENRES: Record<number, { es: string; en: string }> = {
    10759: { es: 'Acción y aventura', en: 'Action & Adventure' },
    10762: { es: 'Infantil', en: 'Kids' },
    10763: { es: 'Noticias', en: 'News' },
    10764: { es: 'Reality', en: 'Reality' },
    10765: { es: 'Ciencia ficción y fantasía', en: 'Sci-Fi & Fantasy' },
    10766: { es: 'Telenovela', en: 'Soap' },
    10767: { es: 'Talk show', en: 'Talk' },
    10768: { es: 'Bélica y política', en: 'War & Politics' },
};

/** Nombre de un género de TMDB en el idioma de la app ('' si es desconocido) */
export function genreName(id: number, language: AppLanguage): string {
    const movieGenre = TMDB_GENRES.find(g => g.id === id);
    if (movieGenre) return language === 'es' ? movieGenre.name : movieGenre.name_en;
    return TV_GENRES[id]?.[language] ?? '';
}

/** Año de una fecha 'YYYY-MM-DD' de TMDB (0 si no hay fecha) */
export function yearFromDate(date: string | undefined): number {
    const year = date ? Number.parseInt(date.slice(0, 4), 10) : NaN;
    return Number.isFinite(year) ? year : 0;
}

/** Alfabetos que la interfaz (español / inglés) no puede mostrar como título sin traducir */
const NON_LATIN_TITLE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Thai}\p{Script=Devanagari}]/u;

/**
 * Si un resultado de TMDB se puede mostrar en una tarjeta: necesita póster y un título legible.
 * TMDB devuelve el título original cuando no hay traducción (p. ej. en chino o coreano).
 */
export function isShowable(item: Pick<TMDBListItem, 'poster_path' | 'title' | 'name'>): boolean {
    const title = item.title || item.name || '';
    return !!item.poster_path && title.trim() !== '' && !NON_LATIN_TITLE.test(title);
}

/** Convierte un resultado de TMDB (listado o detalle) en una Movie de la app */
export function tmdbItemToMovie(
    item: TMDBListItem | TMDBDetails,
    type: ContentType,
    language: AppLanguage,
): Movie {
    const genreIds = 'genre_ids' in item && item.genre_ids
        ? item.genre_ids
        : ('genres' in item && item.genres ? item.genres.map(g => g.id) : []);

    return {
        id: String(item.id),
        type,
        title: item.title || item.name || '',
        year: yearFromDate(item.release_date || item.first_air_date),
        rating: item.vote_average ?? 0,
        image: posterUrl(item.poster_path),
        synopsis: item.overview ?? '',
        genres: genreIds.map(id => genreName(id, language)).filter(Boolean),
    };
}

/** Título a mostrar (las películas antiguas guardadas pueden traer title_es) */
export function getLocalizedTitle(movie: Movie, language: AppLanguage): string {
    return language === 'es' && movie.title_es ? movie.title_es : movie.title;
}

/** Sinopsis a mostrar */
export function getLocalizedSynopsis(movie: Movie, language: AppLanguage): string {
    return language === 'es' && movie.synopsis_es ? movie.synopsis_es : movie.synopsis;
}

/** Año para mostrar en pantalla ("—" si es desconocido) */
export function formatYear(year: number): string {
    return year > 0 ? String(year) : '—';
}
