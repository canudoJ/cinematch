import type { LucideIcon } from 'lucide-react';
import { Sun, Laugh, Frown, Zap, Brain, Heart, Users, Trophy, Ghost, Rocket, Sparkles, Film, Star, Tag } from 'lucide-react';

// ---------------------------------------------------------------------------
// Tags de barajas
// ---------------------------------------------------------------------------

export const MAX_DECK_TAGS = 5;

/** Tags sugeridos agrupados por categoría (la clave se traduce en la UI) */
export const SUGGESTED_TAGS = {
    moods: ['Chill', 'Risas', 'Llorar', 'Tensión', 'Mind-bending'],
    occasions: ['Cita', 'Amigos', 'Domingo', 'Maratón'],
    genres: ['Terror', 'Sci-Fi', 'Fantasía', 'Anime', 'Clásicos'],
} as const;

export type TagCategory = keyof typeof SUGGESTED_TAGS;

const TAG_TO_ICON: Record<string, LucideIcon> = {
    Chill: Sun,
    Risas: Laugh,
    Llorar: Frown,
    'Tensión': Zap,
    'Mind-bending': Brain,
    Cita: Heart,
    Amigos: Users,
    Domingo: Sun,
    Maratón: Trophy,
    Terror: Ghost,
    'Sci-Fi': Rocket,
    Fantasía: Sparkles,
    Anime: Film,
    Clásicos: Star,
};

/**
 * Quita emojis y símbolos de un tag guardado ("🔥 Clásicos" → "Clásicos").
 * Usa Extended_Pictographic: \p{Emoji} también casaría con dígitos ("Top 10" → "Top").
 */
export const getTagLabel = (tag: string): string =>
    tag.replace(/[\p{Extended_Pictographic}️‍]/gu, '').replace(/\s+/g, ' ').trim();

export const getTagIcon = (tag: string): LucideIcon => TAG_TO_ICON[getTagLabel(tag)] ?? Tag;

/**
 * Normaliza lo que escribe el usuario: si coincide (sin distinguir mayúsculas)
 * con un tag sugerido usa su forma canónica; si no, el texto limpio.
 * Devuelve '' si no queda nada que añadir.
 */
export function normalizeTag(input: string): string {
    const label = getTagLabel(input);
    if (!label) return '';
    const suggested = Object.values(SUGGESTED_TAGS).flat() as string[];
    return suggested.find(s => s.toLowerCase() === label.toLowerCase()) ?? label;
}

// ---------------------------------------------------------------------------
// Géneros de TMDB (películas)
// ---------------------------------------------------------------------------

export const TMDB_GENRES = [
    { id: 28, name: 'Acción', name_en: 'Action' },
    { id: 12, name: 'Aventura', name_en: 'Adventure' },
    { id: 16, name: 'Animación', name_en: 'Animation' },
    { id: 35, name: 'Comedia', name_en: 'Comedy' },
    { id: 80, name: 'Crimen', name_en: 'Crime' },
    { id: 99, name: 'Documental', name_en: 'Documentary' },
    { id: 18, name: 'Drama', name_en: 'Drama' },
    { id: 10751, name: 'Familiar', name_en: 'Family' },
    { id: 14, name: 'Fantasía', name_en: 'Fantasy' },
    { id: 36, name: 'Historia', name_en: 'History' },
    { id: 27, name: 'Terror', name_en: 'Horror' },
    { id: 10402, name: 'Música', name_en: 'Music' },
    { id: 9648, name: 'Misterio', name_en: 'Mystery' },
    { id: 10749, name: 'Romance', name_en: 'Romance' },
    { id: 878, name: 'Ciencia ficción', name_en: 'Science Fiction' },
    { id: 10770, name: 'Película de TV', name_en: 'TV Movie' },
    { id: 53, name: 'Suspense', name_en: 'Thriller' },
    { id: 10752, name: 'Guerra', name_en: 'War' },
    { id: 37, name: 'Western', name_en: 'Western' },
];
