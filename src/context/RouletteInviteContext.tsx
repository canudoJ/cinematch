'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import { useLobby } from './LobbyContext';
import { fetchProfilesMap } from '@/lib/friends';
import type { RouletteInvitationRow } from '@/types';

export interface PendingInvite {
    id: string;
    lobbyId: string;
    senderName: string;
}

interface RouletteInviteContextType {
    /** Invitación que se está mostrando (la más antigua de la cola) */
    currentInvite: PendingInvite | null;
    acceptInvite: () => Promise<void>;
    declineInvite: () => Promise<void>;
    /** El anfitrión invita a amigos a su sala */
    sendInvites: (friendIds: string[]) => Promise<boolean>;
}

const RouletteInviteContext = createContext<RouletteInviteContextType | undefined>(undefined);

/** Las invitaciones más antiguas que esto ya no tienen sentido (la partida habrá terminado) */
const INVITE_MAX_AGE_MS = 30 * 60 * 1000;

async function toInvites(rows: RouletteInvitationRow[]): Promise<PendingInvite[]> {
    const senders = await fetchProfilesMap(rows.map(r => r.sender_id));
    return rows.map(r => ({ id: r.id, lobbyId: r.lobby_id, senderName: senders.get(r.sender_id)?.username ?? '' }));
}

export function RouletteInviteProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const router = useRouter();
    const { lobbyId, joinLobbyById, leaveLobby } = useLobby();
    const userId = user?.id ?? null;
    const [queue, setQueue] = useState<{ owner: string | null; invites: PendingInvite[] }>({ owner: null, invites: [] });

    const enqueue = useCallback((owner: string, invites: PendingInvite[]) => {
        setQueue(prev => {
            const base = prev.owner === owner ? prev.invites : [];
            const known = new Set(base.map(i => i.id));
            return { owner, invites: [...base, ...invites.filter(i => !known.has(i.id))] };
        });
    }, []);

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;

        // Invitaciones recibidas mientras no estaba conectado
        void supabase
            .from('roulette_invitations')
            .select('id, lobby_id, sender_id, receiver_id, status, created_at')
            .eq('receiver_id', userId)
            .eq('status', 'pending')
            .gte('created_at', new Date(Date.now() - INVITE_MAX_AGE_MS).toISOString())
            .order('created_at', { ascending: true })
            .then(async ({ data }) => {
                const invites = await toInvites((data ?? []) as RouletteInvitationRow[]);
                if (!cancelled) enqueue(userId, invites);
            });

        const channel = supabase
            .channel(`roulette-invites-${userId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'roulette_invitations', filter: `receiver_id=eq.${userId}` },
                async payload => {
                    const row = payload.new as RouletteInvitationRow;
                    if (row.status !== 'pending') return;
                    const invites = await toInvites([row]);
                    if (!cancelled) enqueue(userId, invites);
                })
            .subscribe();

        return () => {
            cancelled = true;
            void supabase.removeChannel(channel);
        };
    }, [userId, enqueue]);

    const invites = queue.owner === userId ? queue.invites : [];
    const currentInvite = invites[0] ?? null;

    const respond = useCallback(async (invite: PendingInvite, status: 'accepted' | 'declined') => {
        setQueue(prev => ({ ...prev, invites: prev.invites.filter(i => i.id !== invite.id) }));
        if (!userId) return;
        await supabase.from('roulette_invitations').update({ status }).eq('id', invite.id).eq('receiver_id', userId);
    }, [userId]);

    const acceptInvite = useCallback(async () => {
        if (!currentInvite) return;
        const invite = currentInvite;
        await respond(invite, 'accepted');
        if (lobbyId && lobbyId !== invite.lobbyId) await leaveLobby();
        if (await joinLobbyById(invite.lobbyId)) router.push('/roulette-lobby');
    }, [currentInvite, respond, lobbyId, leaveLobby, joinLobbyById, router]);

    const declineInvite = useCallback(async () => {
        if (currentInvite) await respond(currentInvite, 'declined');
    }, [currentInvite, respond]);

    const sendInvites = useCallback(async (friendIds: string[]) => {
        if (!userId || !lobbyId || friendIds.length === 0) return false;
        const { error } = await supabase.from('roulette_invitations').insert(
            friendIds.map(receiverId => ({ lobby_id: lobbyId, sender_id: userId, receiver_id: receiverId, status: 'pending' })),
        );
        if (error) console.error('Error sending roulette invitations:', error.message);
        return !error;
    }, [userId, lobbyId]);

    const value = useMemo(
        () => ({ currentInvite, acceptInvite, declineInvite, sendInvites }),
        [currentInvite, acceptInvite, declineInvite, sendInvites],
    );

    return <RouletteInviteContext.Provider value={value}>{children}</RouletteInviteContext.Provider>;
}

export function useRouletteInvite() {
    const ctx = useContext(RouletteInviteContext);
    if (!ctx) {
        throw new Error('useRouletteInvite must be used within a RouletteInviteProvider');
    }
    return ctx;
}
