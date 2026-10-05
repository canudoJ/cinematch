import { MAX_WHEEL_SLOTS, computeUnanimousMatches, formatCountdown, resolveMediaTypes, secondsLeft, spinRotationFor, wheelCandidates } from '../roulette';
import { choose, currentPair, duelProgress, roundsFor, stageOf, startTournament, type TournamentState } from '../tournament';
import { answersToQuery, buildQuizDeck, type AffinityAnswers } from '../affinity';
import type { Movie } from '@/types';

const movie = (id: string): Movie => ({ id, type: 'movie', title: id, year: 2020, rating: 7, image: '', synopsis: '', genres: [] });

describe('ruleta', () => {
    const movies = ['a', 'b', 'c'].map(movie);

    it('solo cuenta como match lo que gusta a todos los jugadores', () => {
        const likes = [
            { movie_id: 'a', user_id: 'u1' }, { movie_id: 'a', user_id: 'u2' },
            { movie_id: 'b', user_id: 'u1' },
        ];
        expect(computeUnanimousMatches(likes, ['u1', 'u2'], movies).map(m => m.id)).toEqual(['a']);
    });

    it('ignora los votos de quien ya se fue de la sala', () => {
        const likes = [
            { movie_id: 'b', user_id: 'u1' }, { movie_id: 'b', user_id: 'u2' }, { movie_id: 'b', user_id: 'se-fue' },
        ];
        expect(computeUnanimousMatches(likes, ['u1', 'u2'], movies).map(m => m.id)).toEqual(['b']);
    });

    it('sin jugadores no hay matches', () => {
        expect(computeUnanimousMatches([{ movie_id: 'a', user_id: 'u1' }], [], movies)).toEqual([]);
    });

    it('"Ambos" pide películas y series', () => {
        expect(resolveMediaTypes('both')).toEqual(['movie', 'tv']);
        expect(resolveMediaTypes('tv')).toEqual(['tv']);
    });

    it('el giro deja el centro del gajo ganador bajo el puntero', () => {
        const rotation = spinRotationFor(1, 4, 0); // gajo 1 de 4: centro a 135º
        expect(rotation).toBe(225);
        expect((rotation + 135) % 360).toBe(0);
        expect(spinRotationFor(0, 2)).toBeGreaterThan(360 * 8);
    });

    it('cuenta atrás según la hora de fin', () => {
        expect(secondsLeft(10_000, 4_500)).toBe(6);
        expect(secondsLeft(10_000, 20_000)).toBe(0);
        expect(secondsLeft(null, 0)).toBe(0);
        expect(formatCountdown(65)).toBe('1:05');
    });
});

describe('gajos de la ruleta', () => {
    const rated = (id: string, rating: number): Movie => ({ ...movie(id), rating });

    it('con pocas coincidencias entran todas, en su orden', () => {
        const few = [rated('a', 5), rated('b', 9)];
        expect(wheelCandidates(few)).toEqual(few);
    });

    it('con muchas, entran las mejor valoradas y a igual nota gana el orden de la ronda', () => {
        const many = Array.from({ length: 12 }, (_, i) => rated(`m${i}`, i % 3 === 0 ? 9 : 6));
        const picked = wheelCandidates(many);
        expect(picked).toHaveLength(MAX_WHEEL_SLOTS);
        expect(picked.slice(0, 4).map(m => m.id)).toEqual(['m0', 'm3', 'm6', 'm9']);
        expect(picked.slice(4).map(m => m.id)).toEqual(['m1', 'm2', 'm4', 'm5']);
    });
});

