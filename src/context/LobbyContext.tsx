'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ContentType } from './UserContext';
import type { Movie } from '@/lib/data';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabase';

export interface Player {
    id: string;
    name: string;
    avatar: string;
    isHost: boolean;
    status?: 'waiting' | 'accepted' | 'declined' | 'playing';
}

export interface LobbyConfig {
    platforms: string[];
    contentTypes: ContentType[];
    mode?: 'standard' | 'roulette';
    // JSON con la configuración completa de ruleta (opcional)
    rouletteConfig?: any;
    // Baraja compartida de la ronda actual (para ruleta rusa)
    roundMovies?: Movie[];
    // Coincidencias ganadoras de la ronda actual (para la ruleta final)
    winningMatches?: Movie[];
    // Rotación final de la ruleta para sincronizar el giro entre jugadores
    spinRotation?: number;
}

interface LobbyContextType {
    lobbyId: string | null;
    isHost: boolean;
    players: Player[];
    config: LobbyConfig | null;
    status: 'waiting' | 'swiping' | 'spinning' | 'finished' | null;
    createLobby: (config: LobbyConfig) => Promise<void>;
    joinLobby: (lobbyCode: string) => Promise<void>;
    leaveLobby: () => Promise<void>;
    startGame: () => void;
}

const LobbyContext = createContext<LobbyContextType | undefined>(undefined);

