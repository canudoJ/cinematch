import { Movie } from './data';

// Simulate bot choices at the start of the session
export function simulateBotSwipes(movies: Movie[]): Set<string> {
    const botLikes = new Set<string>();

    movies.forEach(movie => {
        // Bot logic: Likes high rated movies OR random 40% chance
        const isHighRated = movie.rating >= 8.0;
        const randomChance = Math.random() < 0.4;

        if (isHighRated || randomChance) {
            botLikes.add(movie.id);
        }
    });

    // Force at least one match for the MVP if not already present
    // Let's force index 1 (Poor Things) or index 0 (Dune) to be liked
    if (!botLikes.has(movies[0].id)) botLikes.add(movies[0].id);

    return botLikes;
}
