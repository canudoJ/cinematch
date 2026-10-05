import { createSupabaseMock } from '@/test/supabaseMock';

const USER = '11111111-1111-1111-1111-111111111111';
const FRIEND = '22222222-2222-2222-2222-222222222222';

const mock = createSupabaseMock({
    friendships: [
        { data: [{ requester_id: USER, receiver_id: FRIEND }, { requester_id: '33333333-3333-3333-3333-333333333333', receiver_id: USER }] },
        { data: [{ id: 'f1', requester_id: USER, receiver_id: FRIEND, status: 'declined', created_at: '' }] },
    ],
    profiles: [
        { data: [{ id: FRIEND, username: 'ana', avatar_url: null }] },
        { data: [{ id: 'x' }] }, // isUsernameAvailable: otro usuario lo tiene
        { data: [{ id: USER }] }, // isUsernameAvailable: es el propio usuario
        { data: null, error: { message: 'down' } }, // isUsernameAvailable: error de red
    ],
});
jest.mock('@/lib/supabase', () => ({ supabase: mock.client }));

jest.mock('@/services/tmdb', () => ({
    fetchDetails: jest.fn(async (id: string) => (id === '404'
        ? null
        : { id: Number(id), title: `Movie ${id}`, poster_path: `/${id}.jpg`, overview: '', release_date: '2020-01-01', vote_average: 7, genres: [] })),
    discover: jest.fn(),
}));

import { assertUuid, fetchProfilesMap, getFriendIds, getFriendshipsBetween } from '../friends';
import { buildDeck, hydrateDeck, PREVIEW_MOVIES } from '../decks';
import { isUsernameAvailable } from '../usernameValidation';
import { getMovies } from '../data';
import { discover } from '@/services/tmdb';
import type { DeckWithItems, TMDBListItem } from '@/types';

// Los errores simulados se registran con console.error: no ensuciar la salida
beforeAll(() => jest.spyOn(console, 'error').mockImplementation(() => {}));

describe('amigos', () => {
    it('devuelve los ids de los amigos, esté el usuario en un lado u otro', async () => {
        expect(await getFriendIds(USER)).toEqual([FRIEND, '33333333-3333-3333-3333-333333333333']);
    });

    it('lee las amistades entre dos usuarios', async () => {
        const rows = await getFriendshipsBetween(USER, FRIEND);
        expect(rows[0].status).toBe('declined');
    });

    it('rechaza ids que no son UUID antes de construir el filtro (evita inyección en .or())', () => {
        expect(() => assertUuid('a,b),or(x')).toThrow();
        expect(assertUuid(USER)).toBe(USER);
    });

    it('indexa perfiles por id y no consulta si no hay ids', async () => {
        expect((await fetchProfilesMap([FRIEND, FRIEND])).get(FRIEND)?.username).toBe('ana');
        expect((await fetchProfilesMap([])).size).toBe(0);
    });
});

describe('nombre de usuario disponible', () => {
    it('no está libre si lo usa otra persona', async () => {
        expect(await isUsernameAvailable('Ana')).toBe(false);
    });

    it('sí está libre si es el propio nombre al editar', async () => {
        expect(await isUsernameAvailable('Javier', USER)).toBe(true);
    });

    it('ante un error asume que no está libre (evita duplicados)', async () => {
        expect(await isUsernameAvailable('x')).toBe(false);
    });
});

describe('barajas', () => {
    const row: DeckWithItems = {
        id: 'd1', user_id: USER, title: 'Clásicos', description: null, tags: ['Clásicos', 7 as unknown as string],
        privacy: 'public', views: null, created_at: '',
        deck_items: ['1', '2', '3', '404', '5', '6'].map(id => ({ movie_id: Number(id), media_type: 'movie' as const })),
    };

    it('en listados solo carga las portadas', async () => {
        const deck = await buildDeck(row, { id: USER, username: 'javi', avatar_url: null }, 'es');
        expect(deck.items).toHaveLength(6);
        expect(deck.movies.length).toBeLessThanOrEqual(PREVIEW_MOVIES);
        expect(deck.moviesLoaded).toBe(false);
        expect(deck.tags).toEqual(['Clásicos']);
        expect(deck.isPublic).toBe(true);
        expect(deck.creatorName).toBe('javi');
    });

    it('hydrateDeck completa las películas (descarta las que TMDB no devuelve)', async () => {
        const full = await hydrateDeck(await buildDeck(row, undefined, 'es'), 'es');
        expect(full.moviesLoaded).toBe(true);
        expect(full.movies.map(m => m.id)).toEqual(['1', '2', '3', '5', '6']);
    });
});

describe('feed', () => {
    const item = (id: number, poster: string | null = '/p.jpg'): TMDBListItem => ({
        id, title: `M${id}`, poster_path: poster, overview: '', vote_average: 7, release_date: '2020-01-01', genre_ids: [],
    });

    it('excluye lo ya visto y lo que no tiene póster, sin duplicados', async () => {
        (discover as jest.Mock).mockResolvedValue([item(1), item(2), item(3, null), item(1)]);
        const movies = await getMovies({ platforms: ['8'], types: ['movie'], region: 'ES', seenIds: ['2'], language: 'es' });
        expect(movies.map(m => m.id)).toEqual(['1']);
    });

    it('si todo estaba visto, busca más páginas en lugar de mostrar un mock', async () => {
        (discover as jest.Mock).mockReset()
            .mockResolvedValueOnce([item(1)]).mockResolvedValueOnce([item(1)]).mockResolvedValueOnce([item(1)]).mockResolvedValueOnce([item(1)])
            .mockResolvedValue([item(9)]);
        const movies = await getMovies({ platforms: ['8'], types: ['movie'], region: 'ES', seenIds: ['1'], language: 'es' });
        expect(movies.map(m => m.id)).toEqual(['9']);
    });

    it('devuelve [] si de verdad no queda nada', async () => {
        (discover as jest.Mock).mockReset().mockResolvedValue([]);
        expect(await getMovies({ platforms: [], types: ['tv'], region: 'ES', language: 'en' })).toEqual([]);
    });
});
