import { fetchContent } from '@/services/tmdb';
import { ContentType } from '@/context/UserContext';

export interface Movie {
    id: string;
    type: ContentType;
    title: string;
    title_es?: string;
    year: number;
    rating: number;
    image: string;
    synopsis: string;
    synopsis_es: string;
    genres: string[];

    providerName?: string;
    watchLink?: string;
    providers?: { name: string; link: string }[];
    source?: 'challenge' | 'deck' | 'api';
    challengeId?: string;
}

export interface Deck {
    id: string;
    creatorId: string;
    creatorName: string;
    title: string;
    description: string;
    movies: Movie[];
    likes: number;
    isPublic: boolean;
    isOfficial?: boolean;
    creatorAvatar?: string;
    tags?: string[];
    privacy?: 'private' | 'friends' | 'public';
    views?: number;
}

const MOCK_MOVIES: Movie[] = [
    {
        id: '693134',
        type: 'movie',
        title: 'Dune: Part Two',
        year: 2024,
        rating: 8.8,
        image: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
        synopsis: 'Paul Atreides unites with Chani and the Fremen...',
        synopsis_es: 'Paul Atreides se une a Chani y a los Fremen...',
        genres: ['Sci-Fi', 'Action']
    }
];

export const botProfile = {
    name: "CineBot 3000",
    avatar: "",
    bio: "I love Sci-Fi and high-rated Dramas. Let's find a match!"
};

function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Picks PAGES_TO_FETCH random pages from a pool of TOTAL_PAGES_POOL,
 * so each session gets a different slice of TMDB results.
 */
function randomPages(count: number, pool: number): number[] {
    const all = Array.from({ length: pool }, (_, i) => i + 1);
    return shuffleArray(all).slice(0, count);
}

/**
 * Fetches movies/series from TMDB based on user preferences.
 * @param platforms   - Provider IDs (e.g. ['8', '337'])
 * @param types       - Content types: 'movie', 'tv', or both
 * @param region      - 'ES' or 'US'
 * @param genreIds    - Optional TMDB genre IDs to filter by (OR logic, e.g. ['28', '35'])
 * @param seenIds     - Movie/series IDs already shown this session — filtered out of results
 */
export async function getMovies(
    platforms: string[] = [],
    types: ContentType[] = ['movie'],
    region: 'ES' | 'US' = 'ES',
    genreIds: string[] = [],
    seenIds: string[] = [],
    language: 'es' | 'en' = 'es'
): Promise<Movie[]> {
    // Fetch 4 pages chosen randomly from the first 10 pages of TMDB results.
    // This ensures different movies appear across sessions and reloads.
    const pages = randomPages(4, 10);

    // The TMDB language always follows the app language, not the browser region,
    // so synopses are always in the language the user has chosen in the app.
    const tmdbLang = language === 'es' ? 'es-ES' : 'en-US';

    const promises = types.flatMap(type =>
        pages.map(page =>
            fetchContent(type, region, platforms, page, genreIds, tmdbLang)
                .then(results => ({ type, results }))
        )
    );

    try {
        const responses = await Promise.all(promises);
        const seenSet = new Set(seenIds);
        const contentMap = new Map<string, Movie>();

        responses.forEach(({ type, results }) => {
            if (!results) return;
            results.forEach(m => {
                const id = m.id.toString();
                // Skip movies already seen this session
                if (seenSet.has(id)) return;
                if (!contentMap.has(id)) {
                    contentMap.set(id, {
                        id,
                        type,
                        title: m.title || m.name || 'Unknown Title',
                        year: new Date(m.release_date || m.first_air_date || Date.now()).getFullYear(),
                        rating: m.vote_average,
                        image: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
                        synopsis: m.overview,
                        synopsis_es: language === 'es' ? m.overview : '',
                        genres: ['Trending']
                    });
                }
            });
        });

        const allContent = Array.from(contentMap.values());
        return allContent.length > 0 ? shuffleArray(allContent) : MOCK_MOVIES;
    } catch (e) {
        console.error("Error fetching movies in parallel", e);
        return MOCK_MOVIES;
    }
}
