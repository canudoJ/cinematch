import { fetchContent } from '@/services/tmdb';
import { ContentType } from '@/context/UserContext';

export interface Movie {
    id: string;
    type: ContentType; // Helper to know which endpoint to use for details
    title: string;
    title_es?: string;
    year: number;
    rating: number;
    image: string;
    synopsis: string;
    synopsis_es: string;
    genres: string[];

    providerName?: string; // Legacy/Primary
    watchLink?: string;    // Legacy/Primary
    providers?: { name: string; link: string }[]; // New Multi-Platform Support
    source?: 'challenge' | 'deck' | 'api'; // Origin tracking
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
}

const MOCK_MOVIES: Movie[] = [
    {
        id: '693134', // Real ID for Dune: Part Two
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
    avatar: "🤖",
    bio: "I love Sci-Fi and high-rated Dramas. Let's find a match!"
};


// Helper: Shuffle array
function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Dynamic Fetcher that mixes content
export async function getMovies(platforms: string[] = [], types: ContentType[] = ['movie']): Promise<Movie[]> {
    // Fetch multiple pages to increase catalogue size (e.g., 3 pages -> ~60 items per type)
    const PAGES_TO_FETCH = 3;
    const pages = Array.from({ length: PAGES_TO_FETCH }, (_, i) => i + 1);

    // Create a matrix of promises: [Type x Pages]
    const promises = types.flatMap(type =>
        pages.map(page => fetchContent(type, 'ES', platforms, page).then(results => ({ type, results })))
    );

    try {
        const responses = await Promise.all(promises);

        // Deduplicate using a Map based on ID
        const contentMap = new Map<string, Movie>();

        responses.forEach(({ type, results }) => {
            if (!results) return;
            results.forEach(m => {
                if (!contentMap.has(m.id.toString())) {
                    contentMap.set(m.id.toString(), {
                        id: m.id.toString(),
                        type: type, // Store origin type
                        title: m.title || m.name || 'Unknown Title',
                        year: new Date(m.release_date || m.first_air_date || Date.now()).getFullYear(),
                        rating: m.vote_average,
                        image: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
                        synopsis: m.overview,
                        synopsis_es: m.overview,
                        genres: ['Trending']
                    });
                }
            });
        });

        const allContent = Array.from(contentMap.values());

        if (allContent.length > 0) {
            return shuffleArray(allContent);
        }

        return MOCK_MOVIES;
    } catch (e) {
        console.error("Error fetching movies in parallel", e);
        return MOCK_MOVIES;
    }
}
