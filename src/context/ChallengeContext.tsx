'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Movie } from '@/lib/data';
import { getMovies } from '@/lib/data'; // For bot simulation
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';

export type ChallengeStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface Challenge {
    id: string;
    movie: Movie;
    sender: string;
    senderId?: string; // For database challenges
    receiverId?: string; // For database challenges
    receiverName?: string; // For sent challenges display
    timestamp: number;
    status: ChallengeStatus;
}

interface ChallengeContextType {
    pendingChallenges: Challenge[]; // Received challenges waiting for action
    sentChallenges: Challenge[];    // Challenges sent by user
    activeChallenge: Challenge | null;
    sendChallenge: (movie: Movie, friendId: string) => Promise<void>;
    resolveChallenge: (accepted: boolean) => Promise<void>;
    triggerBotChallenge: () => void;
    loading: boolean;
}

const ChallengeContext = createContext<ChallengeContextType | undefined>(undefined);

export function ChallengeProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [pendingChallenges, setPendingChallenges] = useState<Challenge[]>([]);
    const [sentChallenges, setSentChallenges] = useState<Challenge[]>([]);
    const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
    const [loading, setLoading] = useState(false);

    // Load challenges from database
    const fetchChallenges = async () => {
        if (!user) return;

        setLoading(true);
        try {
            // Fetch received challenges (pending)
            const { data: received, error: receivedError } = await supabase
                .from('challenges')
                .select(`
                    id,
                    sender_id,
                    receiver_id,
                    movie_id,
                    movie_title,
                    movie_image,
                    status,
                    created_at,
                    sender:profiles!sender_id(username, avatar_url)
                `)
                .eq('receiver_id', user.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (receivedError) throw receivedError;

            // Fetch sent challenges
            const { data: sent, error: sentError } = await supabase
                .from('challenges')
                .select(`
                    id,
                    sender_id,
                    receiver_id,
                    movie_id,
                    movie_title,
                    movie_image,
                    status,
                    created_at,
                    receiver:profiles!receiver_id(username, avatar_url)
                `)
                .eq('sender_id', user.id)
                .order('created_at', { ascending: false });

            if (sentError) throw sentError;

            // Map received challenges
            if (received) {
                const mappedReceived: Challenge[] = received.map((c: any) => ({
                    id: c.id,
                    movie: {
                        id: c.movie_id.toString(),
                        title: c.movie_title,
                        image: c.movie_image || '',
                        year: 0,
                        type: 'movie',
                        rating: 0,
                        synopsis: '',
                        synopsis_es: '',
                        genres: []
                    },
                    sender: c.sender?.username || 'Usuario',
                    senderId: c.sender_id,
                    receiverId: c.receiver_id,
                    timestamp: new Date(c.created_at).getTime(),
                    status: c.status as ChallengeStatus
                }));
                setPendingChallenges(mappedReceived);
            }

            // Map sent challenges
            if (sent) {
                const mappedSent: Challenge[] = sent.map((c: any) => ({
                    id: c.id,
                    movie: {
                        id: c.movie_id.toString(),
                        title: c.movie_title,
                        image: c.movie_image || '',
                        year: 0,
                        type: 'movie',
                        rating: 0,
                        synopsis: '',
                        synopsis_es: '',
                        genres: []
                    },
                    sender: c.receiver?.username || 'Amigo',
                    receiverName: c.receiver?.username || 'Amigo',
                    senderId: c.sender_id,
                    receiverId: c.receiver_id,
                    timestamp: new Date(c.created_at).getTime(),
                    status: c.status as ChallengeStatus
                }));
                setSentChallenges(mappedSent);
            }

            // Also sync to localStorage as fallback
            try {
                localStorage.setItem('cinematch_challenges', JSON.stringify(received || []));
                localStorage.setItem('cinematch_sent_challenges', JSON.stringify(sent || []));
            } catch (e) {
                console.error('Failed to sync to localStorage', e);
            }
        } catch (error) {
            console.error('Error fetching challenges:', error);
            // Fallback to localStorage
            try {
                const storedPending = localStorage.getItem('cinematch_challenges');
                if (storedPending) setPendingChallenges(JSON.parse(storedPending));

                const storedSent = localStorage.getItem('cinematch_sent_challenges');
                if (storedSent) setSentChallenges(JSON.parse(storedSent));
            } catch (e) {
                console.error("Failed to load from localStorage", e);
            }
        } finally {
            setLoading(false);
        }
    };

    // Load initial state
    useEffect(() => {
        if (user) {
            fetchChallenges();
            const interval = setInterval(fetchChallenges, 5000); // Poll every 5 seconds
            return () => clearInterval(interval);
        }
    }, [user]);

    // Set active challenge if one is pending and none is active
    useEffect(() => {
        if (!activeChallenge && pendingChallenges.length > 0) {
            // Find first pending that is strictly 'pending' status
            const next = pendingChallenges.find(c => c.status === 'pending');
            if (next) setActiveChallenge(next);
        }
    }, [pendingChallenges, activeChallenge]);

    const sendChallenge = async (movie: Movie, friendId: string) => {
        if (!user) throw new Error('Usuario no autenticado');

        try {
            // Get friend's profile for display name
            const { data: friendProfile } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', friendId)
                .single();

            const friendName = friendProfile?.username || 'Amigo';

            // Insert challenge into database
            const { data: challengeData, error } = await supabase
                .from('challenges')
                .insert({
                    sender_id: user.id,
                    receiver_id: friendId,
                    movie_id: parseInt(movie.id),
                    movie_title: movie.title,
                    movie_image: movie.image,
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;

            // Create challenge object for UI
            const newChallenge: Challenge = {
                id: challengeData.id,
                movie,
                sender: friendName,
                receiverName: friendName,
                senderId: user.id,
                receiverId: friendId,
                timestamp: new Date(challengeData.created_at).getTime(),
                status: 'pending'
            };

            // Update sent challenges state
            setSentChallenges(prev => [newChallenge, ...prev]);

            // Also save to localStorage as fallback
            try {
                const currentSent = JSON.parse(localStorage.getItem('cinematch_sent_challenges') || '[]');
                const updatedSent = [newChallenge, ...currentSent];
                localStorage.setItem('cinematch_sent_challenges', JSON.stringify(updatedSent));
            } catch (e) {
                console.error("Failed to save to localStorage", e);
            }
        } catch (error) {
            console.error("Failed to send challenge", error);
            throw error;
        }
    };

    const triggerBotChallenge = async () => {
        // Fetch a random movie or use one from data
        const movies = await getMovies(['8', '119'], ['movie']);
        if (movies.length > 0) {
            const randomMovie = movies[Math.floor(Math.random() * movies.length)];
            const botChallenge: Challenge = {
                id: crypto.randomUUID(),
                movie: randomMovie,
                sender: 'Ana 🤖',
                timestamp: Date.now(),
                status: 'pending'
            };
            addPendingChallenge(botChallenge);
        }
    };

    const resolveChallenge = async (accepted: boolean) => {
        if (!activeChallenge || !user) return;

        try {
            // Update challenge status in database
            const { error } = await supabase
                .from('challenges')
                .update({ status: accepted ? 'accepted' : 'declined' })
                .eq('id', activeChallenge.id)
                .eq('receiver_id', user.id); // Ensure user is the receiver

            if (error) throw error;

            // Remove from pending challenges
            setPendingChallenges(prev => prev.filter(c => c.id !== activeChallenge.id));

            // Update in localStorage
            try {
                const current = JSON.parse(localStorage.getItem('cinematch_challenges') || '[]');
                const updated = current.filter((c: Challenge) => c.id !== activeChallenge.id);
                localStorage.setItem('cinematch_challenges', JSON.stringify(updated));
            } catch (e) {
                console.error("Failed to update localStorage", e);
            }

            // Action
            if (accepted) {
                console.log("Challenge Accepted!", activeChallenge.movie.title);
                // Could trigger "Like" logic here if needed
            }

            setActiveChallenge(null);
        } catch (error) {
            console.error("Failed to resolve challenge", error);
            throw error;
        }
    };

    return (
        <ChallengeContext.Provider value={{ pendingChallenges, sentChallenges, activeChallenge, sendChallenge, resolveChallenge, triggerBotChallenge, loading }}>
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