describe('torneo (muerte súbita)', () => {
    const noShuffle = () => 0.999; // con Fisher-Yates mantiene el orden

    it('llega a un ganador eligiendo siempre al primero', () => {
        let state: TournamentState<string> | { winner: string } = startTournament(['a', 'b', 'c', 'd'], noShuffle);
        let guard = 0;
        while (!('winner' in state) && guard++ < 10) {
            const pair = currentPair(state);
            expect(pair).not.toBeNull();
            state = choose(state, pair![0], noShuffle);
        }
        expect('winner' in state && state.winner).toBe('a');
    });

    it('cuenta las rondas hasta la final (con impares, el que sobra pasa sin jugar)', () => {
        expect([1, 2, 3, 4, 5, 8, 9, 10, 16].map(roundsFor)).toEqual([0, 1, 2, 2, 3, 3, 4, 4, 4]);
    });

    it('indica ronda, fase y enfrentamiento dentro de la ronda', () => {
        const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
        let state = startTournament(items, noShuffle);
        expect(state.round).toBe(1);
        expect(state.totalRounds).toBe(4);
        expect(stageOf(state)).toBeNull();
        expect(duelProgress(state)).toEqual({ current: 1, total: 5 });

        state = choose(state, 'a', noShuffle) as TournamentState<string>;
        expect(duelProgress(state)).toEqual({ current: 2, total: 5 });

        // Termina la ronda 1: quedan 5 → cuartos de final
        for (let i = 0; i < 4; i++) state = choose(state, currentPair(state)![0], noShuffle) as TournamentState<string>;
        expect(state.round).toBe(2);
        expect(stageOf(state)).toBe('quarterfinal');
        expect(duelProgress(state)).toEqual({ current: 1, total: 2 });

        // Quedan 3 → semifinal; luego 2 → final
        state = choose(state, currentPair(state)![0], noShuffle) as TournamentState<string>;
        state = choose(state, currentPair(state)![0], noShuffle) as TournamentState<string>;
        expect(state.round).toBe(3);
        expect(stageOf(state)).toBe('semifinal');
        state = choose(state, currentPair(state)![0], noShuffle) as TournamentState<string>;
        expect(state.round).toBe(4);
        expect(stageOf(state)).toBe('final');
        expect(state.round).toBe(state.totalRounds);
    });

    it('el candidato impar pasa de ronda sin jugar', () => {
        const start = startTournament(['a', 'b', 'c'], noShuffle);
        const next = choose(start, 'a', noShuffle) as TournamentState<string>;
        expect(next.candidates.sort()).toEqual(['a', 'c']);
        expect(choose(next, 'c', noShuffle)).toEqual({ winner: 'c' });
    });
});

describe('test de afinidad', () => {
    const base: AffinityAnswers = { vibe: 'cry', style: 'mixed', brain: 'sherlock', duration: 'movie', quality: 'blockbuster' };

    it('combina los géneros con OR (con AND casi nunca había resultados)', () => {
        const query = answersToQuery(base);
        expect(query.with_genres).toContain('|');
        expect(query.with_genres).not.toContain(',');
        expect(query.with_genres?.split('|')).toEqual(expect.arrayContaining(['18', '10752', '9648']));
    });

    it('"maratón" busca series y no filtra por duración', () => {
        const query = answersToQuery({ ...base, duration: 'binge' });
        expect(query.type).toBe('tv');
        expect(query['with_runtime.lte']).toBeUndefined();
    });

    it('animación exige el género y "carne y hueso" lo excluye', () => {
        expect(answersToQuery({ ...base, style: 'animation' }).with_genres).toBe('16');
        expect(answersToQuery({ ...base, style: 'real' }).without_genres).toBe('16');
    });

    it('gourmet sube el listón de nota y placer culpable lo baja', () => {
        expect(answersToQuery({ ...base, quality: 'gourmet' })['vote_average.gte']).toBe(7);
        expect(answersToQuery({ ...base, quality: 'trash' })['vote_average.lte']).toBe(6);
    });

    it('crea una baraja temporal con títulos legibles', () => {
        const deck = buildQuizDeck([movie('1')], { title: 'Tu test: Llorar', description: 'd', creator: 'Tú', tag: 'Test' });
        expect(deck.id.startsWith('temp-')).toBe(true);
        expect(deck.title).toBe('Tu test: Llorar');
        expect(deck.items).toEqual([{ id: '1', type: 'movie' }]);
        expect(deck.moviesLoaded).toBe(true);
    });
});
