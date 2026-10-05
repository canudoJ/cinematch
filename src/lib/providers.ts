/**
 * Plataformas de streaming: fuente única de IDs, nombres y URLs.
 *
 * Los IDs son los `provider_id` de TMDB (que JustWatch usa como `packageId`).
 * Una misma plataforma tiene varios IDs (planes con anuncios, canales de Amazon,
 * cambios de marca de HBO → Max → HBO Max), así que cada plataforma lista todos
 * sus `aliases` y el resto de la app trabaja con el `id` principal.
 */

export interface Provider {
    /** ID principal (el que se guarda en las preferencias del usuario) */
    id: string;
    name: string;
    /** Todos los provider_id de TMDB que cuentan como esta plataforma */
    aliases: string[];
    color: string;
    textColor: string;
    /** URL de búsqueda en la plataforma; null = no admite búsqueda por URL */
    searchUrl: ((query: string) => string) | null;
}

export const PROVIDERS: Provider[] = [
    {
        id: '8', name: 'Netflix', aliases: ['8', '1796'], color: '#E50914', textColor: 'white',
        searchUrl: q => `https://www.netflix.com/search?q=${q}`,
    },
    {
        id: '119', name: 'Prime Video', aliases: ['119', '2100'], color: '#00A8E1', textColor: 'white',
        searchUrl: q => `https://www.primevideo.com/search?phrase=${q}`,
    },
    {
        id: '337', name: 'Disney+', aliases: ['337'], color: '#113CCF', textColor: 'white',
        searchUrl: q => `https://www.disneyplus.com/search?q=${q}`,
    },
    {
        id: '384', name: 'HBO Max', aliases: ['384', '1899', '118', '1825'], color: '#9900FF', textColor: 'white',
        searchUrl: q => `https://play.hbomax.com/search?q=${q}`,
    },
    {
        id: '283', name: 'Crunchyroll', aliases: ['283', '1968'], color: '#F47521', textColor: 'black',
        searchUrl: q => `https://www.crunchyroll.com/search?q=${q}`,
    },
];

/** Plataformas que no se pueden elegir como preferencia pero sí aparecen en resultados */
const EXTRA_PROVIDER_NAMES: Record<string, string> = {
    '350': 'Apple TV+',
    '2': 'Apple TV',
    '63': 'Filmin',
    '149': 'Movistar Plus+',
    '1773': 'SkyShowtime',
};

const ALIAS_TO_PROVIDER = new Map<string, Provider>(
    PROVIDERS.flatMap(p => p.aliases.map(alias => [alias, p] as const)),
);

/** Plataforma principal a la que pertenece un provider_id de TMDB (o undefined) */
export function findProvider(providerId: string | number): Provider | undefined {
    return ALIAS_TO_PROVIDER.get(String(providerId));
}

/** Nombre normalizado de un provider_id de TMDB; `fallback` si no es conocido */
export function providerName(providerId: string | number, fallback = ''): string {
    const id = String(providerId);
    return findProvider(id)?.name ?? EXTRA_PROVIDER_NAMES[id] ?? fallback;
}

/** Expande los IDs principales a todos sus alias (para filtros de TMDB con OR) */
export function expandProviderIds(ids: string[]): string[] {
    const expanded = ids.flatMap(id => findProvider(id)?.aliases ?? [id]);
    return [...new Set(expanded)];
}

/** Normaliza un nombre para compararlo ("HBO Max" ≈ "hbomax") */
export function normalizeProviderName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Búsqueda en Google del título, último recurso cuando no hay enlace mejor */
export function googleWatchUrl(title: string, providerLabel?: string): string {
    const query = providerLabel ? `ver ${title} en ${providerLabel}` : `ver ${title} online`;
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/** URL de búsqueda del título dentro de la plataforma (o Google si no admite búsqueda) */
export function buildPlatformSearchUrl(name: string, title: string): string {
    const normalized = normalizeProviderName(name);
    const provider = PROVIDERS.find(p => normalizeProviderName(p.name) === normalized)
        ?? PROVIDERS.find(p => normalized.includes(normalizeProviderName(p.name)));
    return provider?.searchUrl
        ? provider.searchUrl(encodeURIComponent(title))
        : googleWatchUrl(title, name);
}
