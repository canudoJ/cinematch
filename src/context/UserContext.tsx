'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { getWatchLink } from '@/services/tmdb';

export type ContentType = 'movie' | 'tv';

// Maintain original interface to avoid breaking consumers like DeckContext
interface UserContextType {
    user: { email: string; id: string } | null;
    platforms: string[];
    contentTypes: ContentType[];
    login: (email: string) => void;
    logout: () => void;
    updatePlatforms: (platforms: string[]) => void;
    toggleContentType: (type: ContentType) => void;
    likedContent: any[];
    addLike: (movie: any) => void;
    updateLike: (movie: any) => void;
    removeLike: (movieId: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    // 1. Adapter: Get real user from Supabase Auth
    const { user: authUser, signOut: authSignOut } = useAuth();

    // 2. Maintain local state for things not yet in DB (or strictly local prefs)
    // In a full refactor, 'platforms' and 'likes' should go to the Profile/DB tables.
    // For now, we keep localStorage to maintain functionality while "adapting" the Auth part.
    const [platforms, setPlatforms] = useState<string[]>([]);
    const [contentTypes, setContentTypes] = useState<ContentType[]>(['movie']);
    const [likedContent, setLikedContent] = useState<any[]>([]);

    const router = useRouter();

    // Load local prefs
    useEffect(() => {
        const storedPlatforms = localStorage.getItem('cinematch_platforms');
        const storedTypes = localStorage.getItem('cinematch_content_types');
        const storedLikes = localStorage.getItem('cinematch_likes');

        if (storedPlatforms) setPlatforms(JSON.parse(storedPlatforms));
        if (storedTypes) setContentTypes(JSON.parse(storedTypes));
        if (storedLikes) setLikedContent(JSON.parse(storedLikes));
    }, []);

    // 3. Adapter Methods
    // The previous 'login' method was a mock. Now we redirect to real login page or do nothing if handled by AuthProvider.
    // However, consumers might call this.
    const login = (email: string) => {
        // Legacy call. Maybe redirect to /auth/login?
        router.push('/auth/login');
    };

    const logout = async () => {
        await authSignOut();
        router.push('/auth/login');
    };

    const updatePlatforms = (newPlatforms: string[]) => {
        setPlatforms(newPlatforms);
        localStorage.setItem('cinematch_platforms', JSON.stringify(newPlatforms));
    };

    const toggleContentType = (type: ContentType) => {
        let newTypes: ContentType[];
        if (contentTypes.includes(type)) {
            if (contentTypes.length === 1) return;
            newTypes = contentTypes.filter(t => t !== type);
        } else {
            newTypes = [...contentTypes, type];
        }
        setContentTypes(newTypes);
        localStorage.setItem('cinematch_content_types', JSON.stringify(newTypes));
    };

    // Likes are stored ONLY in localStorage - no database persistence
    // This keeps likes and decks as separate, independent mechanics

    const addLike = async (movie: any) => {
        // Verificar si ya existe
        if (likedContent.some(m => m.id === movie.id)) return;

        // Optimistic UI - agregar inmediatamente
        const tempLike = { ...movie, added_at: new Date().toISOString() };
        setLikedContent(prev => {
            const newLikes = [...prev, tempLike];
            localStorage.setItem('cinematch_likes', JSON.stringify(newLikes));
            return newLikes;
        });

        // Obtener información de plataformas si no está presente
        let enrichedMovie = { ...tempLike };
        if (!movie.providers && !movie.providerName && movie.id) {
            try {
                const { link, providerName, providers } = await getWatchLink(
                    movie.id, 
                    movie.type || 'movie', 
                    platforms
                );
                enrichedMovie = {
                    ...enrichedMovie,
                    providerName: providerName || undefined,
                    watchLink: link || undefined,
                    providers: providers || []
                };
                
                // Actualizar en el estado y localStorage
                setLikedContent(prev => {
                    const updated = prev.map(m => m.id === movie.id ? enrichedMovie : m);
                    localStorage.setItem('cinematch_likes', JSON.stringify(updated));
                    return updated;
                });
            } catch (error) {
                console.error('Error obteniendo información de plataforma:', error);
                // Continuar sin información de plataforma
            }
        }

        // Likes are stored ONLY in localStorage - no database persistence
    };

    const updateLike = (movie: any) => {
        setLikedContent(prev => {
            const newLikes = prev.map(m => m.id === movie.id ? movie : m);
            localStorage.setItem('cinematch_likes', JSON.stringify(newLikes));
            return newLikes;
        });
    };

    const removeLike = async (movieId: string) => {
        setLikedContent(prev => {
            const newLikes = prev.filter(m => m.id !== movieId);
            localStorage.setItem('cinematch_likes', JSON.stringify(newLikes));
            return newLikes;
        });

        // Likes are stored ONLY in localStorage - no database persistence
    };

    // 4. Map authUser to expected interface
    const adaptedUser = authUser && authUser.email ? {
        email: authUser.email,
        id: authUser.id
    } : null;

    return (
        <UserContext.Provider value={{
            user: adaptedUser,
            platforms, contentTypes,
            login, logout, updatePlatforms, toggleContentType,
            likedContent, addLike, removeLike, updateLike
        }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
