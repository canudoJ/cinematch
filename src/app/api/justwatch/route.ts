import { NextRequest, NextResponse } from 'next/server';
import { providerName } from '@/lib/providers';
import { DEFAULT_REGION, SUPPORTED_REGIONS, justWatchLanguage } from '@/lib/region';
import type { WatchProvider } from '@/types';

/**
 * Proxy server-side hacia la API GraphQL de JustWatch (no admite CORS desde el navegador).
 *
 * JustWatch usa sus propios IDs, así que se busca por título y se elige el resultado
 * cuyo `externalIds.tmdbId` coincide con el de TMDB.
 *
 * Body:      { tmdbId: string | number, type: 'movie' | 'tv', title: string, country?: string }
 * Respuesta: { providers: { name: string; link: string }[] }
 */

const JUSTWATCH_GRAPHQL = 'https://apis.justwatch.com/graphql';
const CACHE_SECONDS = 60 * 60 * 12;

const QUERY = `
query SearchTitleOffers($country: Country!, $language: Language!, $search: String!) {
  popularTitles(country: $country, first: 5, filter: { searchQuery: $search }) {
    edges {
      node {
        objectType
        content(country: $country, language: $language) {
          externalIds { tmdbId }
        }
        offers(country: $country, platform: WEB) {
          standardWebURL
          monetizationType
          package { clearName packageId }
        }
      }
    }
  }
}
`;

interface JustWatchOffer {
    standardWebURL: string | null;
    monetizationType: string;
    /** packageId de JustWatch = provider_id de TMDB */
    package: { clearName: string; packageId: number };
}

interface JustWatchNode {
    objectType: 'MOVIE' | 'SHOW';
    content: { externalIds: { tmdbId: string | null } | null } | null;
    offers: JustWatchOffer[] | null;
}

interface JustWatchResponse {
    data?: { popularTitles?: { edges: { node: JustWatchNode }[] | null } | null };
    errors?: unknown[];
}

interface RequestBody {
    tmdbId: string;
    type: 'movie' | 'tv';
    title: string;
    country: string;
}

/** Caché en memoria del servidor (se pierde al reiniciar; la CDN cachea además la respuesta) */
const memoryCache = new Map<string, { providers: WatchProvider[]; expires: number }>();
const MAX_CACHE_ENTRIES = 500;

function parseBody(raw: unknown): RequestBody | null {
    if (!raw || typeof raw !== 'object') return null;
    const { tmdbId, type, title, country } = raw as Record<string, unknown>;
    if (!/^\d+$/.test(String(tmdbId ?? ''))) return null;
    if (type !== 'movie' && type !== 'tv') return null;
    if (typeof title !== 'string' || !title.trim()) return null;
    const region = typeof country === 'string' ? country.toUpperCase() : DEFAULT_REGION;
    return {
        tmdbId: String(tmdbId),
        type,
        title: title.trim().slice(0, 120),
        country: (SUPPORTED_REGIONS as readonly string[]).includes(region) ? region : DEFAULT_REGION,
    };
}

/** Ofertas de suscripción del título, sin duplicados (planes con anuncios, canales…) */
function toProviders(node: JustWatchNode | undefined): WatchProvider[] {
    const seenNames = new Set<string>();
    const seenLinks = new Set<string>();
    return (node?.offers ?? [])
        .filter(o => o.monetizationType === 'FLATRATE' && o.standardWebURL)
        .map(o => ({
            name: providerName(o.package.packageId, o.package.clearName),
            link: o.standardWebURL as string,
        }))
        .filter(p => {
            if (seenNames.has(p.name) || seenLinks.has(p.link)) return false;
            seenNames.add(p.name);
            seenLinks.add(p.link);
            return true;
        });
}

function respond(providers: WatchProvider[]) {
    return NextResponse.json(
        { providers },
        { headers: { 'Cache-Control': `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}` } },
    );
}

export async function POST(request: NextRequest) {
    let body: RequestBody | null;
    try {
        body = parseBody(await request.json());
    } catch {
        body = null;
    }
    if (!body) {
        return NextResponse.json({ providers: [], error: 'Parámetros inválidos' }, { status: 400 });
    }

    const cacheKey = `${body.type}:${body.tmdbId}:${body.country}`;
    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) return respond(cached.providers);

    try {
        const jwRes = await fetch(JUSTWATCH_GRAPHQL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                query: QUERY,
                variables: { country: body.country, language: justWatchLanguage(body.country), search: body.title },
            }),
            signal: AbortSignal.timeout(5000),
        });
        if (!jwRes.ok) return NextResponse.json({ providers: [] });

        const data = (await jwRes.json()) as JustWatchResponse;
        if (data.errors?.length) return NextResponse.json({ providers: [] });

        const objectType = body.type === 'movie' ? 'MOVIE' : 'SHOW';
        const match = (data.data?.popularTitles?.edges ?? [])
            .map(e => e.node)
            .find(n => n.objectType === objectType && n.content?.externalIds?.tmdbId === body.tmdbId);

        const providers = toProviders(match);
        if (memoryCache.size >= MAX_CACHE_ENTRIES) {
            const oldestKey = memoryCache.keys().next().value;
            if (oldestKey) memoryCache.delete(oldestKey);
        }
        memoryCache.set(cacheKey, { providers, expires: Date.now() + CACHE_SECONDS * 1000 });
        return respond(providers);
    } catch {
        // Timeout o error de red → lista vacía; el cliente usa la búsqueda en la plataforma
        return NextResponse.json({ providers: [] });
    }
}
