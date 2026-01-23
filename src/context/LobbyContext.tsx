'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ContentType } from './UserContext';

interface Player {
    id: string;
    name: string;
    avatar: string;
    isHost: boolean;
}

export interface LobbyConfig {
    platforms: string[];
    contentTypes: ContentType[];
}

interface LobbyContextType {
    lobbyId: string | null;
    isHost: boolean;
    players: Player[];
    config: LobbyConfig | null;
    createLobby: (config: LobbyConfig) => void;
    joinLobby: (id: string) => void;
    leaveLobby: () => void;
    simulateGuestJoin: () => void;
    startGame: () => void;
}

const LobbyContext = createContext<LobbyContextType | undefined>(undefined);

export function LobbyProvider({ children }: { children: ReactNode }) {
    const [lobbyId, setLobbyId] = useState<string | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [config, setConfig] = useState<LobbyConfig | null>(null);
    const [isHost, setIsHost] = useState(false);
    const router = useRouter();

    const createLobby = (newConfig: LobbyConfig) => {
        // Generate random 4-char ID
        const id = Math.random().toString(36).substring(2, 6).toUpperCase();
        setLobbyId(id);
        setConfig(newConfig);
        setIsHost(true);
        setPlayers([{ id: 'host', name: 'Tú', avatar: '👤', isHost: true }]);
    };

    const leaveLobby = () => {
        setLobbyId(null);
        setConfig(null);
        setPlayers([]);
        setIsHost(false);
    };

    const joinLobby = (id: string) => {
        // TODO: Implementar conexión real con WebSocket/Realtime
        setLobbyId(id);
        setIsHost(false);
    };

    const simulateGuestJoin = () => {
        setTimeout(() => {
            setPlayers(prev => {
                if (prev.some(p => p.id === 'guest-1')) return prev;
                return [
                    ...prev,
                    { id: 'guest-1', name: 'Ana', avatar: '👩', isHost: false }
                ];
            });
        }, 3000);
    };

    const startGame = () => {
        // In a real app, this would signal via socket.
        // For local state, we just ensure the config is ready to be used by SwipeDeck.
        // We might want to reload the page or trigger a re-fetch in SwipeDeck.
        // For MVP, SwipeDeck reads from this Context.
    };

    return (
        <LobbyContext.Provider value={{
            lobbyId,
            isHost,
            players,
            config,
            createLobby,
            joinLobby,
            leaveLobby,
            simulateGuestJoin,
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
