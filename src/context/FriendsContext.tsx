'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';
import { assertUuid, getFriendshipsBetween } from '@/lib/friends';
import type { Friend, FriendRequest, ProfileSummary } from '@/types';

export type FriendshipErrorCode = 'already_friends' | 'already_pending' | 'self' | 'not_found' | 'unknown';

/** Error con código para que la interfaz muestre un mensaje traducido */
export class FriendshipError extends Error {
    constructor(public code: FriendshipErrorCode) {
        super(code);
    }
}

interface FriendsContextType {
    friends: Friend[];
    /** Solicitudes recibidas pendientes */
    requests: FriendRequest[];
    /** Usuarios a los que he enviado una solicitud aún pendiente */
    outgoingIds: Set<string>;
    loading: boolean;
    refresh: () => Promise<void>;
    /** Busca usuarios por nombre (excluye a uno mismo y a los amigos) */
    searchUsers: (query: string) => Promise<ProfileSummary[]>;
    /** Envía una solicitud; si el otro ya me la había enviado, la acepta */
    sendRequest: (userId: string) => Promise<'sent' | 'accepted'>;
    acceptRequest: (friendshipId: string) => Promise<void>;
    rejectRequest: (friendshipId: string) => Promise<void>;
    removeFriend: (friendshipId: string) => Promise<void>;
}

const FriendsContext = createContext<FriendsContextType | undefined>(undefined);

const PROFILE_FIELDS = 'id, username, avatar_url, level';

interface FriendshipWithProfiles {
    id: string;
    requester_id: string;
    receiver_id: string;
    status: string;
    created_at: string;
    requester: ProfileSummary | null;
    receiver: ProfileSummary | null;
}

/** Escapa los comodines de LIKE para que "%" no liste a todos los usuarios */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, char => `\\${char}`);

/** Amistades aceptadas y solicitudes pendientes del usuario (null si falla la consulta) */
async function loadFriendships(userId: string): Promise<{ friends: Friend[]; requests: FriendRequest[]; outgoing: string[] } | null> {
    const id = assertUuid(userId);
    const { data, error } = await supabase
        .from('friendships')
        .select(`id, requester_id, receiver_id, status, created_at,
            requester:profiles!requester_id(${PROFILE_FIELDS}),
            receiver:profiles!receiver_id(${PROFILE_FIELDS})`)
        .or(`requester_id.eq.${id},receiver_id.eq.${id}`)
        .in('status', ['accepted', 'pending'])
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Error loading friends:', error.message);
        return null;
    }

    const friends: Friend[] = [];
    const requests: FriendRequest[] = [];
    const outgoing: string[] = [];
    ((data ?? []) as unknown as FriendshipWithProfiles[]).forEach(row => {
        const iAmRequester = row.requester_id === id;
        const other = iAmRequester ? row.receiver : row.requester;
        if (row.status === 'accepted' && other) {
            friends.push({ ...other, friendshipId: row.id });
        } else if (row.status === 'pending' && iAmRequester) {
            outgoing.push(row.receiver_id);
        } else if (row.status === 'pending' && row.requester) {
            requests.push({ id: row.id, requester: row.requester, created_at: row.created_at });
        }
    });
    return { friends, requests, outgoing };
}

