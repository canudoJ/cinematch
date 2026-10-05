'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';
import { fetchProfilesMap } from '@/lib/friends';
import type { ChallengeRow, ChallengeStatus, Movie, ProfileSummary } from '@/types';

export interface Challenge {
    id: string;
    movie: Movie;
    /** El otro usuario: quien lo envió (recibidos) o a quien se envió (enviados) */
    counterpartId: string;
    counterpartName: string;
    createdAt: number;
    status: ChallengeStatus;
}

interface ChallengeContextType {
    /** Recibidos pendientes, el más reciente primero (se muestran sobre el feed) */
    pendingChallenges: Challenge[];
    /** Historial de recibidos */
    receivedChallenges: Challenge[];
    sentChallenges: Challenge[];
    sendChallenge: (movie: Movie, friendId: string, friendName?: string) => Promise<void>;
    resolveChallenge: (challengeId: string, accepted: boolean) => Promise<boolean>;
}

const ChallengeContext = createContext<ChallengeContextType | undefined>(undefined);

const CHALLENGE_COLUMNS = 'id, sender_id, receiver_id, movie_id, movie_title, movie_image, movie_year, movie_rating, movie_type, status, created_at';

function toChallenge(row: ChallengeRow, counterpartId: string, profiles: Map<string, ProfileSummary>): Challenge {
    return {
        id: row.id,
        movie: {
            id: String(row.movie_id),
            type: row.movie_type ?? 'movie',
            title: row.movie_title,
            image: row.movie_image ?? '',
            year: row.movie_year ?? 0,
            rating: Number(row.movie_rating ?? 0),
            synopsis: '',
            genres: [],
        },
        counterpartId,
        counterpartName: profiles.get(counterpartId)?.username ?? '',
        createdAt: new Date(row.created_at).getTime(),
        status: row.status,
    };
}

/** Retos recibidos y enviados del usuario (null si falla la consulta) */
async function loadChallenges(userId: string): Promise<{ received: Challenge[]; sent: Challenge[] } | null> {
    const [receivedRes, sentRes] = await Promise.all([
        supabase.from('challenges').select(CHALLENGE_COLUMNS).eq('receiver_id', userId).order('created_at', { ascending: false }),
        supabase.from('challenges').select(CHALLENGE_COLUMNS).eq('sender_id', userId).order('created_at', { ascending: false }),
    ]);
    if (receivedRes.error || sentRes.error) {
        console.error('Error loading challenges:', (receivedRes.error ?? sentRes.error)?.message);
        return null;
    }
    const received = (receivedRes.data ?? []) as ChallengeRow[];
    const sent = (sentRes.data ?? []) as ChallengeRow[];
    const profiles = await fetchProfilesMap([...received.map(c => c.sender_id), ...sent.map(c => c.receiver_id)]);
    return {
        received: received.map(c => toChallenge(c, c.sender_id, profiles)),
        sent: sent.map(c => toChallenge(c, c.receiver_id, profiles)),
    };
}

export function ChallengeProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const userId = user?.id ?? null;
    const [lists, setLists] = useState<{ owner: string | null; received: Challenge[]; sent: Challenge[] }>({
        owner: null, received: [], sent: [],
    });

    // Carga inicial + Realtime (retos que llegan, que se responden y que envío desde otro dispositivo)
    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        let latest = 0;
        const refresh = () => {
            const requestId = ++latest;
            void loadChallenges(userId).then(result => {
                if (!cancelled && result && requestId === latest) setLists({ owner: userId, ...result });
            });
        };
        refresh();
        const channel = supabase
            .channel(`challenges-${userId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges', filter: `receiver_id=eq.${userId}` }, refresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges', filter: `sender_id=eq.${userId}` }, refresh)
            .subscribe();
        return () => {
            cancelled = true;
            void supabase.removeChannel(channel);
        };
    }, [userId]);

    const current = lists.owner === userId ? lists : { received: [], sent: [] };
    const receivedChallenges = current.received;
    const sentChallenges = current.sent;
    const pendingChallenges = useMemo(
        () => receivedChallenges.filter(c => c.status === 'pending'),
        [receivedChallenges],
    );

    const sendChallenge = useCallback(async (movie: Movie, friendId: string, friendName = '') => {
        if (!userId) throw new Error('Not authenticated');
        if (friendId === userId) throw new Error('Cannot challenge yourself');
        const movieId = Number(movie.id);
        if (!Number.isInteger(movieId) || !movie.title) throw new Error('Invalid movie');

        const { data, error } = await supabase
            .from('challenges')
            .insert({
                sender_id: userId,
                receiver_id: friendId,
                movie_id: movieId,
                movie_title: movie.title,
                movie_image: movie.image || null,
                movie_year: movie.year || null,
                movie_rating: movie.rating ?? null,
                movie_type: movie.type,
                status: 'pending',
            })
            .select('id')
            .single();
        if (error) throw error;

        const created: Challenge = {
            id: (data as { id: string }).id,
            movie,
            counterpartId: friendId,
            counterpartName: friendName,
            createdAt: Date.now(),
            status: 'pending',
        };
        setLists(prev => ({ ...prev, sent: [created, ...prev.sent] }));
    }, [userId]);

    const resolveChallenge = useCallback(async (challengeId: string, accepted: boolean) => {
        if (!userId) return false;
        const status: ChallengeStatus = accepted ? 'accepted' : 'declined';
        const setStatus = (next: ChallengeStatus) => setLists(prev => ({
            ...prev,
            received: prev.received.map(c => (c.id === challengeId ? { ...c, status: next } : c)),
        }));

        setStatus(status); // optimista
        const { error } = await supabase
            .from('challenges')
            .update({ status })
            .eq('id', challengeId)
            .eq('receiver_id', userId);
        if (error) {
            console.error('Error resolving challenge:', error.message);
            setStatus('pending');
            return false;
        }
        return true;
    }, [userId]);

    const value = useMemo<ChallengeContextType>(() => ({
        pendingChallenges, receivedChallenges, sentChallenges, sendChallenge, resolveChallenge,
    }), [pendingChallenges, receivedChallenges, sentChallenges, sendChallenge, resolveChallenge]);

    return <ChallengeContext.Provider value={value}>{children}</ChallengeContext.Provider>;
}

export function useChallenge() {
    const context = useContext(ChallengeContext);
    if (context === undefined) {
        throw new Error('useChallenge must be used within a ChallengeProvider');
    }
    return context;
}
