import { NextRequest, NextResponse } from 'next/server';
import { PROVIDER_NAMES } from '@/services/tmdb';

/**
 * Proxy server-side hacia la API GraphQL de JustWatch.
 * JustWatch no tiene CORS abierto para llamadas de cliente, por eso
 * la consulta se hace desde el servidor de Next.js.
 *
 * JustWatch usa sus propios IDs (no los de TMDB), así que buscamos por título
 * y nos quedamos con el resultado cuyo `externalIds.tmdbId` coincide.
 *
 * Body esperado: { tmdbId: string, type: 'movie' | 'tv', title: string, country?: string }
 * Respuesta:     { providers: { name: string; link: string }[] }
 */

const JUSTWATCH_GRAPHQL = 'https://apis.justwatch.com/graphql';

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
          package { clearName packageId technicalName }
        }
      }
    }
  }
}
`;

interface JustWatchOffer {
    standardWebURL: string | null;
    monetizationType: string;
    // packageId de JustWatch = provider_id de TMDB
    package: { clearName: string; packageId: number; technicalName: string };
}

interface JustWatchNode {
    objectType: 'MOVIE' | 'SHOW';
    content: { externalIds: { tmdbId: string | null } };
    offers: JustWatchOffer[];
}

interface JustWatchResponse {
    data?: { popularTitles?: { edges: { node: JustWatchNode }[] } };
}

export async function POST(request: NextRequest) {
    try {
        const { tmdbId, type, title, country = 'ES' } = await request.json();

        if (!tmdbId || !type || !title || typeof title !== 'string') {
            return NextResponse.json({ providers: [] }, { status: 400 });
        }

        const countryCode = /^[A-Z]{2}$/.test(country) ? country : 'ES';
        const language = countryCode === 'ES' ? 'es' : 'en';
        const objectType = type === 'movie' ? 'MOVIE' : 'SHOW';

        const jwRes = await fetch(JUSTWATCH_GRAPHQL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (compatible; CineMatch/1.0)',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: QUERY,
                variables: { country: countryCode, language, search: title.slice(0, 120) },
            }),
            // Timeout de 5 segundos para no bloquear el modal
            signal: AbortSignal.timeout(5000),
        });

        if (!jwRes.ok) {
            return NextResponse.json({ providers: [] });
        }

        const data: JustWatchResponse = await jwRes.json();
        const match = data.data?.popularTitles?.edges
            .map(e => e.node)
            .find(n => n.objectType === objectType && n.content.externalIds.tmdbId === String(tmdbId));

        // Solo ofertas de suscripción (FLATRATE), sin alquiler ni compra.
        // Las variantes ("with Ads", canales de Amazon) comparten URL o nombre: se descartan.
        const seenNames = new Set<string>();
        const seenLinks = new Set<string>();
        const providers = (match?.offers ?? [])
            .filter(o => o.monetizationType === 'FLATRATE' && o.standardWebURL)
            .map(o => ({
                name: PROVIDER_NAMES[String(o.package.packageId)] || o.package.clearName || o.package.technicalName,
                link: o.standardWebURL as string,
            }))
            .filter(p => {
                if (seenNames.has(p.name) || seenLinks.has(p.link)) return false;
                seenNames.add(p.name);
                seenLinks.add(p.link);
                return true;
            });

        return NextResponse.json({ providers });

    } catch {
        // Timeout o error de red → respuesta vacía, el cliente usa fallback
        return NextResponse.json({ providers: [] });
    }
}
