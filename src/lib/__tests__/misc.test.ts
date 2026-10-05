import { getTagIcon, getTagLabel, normalizeTag } from '../constants';
import { filterLibrary, isOnPlatforms, sortLibrary } from '../library';
import { isAuthPage, isPublicPath } from '../routes';
import { authErrorCode, authErrorMessage } from '../authErrors';
import { isValidUsername } from '../usernameValidation';
import { es } from '@/i18n/es';
import type { LibraryMovie } from '@/types';

describe('tags', () => {
    it('getTagLabel quita emojis pero no dígitos (antes "Top 10" quedaba en "Top")', () => {
        expect(getTagLabel('Top 10')).toBe('Top 10');
        expect(getTagLabel('🔥 Clásicos')).toBe('Clásicos');
        expect(getTagLabel('❤️ Cita')).toBe('Cita');
    });

    it('normalizeTag usa la forma canónica de los tags sugeridos', () => {
        expect(normalizeTag('chill')).toBe('Chill');
        expect(normalizeTag('  terror ')).toBe('Terror');
    });

    it('normalizeTag no reescribe tags personalizados ni añade vacíos', () => {
        expect(normalizeTag('is')).toBe('is'); // antes acababa como "Risas"
        expect(normalizeTag('')).toBe('');
        expect(normalizeTag('   ')).toBe('');
    });

    it('getTagIcon da un icono por defecto a los tags desconocidos', () => {
        expect(getTagIcon('Chill')).not.toBe(getTagIcon('desconocido'));
    });
});

describe('videoteca', () => {
    const lib: LibraryMovie[] = [
        { id: '1', type: 'movie', title: 'Zodiac', year: 2007, rating: 7.7, image: '', synopsis: '', genres: [], providers: [{ name: 'Netflix', link: '' }], added_at: '2026-01-01' },
        { id: '2', type: 'tv', title: 'Arcane', year: 2021, rating: 8.8, image: '', synopsis: '', genres: [], providerName: 'Netflix', added_at: '2026-03-01' },
        { id: '3', type: 'movie', title: 'Barbie', year: 2023, rating: 7, image: '', synopsis: '', genres: [], providers: [{ name: 'HBO Max', link: '' }], added_at: '2026-02-01' },
    ];

    it('filtra por texto, tipo y plataforma', () => {
        expect(filterLibrary(lib, { query: 'arc', type: 'all', platforms: [] }).map(m => m.id)).toEqual(['2']);
        expect(filterLibrary(lib, { query: '', type: 'movie', platforms: [] }).map(m => m.id)).toEqual(['1', '3']);
        expect(filterLibrary(lib, { query: '', type: 'all', platforms: ['HBO Max'] }).map(m => m.id)).toEqual(['3']);
    });

    it('sin plataformas guardadas no coincide con ningún filtro de plataforma', () => {
        expect(isOnPlatforms({ ...lib[0], providers: [] }, ['Netflix'])).toBe(false);
        expect(isOnPlatforms(lib[0], [])).toBe(true);
    });

    it('ordena por nombre, año y "añadidas recientemente" (antes no hacía nada)', () => {
        expect(sortLibrary(lib, 'alpha', 'es').map(m => m.title)).toEqual(['Arcane', 'Barbie', 'Zodiac']);
        expect(sortLibrary(lib, 'year', 'es').map(m => m.year)).toEqual([2023, 2021, 2007]);
        expect(sortLibrary(lib, 'liked', 'es').map(m => m.id)).toEqual(['2', '3', '1']);
    });
});

describe('rutas', () => {
    it.each(['/', '/auth/login', '/auth/reset-confirm', '/deck/123', '/deck/123/'])('%s es pública', path => {
        expect(isPublicPath(path)).toBe(true);
    });

    it.each(['/profile', '/challenge-mode', '/roulette-lobby', '/authorize', '/auth', '/invite/x'])('%s es privada', path => {
        expect(isPublicPath(path)).toBe(false);
    });

    it('identifica las pantallas de acceso', () => {
        expect(isAuthPage('/auth/login')).toBe(true);
        expect(isAuthPage('/auth/register/')).toBe(true);
        expect(isAuthPage('/auth/reset-password')).toBe(false);
    });
});

describe('errores de autenticación', () => {
    it.each([
        [{ code: 'invalid_credentials' }, 'invalid_credentials'],
        [{ message: 'Invalid login credentials' }, 'invalid_credentials'],
        [{ message: 'Email not confirmed' }, 'email_not_confirmed'],
        [{ message: 'User already registered' }, 'email_in_use'],
        [{ code: 'weak_password' }, 'weak_password'],
        [{ status: 429 }, 'rate_limit'],
        [new Error('boom'), 'unknown'],
        [null, 'unknown'],
    ])('%p → %s', (error, code) => {
        expect(authErrorCode(error)).toBe(code);
    });

    it('devuelve el mensaje traducido', () => {
        expect(authErrorMessage({ code: 'invalid_credentials' }, es)).toBe(es.authError_invalid_credentials);
    });
});

describe('nombre de usuario', () => {
    it.each(['javier', 'Ana_23', 'josé.luis', 'invitado_ab12cd'])('%s es válido', name => {
        expect(isValidUsername(name)).toBe(true);
    });

    it.each(['ab', 'a'.repeat(21), 'con espacio', 'raro!', '<script>'])('%s no es válido', name => {
        expect(isValidUsername(name)).toBe(false);
    });
});
