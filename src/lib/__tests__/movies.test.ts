import { formatYear, genreName, getLocalizedSynopsis, getLocalizedTitle, isShowable, posterUrl, tmdbItemToMovie, yearFromDate } from '../movies';
import type { Movie, TMDBListItem } from '@/types';

const item: TMDBListItem = {
    id: 27205,
    title: 'Origen',
    poster_path: '/poster.jpg',
    overview: 'Un ladrón que roba secretos…',
    release_date: '2010-07-15',
    vote_average: 8.4,
    genre_ids: [28, 878, 10765],
};

describe('tmdbItemToMovie', () => {
    it('convierte un resultado de TMDB en Movie', () => {
        const movie = tmdbItemToMovie(item, 'movie', 'es');
        expect(movie).toMatchObject({
            id: '27205',
            type: 'movie',
            title: 'Origen',
            year: 2010,
            rating: 8.4,
            image: 'https://image.tmdb.org/t/p/w500/poster.jpg',
        });
    });

    it('traduce los géneros a nombres (antes se guardaban los IDs numéricos)', () => {
        expect(tmdbItemToMovie(item, 'movie', 'es').genres).toEqual(['Acción', 'Ciencia ficción', 'Ciencia ficción y fantasía']);
        expect(tmdbItemToMovie(item, 'movie', 'en').genres[0]).toBe('Action');
    });

    it('usa "name" y "first_air_date" en las series', () => {
        const movie = tmdbItemToMovie({ ...item, title: undefined, name: 'Dark', release_date: undefined, first_air_date: '2017-12-01' }, 'tv', 'es');
        expect(movie.title).toBe('Dark');
        expect(movie.year).toBe(2017);
    });

    it('acepta detalles con "genres" en lugar de "genre_ids"', () => {
        const details = { ...item, genre_ids: undefined, genres: [{ id: 35, name: 'Comedia' }] };
        expect(tmdbItemToMovie(details, 'movie', 'es').genres).toEqual(['Comedia']);
    });

    it('no inventa datos cuando faltan', () => {
        const movie = tmdbItemToMovie({ ...item, poster_path: null, release_date: undefined, genre_ids: [99999] }, 'movie', 'es');
        expect(movie.image).toBe('');
        expect(movie.year).toBe(0);
        expect(movie.genres).toEqual([]);
    });
});

describe('utilidades', () => {
    it('posterUrl no genera ".../w500null"', () => {
        expect(posterUrl(null)).toBe('');
        expect(posterUrl('/a.jpg', 'w200')).toBe('https://image.tmdb.org/t/p/w200/a.jpg');
    });

    it('yearFromDate y formatYear', () => {
        expect(yearFromDate('1999-03-31')).toBe(1999);
        expect(yearFromDate(undefined)).toBe(0);
        expect(formatYear(0)).toBe('—');
        expect(formatYear(2024)).toBe('2024');
    });

    it('genreName devuelve vacío para géneros desconocidos', () => {
        expect(genreName(18, 'es')).toBe('Drama');
        expect(genreName(-1, 'es')).toBe('');
    });

    it('usa los campos legacy en español si existen', () => {
        const movie = { title: 'Inception', title_es: 'Origen', synopsis: 'EN', synopsis_es: 'ES' } as Movie;
        expect(getLocalizedTitle(movie, 'es')).toBe('Origen');
        expect(getLocalizedTitle(movie, 'en')).toBe('Inception');
        expect(getLocalizedSynopsis(movie, 'es')).toBe('ES');
    });
});

describe('isShowable', () => {
    it('acepta títulos con póster en alfabeto latino (con tildes y signos)', () => {
        expect(isShowable({ poster_path: '/a.jpg', title: '¿Qué pasó ayer?' })).toBe(true);
        expect(isShowable({ poster_path: '/a.jpg', name: 'Señor de los Anillos: Las dos torres' })).toBe(true);
    });

    it('descarta lo que no tiene póster o título', () => {
        expect(isShowable({ poster_path: null, title: 'Dune' })).toBe(false);
        expect(isShowable({ poster_path: '/a.jpg', title: ' ' })).toBe(false);
    });

    it('descarta títulos sin traducir en otros alfabetos', () => {
        expect(isShowable({ poster_path: '/a.jpg', title: '仙逆剧场版：弑仙之战' })).toBe(false);
        expect(isShowable({ poster_path: '/a.jpg', name: '오징어 게임' })).toBe(false);
        expect(isShowable({ poster_path: '/a.jpg', title: 'Брат' })).toBe(false);
    });
});
