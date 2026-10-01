'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, Profile } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';

export type FriendRequest = {
    id: string; // Friendship ID
    sender: Profile;
    status: 'pending' | 'accepted' | 'declined';
    created_at?: string;
};

export function useFriends() {
    const { user } = useAuth();
    const [friends, setFriends] = useState<Profile[]>([]);
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [searchResults, setSearchResults] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

    // ---------------------------------------------------------------------------
    // Carga inicial + Supabase Realtime
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (!user) {
            setFriends([]);
            setRequests([]);
            return;
        }

        fetchFriends();
        fetchRequests();

        // Suscripción Realtime a la tabla friendships donde el usuario es parte
        const channel = supabase
            .channel(`friendships-${user.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'friendships',
                filter: `requester_id=eq.${user.id}`
            }, () => {
                fetchFriends();
                fetchRequests();
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'friendships',
                filter: `receiver_id=eq.${user.id}`
            }, () => {
                fetchFriends();
                fetchRequests();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // ---------------------------------------------------------------------------
    // Fetch amigos aceptados
    // ---------------------------------------------------------------------------
    const fetchFriends = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('friendships')
                .select(`
                    id,
                    requester_id,
                    receiver_id,
                    status,
                    requester:profiles!requester_id(id, username, avatar_url, level),
                    receiver:profiles!receiver_id(id, username, avatar_url, level)
                `)
                .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .eq('status', 'accepted');

            if (error) throw error;

            if (data) {
                const mappedFriends = data.map((f: any) => {
                    const friendProfile = f.requester_id === user.id ? f.receiver : f.requester;
                    return {
                        ...friendProfile,
                        friendshipId: f.id
                    };
                });
                setFriends(mappedFriends);
            }
        } catch (error) {
            console.error('Error fetching friends:', error);
        } finally {
            setLoading(false);
        }
    };

    // ---------------------------------------------------------------------------
    // Fetch solicitudes de amistad pendientes (el usuario es receiver)
    // ---------------------------------------------------------------------------
    const fetchRequests = async () => {
        if (!user) return;
        setRequestsLoading(true);

        try {
            const { data, error } = await supabase
                .from('friendships')
                .select(`
                    id,
                    requester_id,
                    receiver_id,
                    status,
                    created_at,
                    requester:profiles!requester_id(id, username, avatar_url, level)
                `)
                .eq('receiver_id', user.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const mappedRequests: FriendRequest[] = data.map((f: any) => ({
                    id: f.id,
                    sender: f.requester,
                    status: f.status,
                    created_at: f.created_at
                }));
                setRequests(mappedRequests);
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setRequestsLoading(false);
        }
    };

    // ---------------------------------------------------------------------------
    // Buscar usuarios por username
    // ---------------------------------------------------------------------------
    const searchUsers = useCallback(async (query: string) => {
        if (!user || !query.trim() || query.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearchLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, level, is_premium')
                .ilike('username', `%${query}%`)
                .neq('id', user.id)
                .limit(20);

            if (error) throw error;

            if (data) {
                const friendIds = new Set(friends.map(f => f.id));
                const requestIds = new Set(requests.map(r => r.sender.id));

                const filtered = data
                    .map((p: any) => ({ ...p, is_premium: p.is_premium ?? false }))
                    .filter((p: Profile) => !friendIds.has(p.id) && !requestIds.has(p.id));

                setSearchResults(filtered);
            }
        } catch (error) {
            console.error('Error searching users:', error);
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    }, [user, friends, requests]);

    // ---------------------------------------------------------------------------
    // Enviar solicitud de amistad
    // ---------------------------------------------------------------------------
    const sendRequest = async (friendIdOrUsername: string) => {
        if (!user) throw new Error('Usuario no autenticado');

        let friendId: string;

        if (friendIdOrUsername.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            friendId = friendIdOrUsername;
        } else {
            const { data: profile, error: searchError } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', friendIdOrUsername)
                .single();

            if (searchError || !profile) throw new Error('Usuario no encontrado');
            friendId = profile.id;
        }

        if (friendId === user.id) throw new Error('No puedes enviarte una solicitud a ti mismo');

        const { data: existing } = await supabase
            .from('friendships')
            .select('id, status')
            .or(`and(requester_id.eq.${user.id},receiver_id.eq.${friendId}),and(requester_id.eq.${friendId},receiver_id.eq.${user.id})`)
            .maybeSingle();

        if (existing) {
            if (existing.status === 'accepted') throw new Error('Ya son amigos');
            if (existing.status === 'pending') throw new Error('Ya existe una solicitud pendiente');
        }

        const { error } = await supabase
            .from('friendships')
            .insert({
                requester_id: user.id,
                receiver_id: friendId,
                status: 'pending'
            });

        if (error) throw error;

        // Feedback optimista inmediato (el Realtime también actualizará)
        setSentRequests(prev => new Set(prev).add(friendId));
    };

    // ---------------------------------------------------------------------------
    // Aceptar solicitud
    // ---------------------------------------------------------------------------
    const acceptRequest = async (friendshipId: string) => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('friendships')
                .update({ status: 'accepted' })
                .eq('id', friendshipId)
                .eq('receiver_id', user.id);

            if (error) throw error;
            // Realtime actualizará automáticamente friends y requests
        } catch (error) {
            console.error('Error accepting request:', error);
            throw error;
        }
    };

    // ---------------------------------------------------------------------------
    // Rechazar solicitud
    // ---------------------------------------------------------------------------
    const rejectRequest = async (friendshipId: string) => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('friendships')
                .update({ status: 'declined' })
                .eq('id', friendshipId)
                .eq('receiver_id', user.id);

            if (error) throw error;
            // Realtime actualizará automáticamente
        } catch (error) {
            console.error('Error rejecting request:', error);
            throw error;
        }
    };

    // ---------------------------------------------------------------------------
    // Cancelar solicitud enviada
    // ---------------------------------------------------------------------------
    const cancelRequest = async (friendshipId: string) => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('friendships')
                .delete()
                .eq('id', friendshipId)
                .eq('requester_id', user.id);

            if (error) throw error;
            // Realtime actualizará automáticamente
        } catch (error) {
            console.error('Error canceling request:', error);
            throw error;
        }
    };

    // ---------------------------------------------------------------------------
    // Eliminar amigo
    // ---------------------------------------------------------------------------
    const removeFriend = async (friendshipId: string) => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('friendships')
                .delete()
                .eq('id', friendshipId)
                .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

            if (error) throw error;
            // Realtime actualizará automáticamente
        } catch (error) {
            console.error('Error removing friend:', error);
            throw error;
        }
    };

    return {
        friends,
        requests,
        searchResults,
        loading,
        searchLoading,
        requestsLoading,
        sentRequests,
        sendRequest,
        fetchFriends,
        fetchRequests,
        searchUsers,
        acceptRequest,
        rejectRequest,
        cancelRequest,
        removeFriend
    };
}