export function FriendsProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const userId = user?.id ?? null;
    const [state, setState] = useState<{ owner: string | null; friends: Friend[]; requests: FriendRequest[]; outgoing: string[] }>({
        owner: null, friends: [], requests: [], outgoing: [],
    });

    const refresh = useCallback(async () => {
        if (!userId) return;
        const result = await loadFriendships(userId);
        if (result) setState({ owner: userId, ...result });
    }, [userId]);

    // Un único canal Realtime para toda la app (antes cada componente abría el suyo con el mismo nombre)
    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        let latest = 0;
        const reload = () => {
            const requestId = ++latest;
            void loadFriendships(userId).then(result => {
                if (!cancelled && result && requestId === latest) setState({ owner: userId, ...result });
            });
        };
        reload();
        const channel = supabase
            .channel(`friendships-${userId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `requester_id=eq.${userId}` }, reload)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `receiver_id=eq.${userId}` }, reload)
            .subscribe();
        return () => {
            cancelled = true;
            void supabase.removeChannel(channel);
        };
    }, [userId]);

    const current = state.owner === userId ? state : null;
    /** Cargando = aún no hay datos de este usuario */
    const loading = !!userId && !current;
    const friends = useMemo(() => current?.friends ?? [], [current]);
    const requests = useMemo(() => current?.requests ?? [], [current]);
    const outgoingIds = useMemo(() => new Set(current?.outgoing ?? []), [current]);

    const searchUsers = useCallback(async (query: string): Promise<ProfileSummary[]> => {
        const term = query.trim();
        if (!userId || term.length < 2) return [];
        const { data, error } = await supabase
            .from('profiles')
            .select(PROFILE_FIELDS)
            .ilike('username', `%${escapeLike(term)}%`)
            .neq('id', userId)
            .not('username', 'is', null)
            .limit(20);
        if (error) throw new FriendshipError('unknown');
        const friendIds = new Set(friends.map(f => f.id));
        return ((data ?? []) as ProfileSummary[]).filter(p => !friendIds.has(p.id));
    }, [userId, friends]);

    const acceptRequest = useCallback(async (friendshipId: string) => {
        if (!userId) return;
        const { error } = await supabase
            .from('friendships')
            .update({ status: 'accepted' })
            .eq('id', friendshipId)
            .eq('receiver_id', userId);
        if (error) throw new FriendshipError('unknown');
        await refresh();
    }, [userId, refresh]);

    const sendRequest = useCallback(async (otherId: string): Promise<'sent' | 'accepted'> => {
        if (!userId) throw new FriendshipError('unknown');
        if (otherId === userId) throw new FriendshipError('self');

        const existing = await getFriendshipsBetween(userId, otherId).catch(() => {
            throw new FriendshipError('unknown');
        });
        if (existing.some(f => f.status === 'accepted')) throw new FriendshipError('already_friends');

        const theirPending = existing.find(f => f.status === 'pending' && f.requester_id === otherId);
        if (theirPending) {
            await acceptRequest(theirPending.id);
            return 'accepted';
        }
        if (existing.some(f => f.status === 'pending')) throw new FriendshipError('already_pending');

        // Una solicitud rechazada en mi dirección impediría insertar otra (UNIQUE requester/receiver)
        const declinedMine = existing.find(f => f.status === 'declined' && f.requester_id === userId);
        if (declinedMine) await supabase.from('friendships').delete().eq('id', declinedMine.id);

        const { error } = await supabase
            .from('friendships')
            .insert({ requester_id: userId, receiver_id: otherId, status: 'pending' });
        if (error) throw new FriendshipError(error.code === '23503' ? 'not_found' : 'unknown');
        setState(prev => ({ ...prev, outgoing: [...prev.outgoing, otherId] }));
        return 'sent';
    }, [userId, acceptRequest]);

    const rejectRequest = useCallback(async (friendshipId: string) => {
        if (!userId) return;
        const { error } = await supabase
            .from('friendships')
            .update({ status: 'declined' })
            .eq('id', friendshipId)
            .eq('receiver_id', userId);
        if (error) throw new FriendshipError('unknown');
        setState(prev => ({ ...prev, requests: prev.requests.filter(r => r.id !== friendshipId) }));
    }, [userId]);

    const removeFriend = useCallback(async (friendshipId: string) => {
        if (!userId) return;
        // RLS solo permite borrar amistades propias
        const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
        if (error) throw new FriendshipError('unknown');
        setState(prev => ({ ...prev, friends: prev.friends.filter(f => f.friendshipId !== friendshipId) }));
    }, [userId]);

    const value = useMemo<FriendsContextType>(() => ({
        friends, requests, outgoingIds, loading, refresh,
        searchUsers, sendRequest, acceptRequest, rejectRequest, removeFriend,
    }), [friends, requests, outgoingIds, loading, refresh, searchUsers, sendRequest, acceptRequest, rejectRequest, removeFriend]);

    return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

export function useFriends() {
    const context = useContext(FriendsContext);
    if (context === undefined) {
        throw new Error('useFriends must be used within a FriendsProvider');
    }
    return context;
}
