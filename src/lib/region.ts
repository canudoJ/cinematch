import type { AppLanguage } from '@/types';

/** Países en los que TMDB y JustWatch tienen catálogo de streaming fiable */
export const SUPPORTED_REGIONS = [
    'ES', 'US', 'GB', 'MX', 'AR', 'CO', 'CL', 'PE', 'FR', 'DE', 'IT', 'PT', 'BR', 'CA', 'NL',
] as const;

export type Region = (typeof SUPPORTED_REGIONS)[number];

export const DEFAULT_REGION: Region = 'ES';

const isSupported = (code: string): code is Region =>
    (SUPPORTED_REGIONS as readonly string[]).includes(code);

/**
 * Deduce el país del usuario a partir de un locale BCP 47 ("es-ES", "es-419", "en", "zh-Hans-CN").
 * Usa Intl.Locale.maximize() para completar la región cuando falta ("en" → "US")
 * y descarta regiones no soportadas o no geográficas ("419").
 */
export function regionFromLocale(locale: string | undefined | null): Region {
    if (!locale) return DEFAULT_REGION;
    try {
        const region = new Intl.Locale(locale).maximize().region?.toUpperCase();
        return region && isSupported(region) ? region : DEFAULT_REGION;
    } catch {
        return DEFAULT_REGION;
    }
}

/** País del navegador actual (o el por defecto en el servidor) */
export function getUserRegion(): Region {
    return regionFromLocale(typeof navigator === 'undefined' ? null : navigator.language);
}

/** Idioma de la app → código de idioma para TMDB */
export function toTmdbLang(language: AppLanguage): string {
    return language === 'es' ? 'es-ES' : 'en-US';
}

/** Idioma de JustWatch adecuado para un país */
export function justWatchLanguage(region: string): string {
    const spanish = ['ES', 'MX', 'AR', 'CO', 'CL', 'PE'];
    if (spanish.includes(region)) return 'es';
    if (region === 'FR') return 'fr';
    if (region === 'DE') return 'de';
    if (region === 'IT') return 'it';
    if (region === 'PT' || region === 'BR') return 'pt';
    if (region === 'NL') return 'nl';
    return 'en';
}
