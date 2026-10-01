import { PROVIDER_MAPPING } from '@/lib/constants';

export interface TMDBItem {
    id: number;
    title?: string;
    name?: string;
    poster_path: string;
    overview: string;
    release_date?: string;
    first_air_date?: string;
    vote_average: number;
    genre_ids: number[];
}

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

export async function fetchContent(
    type: 'movie' | 'tv',
    region: string = 'ES',
    providerIds: string[],
    page: number = 1,
    genreIds: string[] = [],
    lang?: string
) {
    if (!TMDB_API_KEY) return null;

    const processedIds = providerIds.flatMap(id => {
        if (id === '384' || id === '118') {
            return PROVIDER_MAPPING['HBO Max'].map(String);
        }
        return [id];
    });
    const providersString = processedIds.join('|');
    const genresString = genreIds.join('|');

    const endpoint = type === 'movie' ? 'discover/movie' : 'discover/tv';
    const url = new URL(`${BASE_URL}/${endpoint}`);
    url.searchParams.append('api_key', TMDB_API_KEY);
    url.searchParams.append('language', lang ?? (region === 'ES' ? 'es-ES' : 'en-US'));
    url.searchParams.append('sort_by', 'popularity.desc');
    url.searchParams.append('watch_region', region);
    if (providersString) url.searchParams.append('with_watch_providers', providersString);
    if (genresString) url.searchParams.append('with_genres', genresString);
    url.searchParams.append('page', page.toString());

    try {
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('TMDB Fetch Failed');
        const data = await res.json();
        return data.results as TMDBItem[];
    } catch { return null; }
}

export async function searchContent(query: string, type: 'movie' | 'tv' = 'movie') {
    if (!TMDB_API_KEY || !query) return [];
    const endpoint = type === 'movie' ? 'search/movie' : 'search/tv';
    const url = new URL(`${BASE_URL}/${endpoint}`);
    url.searchParams.append('api_key', TMDB_API_KEY);
    url.searchParams.append('language', 'es-ES');
    url.searchParams.append('query', query);
    url.searchParams.append('page', '1');
    try {
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        return data.results as TMDBItem[];
    } catch { return []; }
}

export async function fetchDetails(id: string, type: 'movie' | 'tv') {
    if (!TMDB_API_KEY) return null;
    try {
        const res = await fetch(`${BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&language=es-ES`);
        if (!res.ok) return null;
        return await res.json() as TMDBItem;
    } catch { return null; }
}

export const PROVIDER_NAMES: Record<string, string> = {
    '8':    'Netflix',
    '119':  'Prime Video',
    '337':  'Disney+',
    '384':  'Max',
    '118':  'Max',
    '1796': 'Max',
    '1899': 'Max',
    '283':  'Crunchyroll',
    '2':    'Apple TV+',
    '350':  'Apple TV+',
    '149':  'Filmin',
    '167':  'Movistar+',
};

/**
 * Construye una URL de búsqueda en la plataforma a partir del nombre del proveedor.
 * Se usa cuando JustWatch GraphQL no devuelve link directo.
 * Crunchyroll se trata aquí porque NO está indexado en JustWatch.
 */
export function buildPlatformSearchUrl(providerName: string, title: string): string {
    const q = encodeURIComponent(title);
    const n = providerName.toLowerCase();

    if (n.includes('netflix'))              return `https://www.netflix.com/search?q=${q}`;
    if (n.includes('prime') || n.includes('amazon')) return `https://www.primevideo.com/search?phrase=${q}`;
    if (n.includes('disney'))              return `https://www.disneyplus.com/search/${q}`;
    if (n.includes('max') || n.includes('hbo')) return `https://www.max.com/search?q=${q}`;
    if (n.includes('crunchyroll'))         return `https://www.crunchyroll.com/search?q=${q}`;
    if (n.includes('apple'))               return `https://tv.apple.com/search?term=${q}`;
    if (n.includes('filmin'))              return `https://www.filmin.es/buscar?q=${q}`;
    if (n.includes('movistar'))            return `https://ver.movistarplus.es/busqueda/?q=${q}`;

    // Fallback genérico con Google
    return `https://www.google.com/search?q=ver+${q}+en+${encodeURIComponent(providerName)}`;
}

export interface WatchLinkResult {
    link: string | null;
    providerName: string | null;
    /** Lista de plataformas con search URL propia (nunca JustWatch page) */
    providers: { name: string; link: string }[];
    /** Link de JustWatch del contenido concreto (para usarlo solo como fuente de datos) */
    justwatchLink: string | null;
}

