import { shuffle } from '@/lib/random';

/**
 * Torneo de "muerte súbita": los candidatos se enfrentan por parejas y el elegido
 * pasa a la siguiente ronda hasta que queda uno. Funciones puras (sin React).
 */
export interface TournamentState<T> {
    /** Candidatos de la ronda actual */
    candidates: T[];
    /** Elegidos que pasan a la siguiente ronda */
    nextRound: T[];
    /** Índice del primer candidato del enfrentamiento actual (0, 2, 4…) */
    pairIndex: number;
    /** Ronda actual (desde 1) y rondas totales hasta la final */
    round: number;
    totalRounds: number;
}

/** Fase con nombre propio según los candidatos que quedan */
export type TournamentStage = 'final' | 'semifinal' | 'quarterfinal' | null;

/** Rondas necesarias para dejar un ganador (cada ronda reduce a la mitad, redondeando hacia arriba) */
export function roundsFor(count: number): number {
    let rounds = 0;
    for (let left = count; left > 1; left = Math.ceil(left / 2)) rounds++;
    return rounds;
}

export function startTournament<T>(items: readonly T[], random?: () => number): TournamentState<T> {
    return { candidates: shuffle(items, random), nextRound: [], pairIndex: 0, round: 1, totalRounds: roundsFor(items.length) };
}

export function currentPair<T>(state: TournamentState<T>): [T, T] | null {
    const left = state.candidates[state.pairIndex];
    const right = state.candidates[state.pairIndex + 1];
    return left !== undefined && right !== undefined ? [left, right] : null;
}

/** Enfrentamiento actual dentro de la ronda: "1 de 3" */
export function duelProgress<T>(state: TournamentState<T>): { current: number; total: number } {
    return { current: state.pairIndex / 2 + 1, total: Math.floor(state.candidates.length / 2) };
}

/** Final (2 candidatos), semifinal (3-4) o cuartos (5-8); antes, solo "ronda X" */
export function stageOf<T>(state: TournamentState<T>): TournamentStage {
    const count = state.candidates.length;
    if (count <= 2) return 'final';
    if (count <= 4) return 'semifinal';
    if (count <= 8) return 'quarterfinal';
    return null;
}

/**
 * Registra la elección del enfrentamiento actual. Devuelve el nuevo estado o, si ya hay
 * ganador, `{ winner }`. Un candidato sin pareja pasa directamente de ronda.
 */
export function choose<T>(
    state: TournamentState<T>,
    chosen: T,
    random?: () => number,
): TournamentState<T> | { winner: T } {
    const nextRound = [...state.nextRound, chosen];
    const nextPair = state.pairIndex + 2;
    const remaining = state.candidates.length - nextPair;

    if (remaining >= 2) return { ...state, nextRound, pairIndex: nextPair };

    // Fin de ronda: el impar (si lo hay) pasa sin jugar
    const survivors = remaining === 1 ? [...nextRound, state.candidates[nextPair]] : nextRound;
    if (survivors.length === 1) return { winner: survivors[0] };
    return { candidates: shuffle(survivors, random), nextRound: [], pairIndex: 0, round: state.round + 1, totalRounds: state.totalRounds };
}
