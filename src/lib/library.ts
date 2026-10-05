import { normalizeProviderName } from '@/lib/providers';
import type { AppLanguage, ContentType, LibraryMovie } from '@/types';

export type LibrarySort = 'alpha' | 'liked' | 'year';

export interface LibraryFilters {
    query: string;
    type: ContentType | 'all';
    /** Nombres de plataforma (los de PROVIDERS) */
    platforms: string[];
}

/** ¿Está la película en alguna de estas plataformas? */
export function isOnPlatforms(movie: LibraryMovie, platformNames: string[]): boolean {
    if (platformNames.length === 0) return true;
    const wanted = platformNames.map(normalizeProviderName);
    const available = [...(movie.providers ?? []).map(p => p.name), movie.providerName ?? '']
        .filter(Boolean)
        .map(normalizeProviderName);
    return available.some(name => wanted.some(w => name.includes(w)));
}

export function filterLibrary(items: LibraryMovie[], { query, type, platforms }: LibraryFilters): LibraryMovie[] {
    const q = query.trim().toLocaleLowerCase();
    return items.filter(movie =>
        (type === 'all' || movie.type === type)
        && (!q || movie.title.toLocaleLowerCase().includes(q))
        && isOnPlatforms(movie, platforms),
    );
}

export function sortLibrary(items: LibraryMovie[], sort: LibrarySort, language: AppLanguage): LibraryMovie[] {
    const sorted = [...items];
    if (sort === 'alpha') {
        sorted.sort((a, b) => a.title.localeCompare(b.title, language, { sensitivity: 'base' }));
    } else if (sort === 'year') {
        sorted.sort((a, b) => b.year - a.year);
    } else {
        // Más recientes primero
        sorted.sort((a, b) => (b.added_at ?? '').localeCompare(a.added_at ?? ''));
    }
    return sorted;
}
