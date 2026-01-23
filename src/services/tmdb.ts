import { PROVIDER_MAPPING } from '@/lib/constants';

export interface TMDBItem {
    id: number;
    title?: string;
    name?: string; // For TV
    poster_path: string;
    overview: string;
    release_date?: string;
    first_air_date?: string; // For TV
    vote_average: number;
    genre_ids: number[];
}

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

export async function fetchContent(
    type: 'movie' | 'tv',
    region: string = 'ES',
    providerIds: string[],
    page: number = 1
) {
    if (!TMDB_API_KEY) {
        console.warn('TMDB API Key missing. returns null');
        return null;
    }


    // Fix for HBO: Combine HBO Max (118), Max (384), and Max Amazon Channel (1796)
    // NOTE: The user requested [384, 1899]. We map specific visual IDs to this list.
    const processedIds = providerIds.flatMap(id => {
        // Check if this ID triggers a group in MAPPING
        if (id === '384' || id === '118') {
            return PROVIDER_MAPPING['HBO Max'].map(String);
        }
        return [id];
    });
    const providersString = processedIds.join('|');
    const endpoint = type === 'movie' ? 'discover/movie' : 'discover/tv';

    // URL params vary slightly between movie/tv
    const url = new URL(`${BASE_URL}/${endpoint}`);
    url.searchParams.append('api_key', TMDB_API_KEY);
    url.searchParams.append('language', region === 'ES' ? 'es-ES' : 'en-US');
    url.searchParams.append('sort_by', 'popularity.desc');
    url.searchParams.append('watch_region', region);
    if (providersString) {
        url.searchParams.append('with_watch_providers', providersString);
    }
    url.searchParams.append('page', page.toString());

    try {
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('TMDB Fetch Failed');
        const data = await res.json();
        return data.results as TMDBItem[];
    } catch (error) {
        console.error(error);
        return null;
    }
}


export async function searchContent(query: string, type: 'movie' | 'tv' = 'movie') {
    if (!TMDB_API_KEY || !query) return [];

    const endpoint = type === 'movie' ? 'search/movie' : 'search/tv';
    const url = new URL(`${BASE_URL}/${endpoint}`);
    url.searchParams.append('api_key', TMDB_API_KEY);
    url.searchParams.append('language', 'es-ES'); // Force Spanish for consistency
    url.searchParams.append('query', query);
    url.searchParams.append('page', '1');

    try {
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        return data.results as TMDBItem[];
    } catch (e) {
        console.error("Search error", e);
        return [];
    }
}

export async function fetchDetails(id: string, type: 'movie' | 'tv') {
    if (!TMDB_API_KEY) return null;
    try {
        const res = await fetch(`${BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&language=es-ES`);
        if (!res.ok) return null;
        return await res.json() as TMDBItem;
    } catch (e) {
        return null;
    }
}

// Helper map for fallback names
const PROVIDER_NAMES: Record<string, string> = {
    '8': 'Netflix',
    '119': 'Prime Video',
    '337': 'Disney+',
    '384': 'Max', // The new app
    '118': 'HBO Max', // Legacy/Europe
    '1796': 'HBO Max', // Map Amazon Channel to HBO Max for clarity (User Request)
    '283': 'Crunchyroll'
};

export interface WatchLinkResult {
    link: string | null;
    providerName: string | null;
    providers: { name: string; link: string }[];
}

// Updated to prioritize user's providers and Region
export async function getWatchLink(id: string, type: 'movie' | 'tv', preferredProviderIds: string[] = [], region: string = 'ES'): Promise<WatchLinkResult> {
    if (!TMDB_API_KEY) return { link: null, providerName: null, providers: [] };
    try {
        const res = await fetch(`${BASE_URL}/${type}/${id}/watch/providers?api_key=${TMDB_API_KEY}`);
        const data = await res.json();
        // Use provided region, fallback to US if not found.
        const results = data.results?.[region] || data.results?.US;

        // If no results at all, we can't confirm any provider.
        if (!results) {
            return { link: null, providerName: null, providers: [] };
        }

        const allProviders = results.flatrate || [];

        // Multi-Platform Support: Extract ALL valid flatrate providers
        const availableProviders = allProviders.map((p: any) => ({
            name: PROVIDER_NAMES[p.provider_id.toString()] || p.provider_name,
            link: p.link
        }));

        // Find if any of the user's preferred providers are in the list
        const expandedPreferred = preferredProviderIds.flatMap(id =>
            (id === '384' || id === '118') ? ['384', '118', '1796'] : [id]
        );
        const match = allProviders.find((p: any) => expandedPreferred.includes(p.provider_id.toString()));

        let result: WatchLinkResult = { link: null, providerName: null, providers: availableProviders };

        if (match) {
            const normalizedName = PROVIDER_NAMES[match.provider_id.toString()] || match.provider_name;
            result.link = match.link;
            result.providerName = normalizedName;
            return result;
        }

        // Return first available if no preference match
        if (allProviders.length > 0) {
            const bestAlternative = allProviders[0];
            const normalizedName = PROVIDER_NAMES[bestAlternative.provider_id.toString()] || bestAlternative.provider_name;
            result.link = bestAlternative.link;
            result.providerName = normalizedName;
            return result;
        }

        // NO MATCH ID FOUND (No flatrate options detected)
        // Return null providerName so it doesn't show up in specific filters.
        return result;

    } catch (e) {
        return { link: null, providerName: null, providers: [] };
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
    with_watch_providers?: string; // Add this
    watch_region?: string; // Add this
    page?: number;
}) {
    if (!TMDB_API_KEY) return [];

    const endpoint = type === 'movie' ? 'discover/movie' : 'discover/tv';
    const url = new URL(`${BASE_URL}/${endpoint}`);
    url.searchParams.append('api_key', TMDB_API_KEY);
    url.searchParams.append('language', 'es-ES');
    url.searchParams.append('sort_by', params.sort_by || 'popularity.desc');
    url.searchParams.append('watch_region', params.watch_region || 'ES');

    if (params.with_genres) url.searchParams.append('with_genres', params.with_genres);
    if (params.without_genres) url.searchParams.append('without_genres', params.without_genres);
    if (params.with_watch_providers) url.searchParams.append('with_watch_providers', params.with_watch_providers);

    // Dates work differently for TV (first_air_date) vs Movie (primary_release_date)
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
    } catch (e) {
        console.error("Discover error", e);
        return [];
    }
}
