'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Movie } from '@/lib/data';

interface SwipeSessionContextValue {
    loadedMovies: Movie[];
    setLoadedMovies: React.Dispatch<React.SetStateAction<Movie[]>>;
    currentIndex: number;
    setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
    botLikes: Set<string>;
    setBotLikes: React.Dispatch<React.SetStateAction<Set<string>>>;
    loading: boolean;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
    shortlist: Movie[];
    setShortlist: React.Dispatch<React.SetStateAction<Movie[]>>;
    showShortlist: boolean;
    setShowShortlist: React.Dispatch<React.SetStateAction<boolean>>;
    configKey: string | null;
    setConfigKey: React.Dispatch<React.SetStateAction<string | null>>;
    resetSession: () => void;
}

const SwipeSessionContext = createContext<SwipeSessionContextValue | undefined>(undefined);

export function SwipeSessionProvider({ children }: { children: ReactNode }) {
    const [loadedMovies, setLoadedMovies] = useState<Movie[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [botLikes, setBotLikes] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [shortlist, setShortlist] = useState<Movie[]>([]);
    const [showShortlist, setShowShortlist] = useState(false);
    const [configKey, setConfigKey] = useState<string | null>(null);

    const resetSession = () => {
        setLoadedMovies([]);
        setCurrentIndex(0);
        setBotLikes(new Set());
        setLoading(true);
        setShortlist([]);
        setShowShortlist(false);
        setConfigKey(null);
    };

    return (
        <SwipeSessionContext.Provider
            value={{
                loadedMovies,
                setLoadedMovies,
                currentIndex,
                setCurrentIndex,
                botLikes,
                setBotLikes,
                loading,
                setLoading,
                shortlist,
                setShortlist,
                showShortlist,
                setShowShortlist,
                configKey,
                setConfigKey,
                resetSession,
            }}
        >
            {children}
        </SwipeSessionContext.Provider>
    );
}

export function useSwipeSession() {
    const ctx = useContext(SwipeSessionContext);
    if (!ctx) {
        throw new Error('useSwipeSession must be used within a SwipeSessionProvider');
    }
    return ctx;
}

