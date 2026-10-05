import { fetchDetails } from '@/services/tmdb';
import { tmdbItemToMovie } from '@/lib/movies';
import { toTmdbLang } from '@/lib/region';
import type { AppLanguage, Deck, DeckItemRef, DeckWithItems, Movie, Privacy, ProfileSummary } from '@/types';

/** Columnas de una baraja con sus títulos */
export const DECK_COLUMNS = 'id, user_id, title, description, tags, privacy, views, created_at, deck_items (movie_id, media_type)';

/** Portadas que se cargan para los listados (el collage muestra 4) */
export const PREVIEW_MOVIES = 4;

function normalizeTags(raw: unknown): string[] {
    if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
    if (typeof raw === 'string' && raw.trim()) return [raw];
    return [];
}

async function loadMovies(items: DeckItemRef[], language: AppLanguage): Promise<Movie[]> {
    const lang = toTmdbLang(language);
    const details = await Promise.all(items.map(item => fetchDetails(item.id, item.type, lang)));
    return details.flatMap((d, i) => (d ? [tmdbItemToMovie(d, items[i].type, language)] : []));
}

/**
 * Convierte una fila de `decks` (con deck_items) en un Deck de la app.
 * Con `full: false` solo trae las películas de portada; usar hydrateDeck para el resto.
 */
export async function buildDeck(
    row: DeckWithItems,
    creator: ProfileSummary | undefined,
    language: AppLanguage,
    { full = false }: { full?: boolean } = {},
): Promise<Deck> {
    const items: DeckItemRef[] = (row.deck_items ?? []).map(item => ({
        id: String(item.movie_id),
        type: item.media_type ?? 'movie',
    }));
    const toLoad = full ? items : items.slice(0, PREVIEW_MOVIES);
    const privacy: Privacy = row.privacy ?? 'private';

    return {
        id: row.id,
        creatorId: row.user_id,
        creatorName: creator?.username ?? '',
        creatorAvatar: creator?.avatar_url ?? undefined,
        title: row.title,
        description: row.description ?? '',
        tags: normalizeTags(row.tags),
        privacy,
        isPublic: privacy === 'public',
        views: row.views ?? 0,
        items,
        movies: await loadMovies(toLoad, language),
        moviesLoaded: toLoad.length === items.length,
    };
}

/** Completa las películas de una baraja de listado (los detalles salen de la caché si ya se pidieron) */
export async function hydrateDeck(deck: Deck, language: AppLanguage): Promise<Deck> {
    if (deck.moviesLoaded) return deck;
    return { ...deck, movies: await loadMovies(deck.items, language), moviesLoaded: true };
}
