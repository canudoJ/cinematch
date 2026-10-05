'use client';

import { useCallback, useRef, useState } from 'react';
import { useLobby } from '@/context/LobbyContext';
import { useDecks } from '@/context/DeckContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import { buildRoundMovies } from '@/services/roulette';
import { ROUND_SECONDS, computeUnanimousMatches, spinRotationFor, wheelCandidates } from '@/lib/roulette';
import { getUserRegion } from '@/lib/region';

/**
 * Acciones del anfitrión de la ruleta. Todas escriben en la sala y el resto de
 * jugadores reacciona vía Realtime; ninguna cambia la pantalla solo en local.
 */
export function useRouletteGame() {
    const { isHost, status, config, players, updateLobby, fetchLikes, clearVotes } = useLobby();
    const { decks, hydrateDeck } = useDecks();
    const { language, t } = useLanguage();
    const { showToast } = useToast();
    const [starting, setStarting] = useState(false);
    /** Ronda (por su hora de fin) que ya se está cerrando: evita cerrarla dos veces */
    const endingRound = useRef<number | null>(null);

    const startRound = useCallback(async () => {
        const rouletteConfig = config?.rouletteConfig;
        if (!isHost || !rouletteConfig || starting) return;
        setStarting(true);
        try {
            const deck = rouletteConfig.sourceType === 'deck' ? decks.find(d => d.id === rouletteConfig.sourceValue) : null;
            const movies = await buildRoundMovies(rouletteConfig, {
                deck: deck ? await hydrateDeck(deck) : null,
                language,
                region: getUserRegion(),
            });
            if (movies.length === 0) {
                showToast(t.noMoreMovies, 'error');
                return;
            }
            await clearVotes(); // los votos de la ronda anterior no deben contar
            await updateLobby({
                status: 'swiping',
                config: {
                    roundMovies: movies,
                    roundEndsAt: Date.now() + ROUND_SECONDS * 1000,
                    noMatch: false,
                    winningMatches: null,
                    matchCount: null,
                    spinRotation: null,
                    winnerId: null,
                },
            });
        } finally {
            setStarting(false);
        }
    }, [config?.rouletteConfig, isHost, starting, decks, hydrateDeck, language, clearVotes, updateLobby, showToast, t.noMoreMovies]);

    /** Cierra la ronda: calcula las películas que han gustado a todos */
    const endRound = useCallback(async () => {
        const endsAt = config?.roundEndsAt;
        if (!isHost || status !== 'swiping' || !endsAt || config?.noMatch || endingRound.current === endsAt) return;
        endingRound.current = endsAt;
        try {
            const likes = await fetchLikes();
            const matches = computeUnanimousMatches(likes, players.map(p => p.id), config.roundMovies ?? []);
            await updateLobby(matches.length === 0
                ? { config: { noMatch: true } }
                : { status: 'spinning', config: { winningMatches: wheelCandidates(matches), matchCount: matches.length, spinRotation: null, winnerId: null } });
        } catch {
            endingRound.current = null; // permitir reintentar
            showToast(t.genericError, 'error');
        }
    }, [config, isHost, status, players, fetchLikes, updateLobby, showToast, t.genericError]);

    const spin = useCallback(async () => {
        const matches = config?.winningMatches ?? [];
        if (!isHost || matches.length === 0 || config?.spinRotation) return;
        const winnerIndex = Math.floor(Math.random() * matches.length);
        await updateLobby({
            config: { spinRotation: spinRotationFor(winnerIndex, matches.length), winnerId: matches[winnerIndex].id },
        });
    }, [config, isHost, updateLobby]);

    /** Sin coincidencias: elegir una película al azar de la ronda */
    const surpriseMe = useCallback(async () => {
        const movies = config?.roundMovies ?? [];
        if (!isHost || movies.length === 0) return;
        const pick = movies[Math.floor(Math.random() * movies.length)];
        await updateLobby({ status: 'finished', config: { winningMatches: [pick], winnerId: pick.id, noMatch: false } });
    }, [config?.roundMovies, isHost, updateLobby]);

    return { startRound, endRound, spin, surpriseMe, starting };
}
