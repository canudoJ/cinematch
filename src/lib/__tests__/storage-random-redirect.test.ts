import { clearAppStorage, readArray, readJSON, readString, removeKey, writeJSON, writeString } from '../storage';
import { randomCode, sample, shuffle } from '../random';
import { safeRedirect } from '../safeRedirect';

describe('storage', () => {
    beforeEach(() => localStorage.clear());

    it('lee y escribe JSON', () => {
        writeJSON('cinematch_x', { a: 1 });
        expect(readJSON('cinematch_x', null)).toEqual({ a: 1 });
    });

    it('no rompe con JSON corrupto: devuelve el valor por defecto', () => {
        localStorage.setItem('cinematch_bad', '{not json');
        expect(readJSON('cinematch_bad', 'fallback')).toBe('fallback');
        expect(readArray('cinematch_bad')).toEqual([]);
    });

    it('readArray descarta valores que no son arrays', () => {
        writeJSON('cinematch_obj', { nope: true });
        expect(readArray('cinematch_obj', ['x'])).toEqual(['x']);
    });

    it('lee, escribe y borra cadenas', () => {
        writeString('k', 'v');
        expect(readString('k')).toBe('v');
        removeKey('k');
        expect(readString('k')).toBeNull();
    });

    it('al cerrar sesión borra los datos de la app pero conserva tema e idioma', () => {
        localStorage.setItem('cinematch_likes_u1', '[]');
        localStorage.setItem('cinematch_theme', 'light');
        localStorage.setItem('cinematch_language', 'en');
        localStorage.setItem('otra_app', '1');
        clearAppStorage();
        expect(localStorage.getItem('cinematch_likes_u1')).toBeNull();
        expect(localStorage.getItem('cinematch_theme')).toBe('light');
        expect(localStorage.getItem('cinematch_language')).toBe('en');
        expect(localStorage.getItem('otra_app')).toBe('1');
    });
});

describe('random', () => {
    it('shuffle conserva los elementos y no muta el original', () => {
        const original = [1, 2, 3, 4, 5];
        const result = shuffle(original);
        expect(original).toEqual([1, 2, 3, 4, 5]);
        expect([...result].sort()).toEqual(original);
    });

    it('shuffle es determinista con un generador fijo', () => {
        expect(shuffle([1, 2, 3], () => 0)).toEqual([2, 3, 1]);
    });

    it('randomCode tiene siempre la longitud pedida y caracteres no ambiguos', () => {
        for (let i = 0; i < 50; i++) {
            const code = randomCode(6);
            expect(code).toHaveLength(6);
            expect(code).not.toMatch(/[01ILO]/);
        }
    });

    it('sample devuelve elementos distintos', () => {
        const picked = sample([1, 2, 3, 4], 3);
        expect(new Set(picked).size).toBe(3);
    });
});

describe('safeRedirect', () => {
    it('acepta rutas internas con query y hash', () => {
        expect(safeRedirect('/profile')).toBe('/profile');
        expect(safeRedirect('/invite/abc?x=1#y')).toBe('/invite/abc?x=1#y');
    });

    it.each([
        ['//evil.com'],
        ['/\\evil.com'],
        ['https://evil.com'],
        ['javascript:alert(1)'],
        ['profile'],
        [''],
        [null],
    ])('rechaza %p', target => {
        expect(safeRedirect(target)).toBe('/');
    });
});
