'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import { randomCode } from '@/lib/random';
import { readString, removeKey, writeString } from '@/lib/storage';
import type { VoteRow } from '@/lib/roulette';
import type { LobbyConfig, LobbyMemberRow, LobbyStatus, Player, RouletteConfig, RouletteLobbyRow } from '@/types';

interface LobbyState {
    lobbyId: string;
    code: string;
    hostId: string;
    status: LobbyStatus;
    config: LobbyConfig | null;
}

interface LobbyContextType {
    lobbyId: string | null;
    lobbyCode: string | null;
    isHost: boolean;
    players: Player[];
    config: LobbyConfig | null;
    status: LobbyStatus | null;
    createLobby: (rouletteConfig: RouletteConfig) => Promise<boolean>;
    /** Entrar por invitación (id de sala) */
    joinLobbyById: (lobbyId: string) => Promise<boolean>;
    /** Entrar con el código corto que comparte el anfitrión */
    joinLobbyByCode: (code: string) => Promise<boolean>;
    leaveLobby: () => Promise<void>;
    /** Solo anfitrión: cambia el estado y/o mezcla cambios en la configuración compartida */
    updateLobby: (patch: { status?: LobbyStatus; config?: Partial<LobbyConfig> }) => Promise<void>;
    castVote: (movieId: string, vote: 'like' | 'skip') => Promise<void>;
    fetchLikes: () => Promise<VoteRow[]>;
    countVotes: () => Promise<number>;
    /** Solo anfitrión: borra los votos al empezar una ronda nueva */
    clearVotes: () => Promise<void>;
}

const LobbyContext = createContext<LobbyContextType | undefined>(undefined);

const LOBBY_COLUMNS = 'id, code, host_id, config, status';
const UNIQUE_VIOLATION = '23505';
const lastLobbyKey = (userId: string) => `cinematch_lobby_${userId}`;

function toPlayers(rows: LobbyMemberRow[]): Player[] {
    return rows.map(m => ({
        id: m.user_id,
        name: m.profiles?.username ?? '',
        avatar: m.profiles?.avatar_url ?? '',
        isHost: m.role === 'host',
    }));
}

