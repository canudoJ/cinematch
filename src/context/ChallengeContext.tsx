'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Movie } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';

export type ChallengeStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface Challenge {
    id: string;
    movie: Movie;
    sender: string;
    senderId?: string;
    receiverId?: string;
    receiverName?: string;
    timestamp: number;
    status: ChallengeStatus;
}

interface ChallengeContextType {
    // Retos recibidos pendientes (usados por SwipeDeck overlay)
    pendingChallenges: Challenge[];
    // Historial completo de retos recibidos (pending + resueltos)
    receivedChallenges: Challenge[];
    // Retos enviados por el usuario
    sentChallenges: Challenge[];
    // El primer reto pendiente activo (convenencia para SwipeDeck)
    activeChallenge: Challenge | null;
    sendChallenge: (movie: Movie, friendId: string) => Promise<void>;
    // Resuelve el activeChallenge actual
    resolveChallenge: (accepted: boolean) => Promise<void>;
    loading: boolean;
}

const ChallengeContext = createContext<ChallengeContextType | undefined>(undefined);

export function ChallengeProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [pendingChallenges, setPendingChallenges] = useState<Challenge[]>([]);
    const [receivedChallenges, setReceivedChallenges] = useState<Challenge[]>([]);
    const [sentChallenges, setSentChallenges] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(false);

    // El reto activo es siempre el primero pendiente
    const activeChallenge = pendingChallenges[0] ?? null;

    // ---------------------------------------------------------------------------
    // Helper: mapear row de DB a Challenge
    // ---------------------------------------------------------------------------
    const mapRow = (c: any, senderName: string): Challenge => ({
        id: c.id,
        movie: {
            id: c.movie_id?.toString() ?? '',
            title: c.movie_title ?? '',
            image: c.movie_image ?? '',
            year: c.movie_year ?? 0,
            type: (c.movie_type ?? 'movie') as 'movie' | 'tv',
            rating: c.movie_rating ? parseFloat(c.movie_rating) : 0,
            synopsis: '',
            synopsis_es: '',
            genres: []
        },
        sender: senderName,
        senderId: c.sender_id,
        receiverId: c.receiver_id,
        timestamp: new Date(c.created_at).getTime(),
        status: c.status as ChallengeStatus
    });

    // ---------------------------------------------------------------------------
    // Fetch desde Supabase
    // ---------------------------------------------------------------------------
    const fetchChallenges = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Recibidos (todos los estados para el historial)
            const { data: received, error: receivedError } = await supabase
                .from('challenges')
                .select('id, sender_id, receiver_id, movie_id, movie_title, movie_image, movie_year, movie_rating, movie_type, status, created_at')
                .eq('receiver_id', user.id)
                .order('created_at', { ascending: false });

            if (receivedError) throw receivedError;

            // Enviados
            const { data: sent, error: sentError } = await supabase
                .from('challenges')
                .select('id, sender_id, receiver_id, movie_id, movie_title, movie_image, movie_year, movie_rating, movie_type, status, created_at')
                .eq('sender_id', user.id)
                .order('created_at', { ascending: false });

            if (sentError) throw sentError;

            if (received && received.length > 0) {
                // Obtener perfiles de remitentes
                const senderIds = [...new Set(received.map((c: any) => c.sender_id).filter(Boolean))];
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, username')
                    .in('id', senderIds);
                const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.username]));

                const mapped: Challenge[] = received.map((c: any) =>
                    mapRow(c, profileMap.get(c.sender_id) || 'Usuario')
                );
                setReceivedChallenges(mapped);
                setPendingChallenges(mapped.filter(c => c.status === 'pending'));
            } else {
                setReceivedChallenges([]);
                setPendingChallenges([]);
            }

            if (sent && sent.length > 0) {
                // Obtener perfiles de receptores
                const receiverIds = [...new Set(sent.map((c: any) => c.receiver_id).filter(Boolean))];
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, username')
                    .in('id', receiverIds);
                const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.username]));

                const mapped: Challenge[] = sent.map((c: any) => ({
                    ...mapRow(c, profileMap.get(c.receiver_id) || 'Amigo'),
                    receiverName: profileMap.get(c.receiver_id) || 'Amigo'
                }));
                setSentChallenges(mapped);
            } else {
                setSentChallenges([]);
            }
        } catch (error) {
            console.error('Error fetching challenges:', error);
            // Fallback localStorage
            try {
                const stored = localStorage.getItem(`cinematch_challenges_${user.id}`);
                if (stored) {
                    const parsed: Challenge[] = JSON.parse(stored);
                    setReceivedChallenges(parsed);
                    setPendingChallenges(parsed.filter(c => c.status === 'pending'));
                }
                const storedSent = localStorage.getItem(`cinematch_sent_challenges_${user.id}`);
                if (storedSent) setSentChallenges(JSON.parse(storedSent));
            } catch (e) {
                console.error('localStorage fallback failed', e);
            }
        } finally {
            setLoading(false);
        }
    }, [user]);

    // ---------------------------------------------------------------------------
    // Carga inicial + Supabase Realtime (sustituye al setInterval)
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (!user) {
            setPendingChallenges([]);
            setReceivedChallenges([]);
            setSentChallenges([]);
            return;
        }

        fetchChallenges();

        const channel = supabase
            .channel(`challenges-${user.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'challenges',
                filter: `receiver_id=eq.${user.id}`
            }, () => fetchChallenges())
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'challenges',
                filter: `receiver_id=eq.${user.id}`
            }, () => fetchChallenges())
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'challenges',
                filter: `sender_id=eq.${user.id}`
            }, () => fetchChallenges())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchChallenges]);

    // ---------------------------------------------------------------------------
    // Enviar reto
    // ---------------------------------------------------------------------------
    const sendChallenge = async (movie: Movie, friendId: string) => {
        if (!user) throw new Error('Usuario no autenticado');
        if (!movie?.id || !movie?.title) throw new Error('Película inválida');
        if (friendId === user.id) throw new Error('No puedes enviarte un reto a ti mismo');

        const movieId = parseInt(movie.id);
        if (isNaN(movieId)) throw new Error('ID de película inválido');

        const { data: friendProfile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', friendId)
            .single();

        const friendName = friendProfile?.username ?? 'Amigo';

        const { data: challengeData, error } = await supabase
            .from('challenges')
            .insert({
                sender_id: user.id,
                receiver_id: friendId,
                movie_id: movieId,
                movie_title: movie.title,
                movie_image: movie.image ?? '',
                movie_year: movie.year ?? null,
                movie_rating: movie.rating ?? null,
                movie_type: movie.type ?? 'movie',
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw new Error(error.message);

        // Actualización optimista
        const newChallenge: Challenge = {
            id: challengeData.id,
            movie,
            sender: friendName,
            receiverName: friendName,
            senderId: user.id,
            receiverId: friendId,
            timestamp: Date.now(),
            status: 'pending'
        };
        setSentChallenges(prev => [newChallenge, ...prev]);
    };

    // ---------------------------------------------------------------------------
    // Resolver el reto activo
    // ---------------------------------------------------------------------------
    const resolveChallenge = async (accepted: boolean) => {
        if (!activeChallenge || !user) return;

        const newStatus: ChallengeStatus = accepted ? 'accepted' : 'declined';

        try {
            await supabase
                .from('challenges')
                .update({ status: newStatus })
                .eq('id', activeChallenge.id)
                .eq('receiver_id', user.id);
        } catch (error) {
            console.error('Error resolving challenge:', error);
        }

        // Actualización optimista local
        setPendingChallenges(prev => prev.filter(c => c.id !== activeChallenge.id));
        setReceivedChallenges(prev =>
            prev.map(c => c.id === activeChallenge.id ? { ...c, status: newStatus } : c)
        );
    };

    return (
        <ChallengeContext.Provider value={{
            pendingChallenges,
            receivedChallenges,
            sentChallenges,
            activeChallenge,
            sendChallenge,
            resolveChallenge,
            loading
        }}>
            {children}
        </ChallengeContext.Provider>
    );
}

export function useChallenge() {
    const context = useContext(ChallengeContext);
    if (context === undefined) {
        throw new Error('useChallenge must be used within a ChallengeProvider');
    }
    return context;
}
