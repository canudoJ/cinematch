import { genreAccent } from '../genreColors';

describe('genreAccent', () => {
    it('da el mismo color a un género en español y en inglés', () => {
        expect(genreAccent('Terror')).toBe(genreAccent('Horror'));
        expect(genreAccent('Ciencia ficción')).toBe(genreAccent('Science Fiction'));
    });

    it('no distingue mayúsculas', () => {
        expect(genreAccent('comedia')).toBe(genreAccent('Comedia'));
    });

    it('usa colores con significado para géneros conocidos', () => {
        expect(genreAccent('Terror')).toBe('var(--media-pink)');
        expect(genreAccent('Comedia')).toBe('var(--media-amber)');
        expect(genreAccent('Ciencia ficción')).toBe('var(--media-cyan)');
    });

    it('un género desconocido recibe siempre el mismo color de la paleta', () => {
        const color = genreAccent('Cine quinqui');
        expect(color).toMatch(/^var\(--media-/);
        expect(genreAccent('Cine quinqui')).toBe(color);
    });
});