export function LobbyProvider({ children }: { children: ReactNode }) {
    const { user, profile } = useAuth();
    const [lobbyId, setLobbyId] = useState<string | null>(null);
    const [lobbyCode, setLobbyCode] = useState<string | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [config, setConfig] = useState<LobbyConfig | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [status, setStatus] = useState<'waiting' | 'swiping' | 'spinning' | 'finished' | null>(null);
    const router = useRouter();

    // Canal Realtime para este lobby
    const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);

    const currentUserId = user?.id || null;

    const disposeChannel = async () => {
        if (!channel) return;
        try {
            await supabase.removeChannel(channel);
        } catch {
            // noop
        }
        setChannel(null);
    };

    const hydrateLobbyFromDb = async (id: string) => {
        if (!currentUserId) return;

        const { data: lobby, error } = await supabase
            .from('roulette_lobbies')
            .select('id, code, host_id, config, status')
            .eq('id', id)
            .single();

        if (error || !lobby) return;

        setLobbyId(lobby.id);
        setLobbyCode(lobby.code);
        setIsHost(lobby.host_id === currentUserId);
        setStatus((lobby.status as any) ?? 'waiting');
        setConfig({
            ...(lobby.config?.lobbyConfig ?? {}),
            platforms: lobby.config?.platforms ?? [],
            contentTypes: lobby.config?.contentTypes ?? [],
            mode: lobby.config?.mode ?? 'roulette',
            rouletteConfig: lobby.config?.rouletteConfig ?? null,
            roundMovies: lobby.config?.roundMovies ?? null,
            winningMatches: lobby.config?.winningMatches ?? null,
            spinRotation: lobby.config?.spinRotation ?? null
        });

        // Cargar miembros iniciales
        const { data: members } = await supabase
            .from('roulette_lobby_members')
            .select('user_id, role, profiles:profiles!user_id(id, username, avatar_url)')
            .eq('lobby_id', lobby.id);

        if (members) {
            const mapped: Player[] = members.map((m: any) => ({
                id: m.user_id,
                name: m.profiles?.username || 'Jugador',
                avatar: m.profiles?.avatar_url || '',
                isHost: m.role === 'host',
                status: 'accepted'
            }));
            setPlayers(mapped);
        }
    };

    const subscribeLobby = async (id: string) => {
        if (!currentUserId) return;
        const name = `roulette-lobby-${id}`;
        const ch = supabase.channel(name);

        ch
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'roulette_lobby_members',
                    filter: `lobby_id=eq.${id}`
                },
                async () => {
                    // Rehidratar miembros cuando haya cambios
                    const { data: members } = await supabase
                        .from('roulette_lobby_members')
                        .select('user_id, role, profiles:profiles!user_id(id, username, avatar_url)')
                        .eq('lobby_id', id);

                    if (members) {
                        const mapped: Player[] = members.map((m: any) => ({
                            id: m.user_id,
                            name: m.profiles?.username || 'Jugador',
                            avatar: m.profiles?.avatar_url || '',
                            isHost: m.role === 'host',
                            status: 'accepted'
                        }));
                        setPlayers(mapped);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'roulette_lobbies',
                    filter: `id=eq.${id}`
                },
                (payload) => {
                    if (payload.eventType === 'DELETE') {
                        // El lobby ha sido destruido (por ejemplo, porque el host salió)
                        setLobbyId(null);
                        setLobbyCode(null);
                        setConfig(null);
                        setPlayers([]);
                        setIsHost(false);
                        setStatus(null);
                        return;
                    }

                    const row: any = payload.new;
                    if (row?.status) {
                        setStatus(row.status as any);
                    }
                    if (row?.config) {
                        setConfig({
                            ...(row.config.lobbyConfig ?? {}),
                            platforms: row.config.platforms ?? [],
                            contentTypes: row.config.contentTypes ?? [],
                            mode: row.config.mode ?? 'roulette',
                            rouletteConfig: row.config.rouletteConfig ?? null,
                            roundMovies: row.config.roundMovies ?? null,
                            winningMatches: row.config.winningMatches ?? null,
                            spinRotation: row.config.spinRotation ?? null
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'roulette_invitations',
                    filter: `lobby_id=eq.${id}`
                },
                (payload) => {
                    // En el futuro se podrían mapear estados de invitación a la UI.
                }
            )
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await hydrateLobbyFromDb(id);
                }
            });

        setChannel(ch);
    };

    const createLobby = async (newConfig: LobbyConfig) => {
        if (!currentUserId) return;

        // Generar código corto de sala (4 caracteres)
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();

        const payloadConfig = {
            mode: newConfig.mode ?? 'roulette',
            platforms: newConfig.platforms,
            contentTypes: newConfig.contentTypes,
            rouletteConfig: newConfig.rouletteConfig ?? null,
            lobbyConfig: newConfig
        };

        const { data, error } = await supabase
            .from('roulette_lobbies')
            .insert({
                code,
                host_id: currentUserId,
                config: payloadConfig
            })
            .select('id, code')
            .single();

        if (error || !data) {
            console.error('Error creating roulette lobby', error);
            return;
        }

        const lobbyDbId = data.id as string;

        // Registrar al host como miembro
        const { error: memberError } = await supabase
            .from('roulette_lobby_members')
            .insert({
                lobby_id: lobbyDbId,
                user_id: currentUserId,
                role: 'host'
            });

        if (memberError) {
            console.error('Error adding host to roulette_lobby_members', memberError);
        }

        setLobbyId(lobbyDbId);
        setLobbyCode(data.code);
        setConfig(newConfig);
        setIsHost(true);
        setStatus('waiting');
        setPlayers([{
            id: currentUserId,
            name: profile?.username || 'Tú',
            avatar: '',
            isHost: true,
            status: 'accepted'
        }]);

        await subscribeLobby(lobbyDbId);
    };

    const joinLobby = async (codeOrId: string) => {
        if (!currentUserId) return;

        // Caso 1: viene de una invitación y ya es un UUID de lobby válido.
        const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(codeOrId);

        let lobbyDbId = codeOrId;
        let lobbyCodeLocal: string | null = null;

        // Caso 2: el usuario introduce o navega por código de sala (no UUID)
        if (!looksLikeUuid) {
            const { data: lobby, error } = await supabase
                .from('roulette_lobbies')
                .select('id, code')
                .or(`id.eq.${codeOrId},code.eq.${codeOrId}`)
                .maybeSingle();

            if (error || !lobby) {
                console.error('Lobby not found', error);
                return;
            }

            lobbyDbId = lobby.id as string;
            lobbyCodeLocal = lobby.code as string;
        }

        // Insertar miembro si no existe
        const { error: memberError } = await supabase
            .from('roulette_lobby_members')
            .upsert({
                lobby_id: lobbyDbId,
                user_id: currentUserId,
                role: 'guest'
            }, {
                onConflict: 'lobby_id,user_id'
            });

        if (memberError) {
            console.error('Error joining roulette lobby', memberError);
        }

        setLobbyId(lobbyDbId);
        setLobbyCode(lobbyCodeLocal);
        setIsHost(false);

        await subscribeLobby(lobbyDbId);
    };

    const leaveLobby = async () => {
        if (lobbyId && currentUserId) {
            try {
                if (isHost) {
                    // Si el usuario es el host, eliminar completamente el lobby.
                    // Antes marcamos el lobby como "finished" para que los invitados puedan reaccionar.
                    const { error: statusError } = await supabase
                        .from('roulette_lobbies')
                        .update({ status: 'finished' })
                        .eq('id', lobbyId);

                    if (statusError) {
                        console.error('Error updating lobby status to finished', statusError);
                    }

                    // Esto también debería eliminar por cascada a los miembros y votos asociados.
                    const { error: deleteLobbyError } = await supabase
                        .from('roulette_lobbies')
                        .delete()
                        .eq('id', lobbyId);

                    if (deleteLobbyError) {
                        console.error('Error deleting lobby as host', deleteLobbyError);
                    }

                    // Además, por seguridad, intentamos limpiar manualmente los miembros.
                    const { error: deleteMembersError } = await supabase
                        .from('roulette_lobby_members')
                        .delete()
                        .eq('lobby_id', lobbyId);

                    if (deleteMembersError) {
                        console.error('Error deleting lobby members as host', deleteMembersError);
                    }
                } else {
                    // Invitado: solo se elimina a sí mismo del lobby.
                    const { error: leaveError } = await supabase
                        .from('roulette_lobby_members')
                        .delete()
                        .eq('lobby_id', lobbyId)
                        .eq('user_id', currentUserId);

                    if (leaveError) {
                        console.error('Error leaving lobby as guest', leaveError);
                    }
                }
            } catch (error) {
                console.error('Error leaving lobby', error);
            }
        }

        await disposeChannel();

        setLobbyId(null);
        setLobbyCode(null);
        setConfig(null);
        setPlayers([]);
        setIsHost(false);

        // Limpiar lobby recordado de invitaciones previas
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem('lastRouletteLobbyId');
        }
    };

    const startGame = () => {
        // En el futuro se puede emitir un evento Realtime para sincronizar el inicio de partida.
    };

    return (
        <LobbyContext.Provider value={{
            lobbyId,
            isHost,
            players,
            config,
            status,
            createLobby,
            joinLobby,
            leaveLobby,
            startGame
        }}>
            {children}
        </LobbyContext.Provider>
    );
}

export function useLobby() {
    const context = useContext(LobbyContext);
    if (context === undefined) {
        throw new Error('useLobby must be used within a LobbyProvider');
    }
    return context;
}
