import { DEFAULT_REGION, justWatchLanguage, regionFromLocale, toTmdbLang } from '../region';

describe('regionFromLocale', () => {
    it('extrae el país de un locale completo', () => {
        expect(regionFromLocale('es-ES')).toBe('ES');
        expect(regionFromLocale('en-GB')).toBe('GB');
        expect(regionFromLocale('pt-BR')).toBe('BR');
    });

    it('completa la región cuando el locale solo trae idioma', () => {
        expect(regionFromLocale('en')).toBe('US');
        expect(regionFromLocale('fr')).toBe('FR');
    });

    it('descarta regiones no geográficas o no soportadas', () => {
        // "419" es Latinoamérica: TMDB no lo acepta como watch_region
        expect(regionFromLocale('es-419')).toBe(DEFAULT_REGION);
        expect(regionFromLocale('ja-JP')).toBe(DEFAULT_REGION);
    });

    it('soporta locales con script', () => {
        expect(regionFromLocale('zh-Hant-TW')).toBe(DEFAULT_REGION);
        expect(regionFromLocale('sr-Latn-RS')).toBe(DEFAULT_REGION);
    });

    it('vuelve a la región por defecto ante valores vacíos o inválidos', () => {
        expect(regionFromLocale(undefined)).toBe(DEFAULT_REGION);
        expect(regionFromLocale('')).toBe(DEFAULT_REGION);
        expect(regionFromLocale('not a locale!!')).toBe(DEFAULT_REGION);
    });
});

describe('idiomas', () => {
    it('mapea el idioma de la app al de TMDB', () => {
        expect(toTmdbLang('es')).toBe('es-ES');
        expect(toTmdbLang('en')).toBe('en-US');
    });

    it('elige el idioma de JustWatch según el país', () => {
        expect(justWatchLanguage('MX')).toBe('es');
        expect(justWatchLanguage('BR')).toBe('pt');
        expect(justWatchLanguage('US')).toBe('en');
    });
});