/**
 * Obtiene las plataformas donde se puede ver un título.
 * - `providers[].link` → URL de búsqueda directa en la plataforma (no JustWatch)
 * - `justwatchLink`   → URL de JustWatch del contenido (solo como fuente de verdad extra)
 */
export async function getWatchLink(
    id: string,
    type: 'movie' | 'tv',
    preferredProviderIds: string[] = [],
    region: string = 'ES',
    title?: string
): Promise<WatchLinkResult> {
    if (!TMDB_API_KEY) return { link: null, providerName: null, providers: [], justwatchLink: null };

    try {
        const res = await fetch(`${BASE_URL}/${type}/${id}/watch/providers?api_key=${TMDB_API_KEY}`);
        const data = await res.json();
        const results = data.results?.[region] || data.results?.US;

        if (!results) return { link: null, providerName: null, providers: [], justwatchLink: null };

        const justwatchLink: string | null = results.link || null;
        const allProviders: any[] = results.flatrate || [];

        // Search URLs por plataforma — nunca JustWatch page como destino
        const seen = new Set<string>();
        const availableProviders = allProviders
            .map((p: any) => {
                const name = PROVIDER_NAMES[p.provider_id.toString()] || p.provider_name;
                return {
                    name,
                    link: title
                        ? buildPlatformSearchUrl(name, title)
                        : (justwatchLink ?? `https://www.google.com/search?q=ver+${encodeURIComponent(title ?? name)}+online`),
                };
            })
            .filter(p => {
                if (seen.has(p.name)) return false;
                seen.add(p.name);
                return true;
            });

        const expandedPreferred = preferredProviderIds.flatMap(pid =>
            (pid === '384' || pid === '118') ? ['384', '118', '1796'] : [pid]
        );
        const match = allProviders.find((p: any) => expandedPreferred.includes(p.provider_id.toString()));
        const best = match || (allProviders.length > 0 ? allProviders[0] : null);

        const mainName = best
            ? (PROVIDER_NAMES[best.provider_id.toString()] || best.provider_name)
            : null;
        const mainLink = (mainName && title)
            ? buildPlatformSearchUrl(mainName, title)
            : justwatchLink;

        return { link: mainLink, providerName: mainName, providers: availableProviders, justwatchLink };

    } catch {
        return { link: null, providerName: null, providers: [], justwatchLink: null };
    }
}

// Advanced Discover for Affinity Test
export async function discoverContent(type: 'movie' | 'tv', params: {
    with_genres?: string;
    without_genres?: string;
    release_date_gte?: string;
    release_date_lte?: string;
    with_runtime_lte?: string;
    with_runtime_gte?: string;
    sort_by?: string;
    vote_count_gte?: string;
    vote_average_gte?: string;
    vote_average_lte?: string;
    with_watch_providers?: string;
    watch_region?: string;
    page?: number;
    lang?: string;
}) {
    if (!TMDB_API_KEY) return [];

    const endpoint = type === 'movie' ? 'discover/movie' : 'discover/tv';
    const url = new URL(`${BASE_URL}/${endpoint}`);
    url.searchParams.append('api_key', TMDB_API_KEY);
    url.searchParams.append('language', params.lang ?? 'es-ES');
    url.searchParams.append('sort_by', params.sort_by || 'popularity.desc');
    url.searchParams.append('watch_region', params.watch_region || 'ES');

    if (params.with_genres) url.searchParams.append('with_genres', params.with_genres);
    if (params.without_genres) url.searchParams.append('without_genres', params.without_genres);
    if (params.with_watch_providers) url.searchParams.append('with_watch_providers', params.with_watch_providers);

    const dateField = type === 'movie' ? 'primary_release_date' : 'first_air_date';
    if (params.release_date_gte) url.searchParams.append(`${dateField}.gte`, params.release_date_gte);
    if (params.release_date_lte) url.searchParams.append(`${dateField}.lte`, params.release_date_lte);
    if (params.with_runtime_lte) url.searchParams.append('with_runtime.lte', params.with_runtime_lte);
    if (params.with_runtime_gte) url.searchParams.append('with_runtime.gte', params.with_runtime_gte);
    if (params.vote_count_gte) url.searchParams.append('vote_count.gte', params.vote_count_gte);
    if (params.vote_average_gte) url.searchParams.append('vote_average.gte', params.vote_average_gte);
    if (params.vote_average_lte) url.searchParams.append('vote_average.lte', params.vote_average_lte);
    url.searchParams.append('page', (params.page || 1).toString());

    try {
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Discover failed');
        const data = await res.json();
        return data.results as TMDBItem[];
    } catch { return []; }
}
