/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST as justwatch } from '../justwatch/route';
import { GET as tmdb } from '../tmdb/[...path]/route';

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

const jsonResponse = (body: unknown, status = 200) =>
    ({ ok: status < 400, status, json: async () => body }) as Response;

const offer = (packageId: number, url: string, monetizationType = 'FLATRATE') => ({
    standardWebURL: url, monetizationType, package: { clearName: `pkg${packageId}`, packageId },
});

const justwatchRequest = (body: unknown) =>
    new NextRequest('http://localhost/api/justwatch', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });

describe('/api/justwatch', () => {
    beforeEach(() => fetchMock.mockReset());

    it('elige el resultado cuyo tmdbId coincide y devuelve enlaces directos sin duplicados', async () => {
        fetchMock.mockResolvedValue(jsonResponse({
            data: {
                popularTitles: {
                    edges: [
                        { node: { objectType: 'MOVIE', content: { externalIds: { tmdbId: '1' } }, offers: [offer(8, 'https://netflix.com/wrong')] } },
                        {
                            node: {
                                objectType: 'MOVIE',
                                content: { externalIds: { tmdbId: '693134' } },
                                offers: [
                                    offer(119, 'https://prime/x'),
                                    offer(2100, 'https://prime/x'), // Prime con anuncios: mismo enlace
                                    offer(1899, 'https://hbomax/x'),
                                    offer(1825, 'https://prime/x'), // canal de Amazon
                                    offer(8, 'https://netflix/rent', 'RENT'),
                                ],
                            },
                        },
                    ],
                },
            },
        }));

        const res = await justwatch(justwatchRequest({ tmdbId: '693134', type: 'movie', title: 'Dune', country: 'ES' }));
        expect(res.status).toBe(200);
        expect((await res.json()).providers).toEqual([
            { name: 'Prime Video', link: 'https://prime/x' },
            { name: 'HBO Max', link: 'https://hbomax/x' },
        ]);
    });

    it('devuelve 400 con JSON inválido o parámetros incorrectos', async () => {
        expect((await justwatch(justwatchRequest('{oops'))).status).toBe(400);
        expect((await justwatch(justwatchRequest({ tmdbId: 'abc', type: 'movie', title: 'x' }))).status).toBe(400);
        expect((await justwatch(justwatchRequest({ tmdbId: '1', type: 'cartoon', title: 'x' }))).status).toBe(400);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('usa ES si el país no está soportado', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ data: { popularTitles: { edges: [] } } }));
        await justwatch(justwatchRequest({ tmdbId: '5', type: 'tv', title: 'Dark', country: 'EN' }));
        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.variables.country).toBe('ES');
    });

    it('si JustWatch falla devuelve lista vacía (el cliente usa la búsqueda en la plataforma)', async () => {
        fetchMock.mockRejectedValue(new Error('timeout'));
        const res = await justwatch(justwatchRequest({ tmdbId: '7', type: 'movie', title: 'x' }));
        expect((await res.json()).providers).toEqual([]);
    });
});

describe('/api/tmdb', () => {
    const call = (path: string[], query = '') =>
        tmdb(new NextRequest(`http://localhost/api/tmdb/${path.join('/')}${query}`), { params: Promise.resolve({ path }) });

    beforeEach(() => {
        fetchMock.mockReset();
        process.env.TMDB_API_KEY = 'secret-key';
    });

    it('rechaza endpoints fuera de la lista blanca', async () => {
        const res = await call(['account', '1']);
        expect(res.status).toBe(400);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('añade la clave en el servidor y filtra parámetros no permitidos', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ results: [] }));
        const res = await call(['discover', 'movie'], '?language=es-ES&page=2&api_key=attacker&foo=bar');
        expect(res.status).toBe(200);
        const url = new URL(String(fetchMock.mock.calls[0][0]));
        expect(url.searchParams.get('api_key')).toBe('secret-key');
        expect(url.searchParams.get('page')).toBe('2');
        expect(url.searchParams.has('foo')).toBe(false);
        expect(res.headers.get('Cache-Control')).toContain('s-maxage');
    });

    it('la clave nunca aparece en la respuesta', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ id: 1, title: 'x' }));
        const res = await call(['movie', '1'], '?append_to_response=credits');
        expect(JSON.stringify(await res.json())).not.toContain('secret-key');
    });

    it('solo permite adjuntar créditos', async () => {
        fetchMock.mockResolvedValue(jsonResponse({}));
        await call(['movie', '1'], '?append_to_response=account_states');
        expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.has('append_to_response')).toBe(false);
    });

    it('responde 503 si falta la clave en el servidor', async () => {
        delete process.env.TMDB_API_KEY;
        expect((await call(['discover', 'tv'])).status).toBe(503);
    });
});
