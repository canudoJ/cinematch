import { buildPlatformSearchUrl, expandProviderIds, findProvider, normalizeProviderName, providerName } from '@/lib/providers';
import type {
    ContentType, Movie, TMDBDetails, TMDBListItem, TMDBPaged, TMDBWatchProvidersResponse, WatchProvider,
} from '@/types';

/**
 * Cliente de TMDB del navegador. Todas las peticiones pasan por /api/tmdb,
 * que añade la clave en el servidor y cachea las respuestas.
 */

type QueryValue = string | number | undefined | null;

/** Límite de peticiones simultáneas a la API (TMDB limita por segundo) */
const MAX_CONCURRENT_REQUESTS = 8;
let activeRequests = 0;
const waitingQueue: (() => void)[] = [];

async function withConcurrencyLimit<T>(task: () => Promise<T>): Promise<T> {
    if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
        await new Promise<void>(resolve => waitingQueue.push(resolve));
    }
    activeRequests++;
    try {
        return await task();
    } finally {
        activeRequests--;
        waitingQueue.shift()?.();
    }
}

async function tmdbGet<T>(endpoint: string, query: Record<string, QueryValue> = {}): Promise<T | null> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    });
    const qs = params.toString();

    return withConcurrencyLimit(async () => {
        try {
            const res = await fetch(`/api/tmdb/${endpoint}${qs ? `?${qs}` : ''}`);
            return res.ok ? ((await res.json()) as T) : null;
        } catch {
            return null;
        }
    });
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

/** Parámetros de /discover con los nombres exactos que espera TMDB */
export interface DiscoverParams {
    language: string;
    watch_region?: string;
    page?: number;
    sort_by?: string;
    /** IDs principales de plataforma; se expanden a todos sus alias */
    providers?: string[];
    with_genres?: string;
    without_genres?: string;
    'primary_release_date.gte'?: string;
    'primary_release_date.lte'?: string;
    'first_air_date.gte'?: string;
    'first_air_date.lte'?: string;
    'with_runtime.gte'?: number;
    'with_runtime.lte'?: number;
    'vote_count.gte'?: number;
    'vote_average.gte'?: number;
    'vote_average.lte'?: number;
}

export async function discover(type: ContentType, params: DiscoverParams): Promise<TMDBListItem[]> {
    const { providers, ...rest } = params;
    const data = await tmdbGet<TMDBPaged<TMDBListItem>>(`discover/${type}`, {
        sort_by: 'popularity.desc',
        ...rest,
        with_watch_providers: providers?.length ? expandProviderIds(providers).join('|') : undefined,
    });
    return data?.results ?? [];
}

export async function searchContent(query: string, type: ContentType, language: string): Promise<TMDBListItem[]> {
    if (!query.trim()) return [];
    const data = await tmdbGet<TMDBPaged<TMDBListItem>>(`search/${type}`, { query: query.trim(), language, page: 1 });
    return data?.results ?? [];
}

/** Caché de detalles por sesión: deduplica también peticiones simultáneas */
const detailsCache = new Map<string, Promise<TMDBDetails | null>>();

export function fetchDetails(
    id: string,
    type: ContentType,
    language: string,
    options: { withCredits?: boolean } = {},
): Promise<TMDBDetails | null> {
    const key = `${type}/${id}/${language}/${options.withCredits ? 'credits' : ''}`;
    const cached = detailsCache.get(key);
    if (cached) return cached;

    const request = tmdbGet<TMDBDetails>(`${type}/${id}`, {
        language,
        append_to_response: options.withCredits ? 'credits' : undefined,
    }).then(result => {
        if (!result) detailsCache.delete(key); // no cachear errores
        return result;
    });
    detailsCache.set(key, request);
    return request;
}

// ---------------------------------------------------------------------------
// Dónde ver un título
// ---------------------------------------------------------------------------

type WatchTarget = Pick<Movie, 'id' | 'type' | 'title'>;

/** Plataformas de suscripción según TMDB, con enlace de búsqueda en cada una */
async function fetchTmdbProviders(movie: WatchTarget, region: string): Promise<WatchProvider[]> {
    const data = await tmdbGet<TMDBWatchProvidersResponse>(`${movie.type}/${movie.id}/watch/providers`);
    const flatrate = data?.results?.[region]?.flatrate ?? [];

    const seen = new Set<string>();
    return flatrate
        .map(p => providerName(p.provider_id, p.provider_name))
        .filter(name => !seen.has(name) && !!seen.add(name))
        .map(name => ({ name, link: buildPlatformSearchUrl(name, movie.title) }));
}

/** Enlaces directos al título en cada plataforma (proxy de JustWatch) */
async function fetchDirectLinks(movie: WatchTarget, region: string): Promise<WatchProvider[]> {
    try {
        const res = await fetch('/api/justwatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tmdbId: movie.id, type: movie.type, title: movie.title, country: region }),
        });
        if (!res.ok) return [];
        const data = (await res.json()) as { providers?: WatchProvider[] };
        return data.providers ?? [];
    } catch {
        return [];
    }
}

export interface WatchOptions {
    /** Plataformas donde está el título: enlace directo si existe, si no, búsqueda en la plataforma */
    providers: WatchProvider[];
    /** La mejor opción para el usuario: una de sus plataformas si la hay, si no la primera */
    best: WatchProvider | null;
}

const watchCache = new Map<string, Promise<WatchOptions>>();

export function getWatchOptions(
    movie: WatchTarget,
    region: string,
    preferredProviderIds: string[] = [],
): Promise<WatchOptions> {
    const key = `${movie.type}/${movie.id}/${region}`;
    let request = watchCache.get(key);
    if (!request) {
        request = Promise.all([fetchTmdbProviders(movie, region), fetchDirectLinks(movie, region)])
            .then(([listed, direct]) => {
                const directByName = new Map(direct.map(d => [normalizeProviderName(d.name), d.link]));
                const providers = listed.length > 0
                    ? listed.map(p => ({ name: p.name, link: directByName.get(normalizeProviderName(p.name)) ?? p.link }))
                    : direct;
                return { providers, best: null };
            });
        watchCache.set(key, request);
    }

    return request.then(({ providers }) => {
        const preferredNames = new Set(
            preferredProviderIds.map(id => findProvider(id)?.name).filter((name): name is string => !!name),
        );
        const best = providers.find(p => preferredNames.has(p.name)) ?? providers[0] ?? null;
        return { providers, best };
    });
}

/** Devuelve la película con sus plataformas y el enlace principal rellenados */
export async function withWatchInfo<T extends Movie>(movie: T, region: string, preferredProviderIds: string[]): Promise<T> {
    const { providers, best } = await getWatchOptions(movie, region, preferredProviderIds);
    return {
        ...movie,
        providers,
        providerName: best?.name ?? movie.providerName,
        watchLink: best?.link ?? movie.watchLink,
    };
}