export function LobbyProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { t } = useLanguage();
    const { showToast } = useToast();
    const userId = user?.id ?? null;

    const [lobby, setLobby] = useState<LobbyState | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const channelRef = useRef<RealtimeChannel | null>(null);
    /** Copia síncrona de la sala: updateLobby mezcla siempre sobre la config más reciente */
    const lobbyRef = useRef<LobbyState | null>(null);

    const applyLobby = useCallback((next: LobbyState | null) => {
        lobbyRef.current = next;
        setLobby(next);
    }, []);

    const disposeChannel = useCallback(() => {
        const channel = channelRef.current;
        channelRef.current = null;
        if (channel) void supabase.removeChannel(channel);
    }, []);

    const resetLocal = useCallback(() => {
        disposeChannel();
        applyLobby(null);
        setPlayers([]);
        if (userId) removeKey(lastLobbyKey(userId));
    }, [disposeChannel, applyLobby, userId]);

    const loadMembers = useCallback(async (lobbyId: string) => {
        const { data, error } = await supabase
            .from('roulette_lobby_members')
            .select('user_id, role, profiles:profiles!user_id(id, username, avatar_url)')
            .eq('lobby_id', lobbyId);
        if (error) {
            console.error('Error loading lobby members:', error.message);
            return;
        }
        if (lobbyRef.current?.lobbyId === lobbyId) setPlayers(toPlayers((data ?? []) as unknown as LobbyMemberRow[]));
    }, []);

    /** Lee la sala; devuelve false si ya no existe o no es accesible */
    const hydrate = useCallback(async (lobbyId: string) => {
        const { data, error } = await supabase.from('roulette_lobbies').select(LOBBY_COLUMNS).eq('id', lobbyId).maybeSingle();
        const row = data as RouletteLobbyRow | null;
        if (error || !row || (row.status === 'finished' && !row.config?.winnerId)) return false;
        applyLobby({ lobbyId: row.id, code: row.code, hostId: row.host_id, status: row.status, config: row.config });
        await loadMembers(row.id);
        return true;
    }, [applyLobby, loadMembers]);

    const subscribe = useCallback((lobbyId: string) => {
        disposeChannel();
        const channel = supabase
            .channel(`roulette-lobby-${lobbyId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'roulette_lobby_members', filter: `lobby_id=eq.${lobbyId}` },
                () => void loadMembers(lobbyId))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'roulette_lobbies', filter: `id=eq.${lobbyId}` },
                payload => {
                    if (payload.eventType === 'DELETE') {
                        if (lobbyRef.current && lobbyRef.current.hostId !== userId) showToast(t.lobbyClosedByHost, 'info');
                        resetLocal();
                        return;
                    }
                    const row = payload.new as RouletteLobbyRow;
                    const current = lobbyRef.current;
                    if (current?.lobbyId === lobbyId) applyLobby({ ...current, status: row.status, config: row.config });
                })
            .subscribe(state => {
                // Al (re)conectar se relee todo por si se perdió algún evento
                if (state === 'SUBSCRIBED') void hydrate(lobbyId);
            });
        channelRef.current = channel;
    }, [disposeChannel, loadMembers, hydrate, applyLobby, resetLocal, showToast, t.lobbyClosedByHost, userId]);

    const enterLobby = useCallback(async (lobbyId: string) => {
        if (!userId) return false;
        const ok = await hydrate(lobbyId);
        if (!ok) return false;
        writeString(lastLobbyKey(userId), lobbyId);
        subscribe(lobbyId);
        return true;
    }, [userId, hydrate, subscribe]);

    // Última versión de enterLobby para el efecto de abajo, que solo debe depender del usuario
    const enterLobbyRef = useRef(enterLobby);
    useEffect(() => {
        enterLobbyRef.current = enterLobby;
    }, [enterLobby]);

    // Al recargar se recupera la última sala; al cambiar de usuario se abandona la local
    useEffect(() => {
        if (!userId) return;
        const stored = readString(lastLobbyKey(userId));
        if (stored) {
            void enterLobbyRef.current(stored).then(ok => {
                if (!ok) removeKey(lastLobbyKey(userId));
            });
        }
        return () => {
            const channel = channelRef.current;
            channelRef.current = null;
            if (channel) void supabase.removeChannel(channel);
            lobbyRef.current = null;
            setLobby(null);
            setPlayers([]);
        };
    }, [userId]);

    const createLobby = useCallback(async (rouletteConfig: RouletteConfig) => {
        if (!userId) return false;
        const config: LobbyConfig = { rouletteConfig };
        // El código es único en BD: si coincide con otro se genera uno nuevo
        for (let attempt = 0; attempt < 3; attempt++) {
            const { data, error } = await supabase
                .from('roulette_lobbies')
                .insert({ code: randomCode(6), host_id: userId, config, status: 'waiting' })
                .select('id')
                .single();
            if (error?.code === UNIQUE_VIOLATION) continue;
            if (error || !data) break;

            const lobbyId = (data as { id: string }).id;
            const { error: memberError } = await supabase
                .from('roulette_lobby_members')
                .insert({ lobby_id: lobbyId, user_id: userId, role: 'host' });
            if (memberError) {
                await supabase.from('roulette_lobbies').delete().eq('id', lobbyId);
                break;
            }
            return enterLobby(lobbyId);
        }
        showToast(t.genericError, 'error');
        return false;
    }, [userId, enterLobby, showToast, t.genericError]);

    const joinLobbyById = useCallback(async (lobbyId: string) => {
        if (!userId) return false;
        if (lobbyRef.current?.lobbyId === lobbyId) return true;
        // Si ya era miembro (o anfitrión) no se toca su rol
        const { error } = await supabase
            .from('roulette_lobby_members')
            .upsert({ lobby_id: lobbyId, user_id: userId, role: 'guest' }, { onConflict: 'lobby_id,user_id', ignoreDuplicates: true });
        if (error) {
            showToast(t.lobbyNotFound, 'error');
            return false;
        }
        const ok = await enterLobby(lobbyId);
        if (!ok) showToast(t.lobbyNotFound, 'error');
        return ok;
    }, [userId, enterLobby, showToast, t.lobbyNotFound]);

    const joinLobbyByCode = useCallback(async (code: string) => {
        if (!userId) return false;
        const { data, error } = await supabase.rpc('join_lobby_by_code', { p_code: code.trim().toUpperCase() });
        const lobbyId = data as string | null;
        if (error || !lobbyId) {
            showToast(t.lobbyNotFound, 'error');
            return false;
        }
        return enterLobby(lobbyId);
    }, [userId, enterLobby, showToast, t.lobbyNotFound]);

    const leaveLobby = useCallback(async () => {
        const current = lobbyRef.current;
        if (current && userId) {
            if (current.hostId === userId) {
                // Borrar la sala avisa a los invitados (evento DELETE) y elimina miembros y votos en cascada
                const { error } = await supabase.from('roulette_lobbies').delete().eq('id', current.lobbyId);
                if (error) console.error('Error closing lobby:', error.message);
            } else {
                await supabase.from('roulette_lobby_members').delete().eq('lobby_id', current.lobbyId).eq('user_id', userId);
            }
        }
        resetLocal();
    }, [userId, resetLocal]);

    const updateLobby = useCallback(async (patch: { status?: LobbyStatus; config?: Partial<LobbyConfig> }) => {
        const current = lobbyRef.current;
        if (!current || current.hostId !== userId) return;
        const config = patch.config && current.config ? { ...current.config, ...patch.config } : current.config;
        const status = patch.status ?? current.status;
        applyLobby({ ...current, status, config }); // optimista: el anfitrión ve el cambio al instante
        const { error } = await supabase.from('roulette_lobbies').update({ status, config }).eq('id', current.lobbyId);
        if (error) {
            console.error('Error updating lobby:', error.message);
            showToast(t.genericError, 'error');
        }
    }, [userId, applyLobby, showToast, t.genericError]);

    const castVote = useCallback(async (movieId: string, vote: 'like' | 'skip') => {
        const current = lobbyRef.current;
        if (!current || !userId) return;
        const { error } = await supabase
            .from('roulette_votes')
            .upsert({ lobby_id: current.lobbyId, user_id: userId, movie_id: movieId, vote }, { onConflict: 'lobby_id,user_id,movie_id' });
        if (error) console.error('Error saving vote:', error.message);
    }, [userId]);

    const fetchLikes = useCallback(async (): Promise<VoteRow[]> => {
        const current = lobbyRef.current;
        if (!current) return [];
        const { data, error } = await supabase
            .from('roulette_votes')
            .select('movie_id, user_id')
            .eq('lobby_id', current.lobbyId)
            .eq('vote', 'like');
        if (error) throw error;
        return (data ?? []) as VoteRow[];
    }, []);

    const countVotes = useCallback(async () => {
        const current = lobbyRef.current;
        if (!current) return 0;
        const { count } = await supabase
            .from('roulette_votes')
            .select('id', { count: 'exact', head: true })
            .eq('lobby_id', current.lobbyId);
        return count ?? 0;
    }, []);

    const clearVotes = useCallback(async () => {
        const current = lobbyRef.current;
        if (!current || current.hostId !== userId) return;
        const { error } = await supabase.from('roulette_votes').delete().eq('lobby_id', current.lobbyId);
        if (error) console.error('Error clearing votes:', error.message);
    }, [userId]);

    const value = useMemo<LobbyContextType>(() => ({
        lobbyId: lobby?.lobbyId ?? null,
        lobbyCode: lobby?.code ?? null,
        isHost: !!lobby && lobby.hostId === userId,
        players,
        config: lobby?.config ?? null,
        status: lobby?.status ?? null,
        createLobby, joinLobbyById, joinLobbyByCode, leaveLobby,
        updateLobby, castVote, fetchLikes, countVotes, clearVotes,
    }), [lobby, userId, players, createLobby, joinLobbyById, joinLobbyByCode, leaveLobby, updateLobby, castVote, fetchLikes, countVotes, clearVotes]);

    return <LobbyContext.Provider value={value}>{children}</LobbyContext.Provider>;
}

export function useLobby() {
    const context = useContext(LobbyContext);
    if (context === undefined) {
        throw new Error('useLobby must be used within a LobbyProvider');
    }
    return context;
}
