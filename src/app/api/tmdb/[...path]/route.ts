import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy de solo lectura hacia TMDB v3.
 * - La clave (TMDB_API_KEY) vive solo en el servidor: nunca llega al navegador.
 * - Solo se permiten los endpoints y parámetros que usa la app.
 * - Las respuestas se cachean (Next data cache + CDN) para no repetir llamadas.
 */

const TMDB_BASE = 'https://api.themoviedb.org/3';

/** Endpoints permitidos y su tiempo de caché en segundos */
const ALLOWED_ENDPOINTS: { pattern: RegExp; revalidate: number }[] = [
    { pattern: /^discover\/(movie|tv)$/, revalidate: 60 * 60 },
    { pattern: /^search\/(movie|tv)$/, revalidate: 60 * 60 },
    { pattern: /^(movie|tv)\/\d+$/, revalidate: 60 * 60 * 24 },
    { pattern: /^(movie|tv)\/\d+\/watch\/providers$/, revalidate: 60 * 60 * 6 },
];

const ALLOWED_PARAMS = new Set([
    'language', 'page', 'query', 'sort_by', 'watch_region', 'with_watch_providers',
    'with_genres', 'without_genres', 'primary_release_date.gte', 'primary_release_date.lte',
    'first_air_date.gte', 'first_air_date.lte', 'with_runtime.gte', 'with_runtime.lte',
    'vote_count.gte', 'vote_average.gte', 'vote_average.lte', 'append_to_response',
]);

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'TMDB no está configurado' }, { status: 503 });
    }

    const { path } = await params;
    const endpoint = path.join('/');
    const rule = ALLOWED_ENDPOINTS.find(r => r.pattern.test(endpoint));
    if (!rule) {
        return NextResponse.json({ error: 'Endpoint no permitido' }, { status: 400 });
    }

    const upstream = new URL(`${TMDB_BASE}/${endpoint}`);
    for (const [key, value] of request.nextUrl.searchParams) {
        if (!ALLOWED_PARAMS.has(key)) continue;
        // Solo se permite adjuntar los créditos al detalle
        if (key === 'append_to_response' && value !== 'credits') continue;
        upstream.searchParams.set(key, value.slice(0, 200));
    }
    upstream.searchParams.set('api_key', apiKey);

    try {
        const res = await fetch(upstream, {
            headers: { Accept: 'application/json' },
            next: { revalidate: rule.revalidate },
            signal: AbortSignal.timeout(8000),
        });
        const body = await res.json();
        return NextResponse.json(body, {
            status: res.status,
            headers: res.ok
                ? { 'Cache-Control': `public, s-maxage=${rule.revalidate}, stale-while-revalidate=${rule.revalidate}` }
                : undefined,
        });
    } catch {
        return NextResponse.json({ error: 'TMDB no responde' }, { status: 502 });
    }
}
