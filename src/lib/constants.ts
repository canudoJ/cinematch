import type { LucideIcon } from 'lucide-react';
import { Sun, Laugh, Frown, Zap, Brain, Heart, Users, Trophy, Ghost, Rocket, Sparkles, Film, Star, Tag } from 'lucide-react';

export const TAG_WARM_BG = 'rgba(255, 110, 90, 0.22)';

export const TAG_TO_ICON: Record<string, LucideIcon> = {
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
    Clásicos: Star
};

export const getTagIcon = (tag: string): LucideIcon => {
    const normalizedTag = tag.replace(/[\p{Emoji}\p{Symbol}]/gu, '').trim();
    return TAG_TO_ICON[normalizedTag] ?? TAG_TO_ICON[tag] ?? Tag;
};

export const getTagLabel = (tag: string): string => {
    return tag.replace(/[\p{Emoji}\p{Symbol}]/gu, '').trim();
};

export const PROVIDERS = [
    { id: '8', name: 'Netflix', color: '#E50914', textColor: 'white' },
    { id: '119', name: 'Prime Video', color: '#00A8E1', textColor: 'white' },
    { id: '337', name: 'Disney+', color: '#113CCF', textColor: 'white' },
    { id: '384', name: 'HBO Max', color: '#9900FF', textColor: 'white' },
    { id: '283', name: 'Crunchyroll', color: '#F47521', textColor: 'black' }
];

export const HBO_PROVIDER_IDS = ['384', '1899']; // IDs para Max y canales legacy

// Helper map for fallback names (ID -> Name)
export const PROVIDER_NAMES: Record<string, string> = PROVIDERS.reduce((acc, p) => {
    acc[p.id] = p.name;
    return acc;
}, {} as Record<string, string>);

// Manual additions for complex mappings (like HBO legacy)
PROVIDER_NAMES['118'] = 'HBO Max';
PROVIDER_NAMES['1796'] = 'Max Amazon Channel';

export const PROVIDER_MAPPING = {
    'HBO Max': [384, 1899, 118], // Max, Max Amazon, HBO Max Legacy
    'Netflix': [8],
    'Amazon Prime Video': [119],
    'Disney+': [337]
};

// Géneros de TMDB (IDs principales)
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
    { id: 37, name: 'Western', name_en: 'Western' }
];
