'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { getWatchLink } from '@/services/tmdb';
import { supabase } from '@/lib/supabase';

export type ContentType = 'movie' | 'tv';

interface UserContextType {
    user: { email: string; id: string } | null;
    platforms: string[];
    contentTypes: ContentType[];
    preferredGenres: string[];
    login: (email: string) => void;
    logout: () => void;
    updatePlatforms: (platforms: string[]) => void;
    toggleContentType: (type: ContentType) => void;
    updatePreferredGenres: (genres: string[]) => void;
    likedContent: any[];
    addLike: (movie: any) => void;
    updateLike: (movie: any) => void;
    removeLike: (movieId: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const { user: authUser, signOut: authSignOut } = useAuth();

    const [platforms, setPlatforms] = useState<string[]>([]);
    const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
    const [preferredGenres, setPreferredGenres] = useState<string[]>([]);
    const [likedContent, setLikedContent] = useState<any[]>([]);
    const [prefsLoaded, setPrefsLoaded] = useState(false);

    const router = useRouter();

    // ---------------------------------------------------------------------------
    // Cargar preferencias: primero localStorage (instantáneo), luego Supabase (sync)
    // ---------------------------------------------------------------------------
    useEffect(() => {
        const loadPrefs = async () => {
            // 1. Carga inmediata desde localStorage para que la UI no espere
            const storedPlatforms = localStorage.getItem('cinematch_platforms');
            const storedTypes = localStorage.getItem('cinematch_content_types');
            const storedGenres = localStorage.getItem('cinematch_preferred_genres');

            if (storedPlatforms) setPlatforms(JSON.parse(storedPlatforms));
            if (storedTypes) {
                const parsed = JSON.parse(storedTypes);
                if (Array.isArray(parsed) && parsed.length > 0) setContentTypes(parsed);
            }
            if (storedGenres) {
                const parsed = JSON.parse(storedGenres);
                if (Array.isArray(parsed)) setPreferredGenres(parsed);
            }

            // 2. Si hay usuario autenticado, sincronizar con Supabase (fuente de verdad)
            if (authUser?.id) {
                try {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('preferred_platforms, preferred_content_types, preferred_genres')
                        .eq('id', authUser.id)
                        .single();

                    if (!error && data) {
                        if (Array.isArray(data.preferred_platforms) && data.preferred_platforms.length > 0) {
                            setPlatforms(data.preferred_platforms);
                            localStorage.setItem('cinematch_platforms', JSON.stringify(data.preferred_platforms));
                        }
                        if (Array.isArray(data.preferred_content_types) && data.preferred_content_types.length > 0) {
                            setContentTypes(data.preferred_content_types as ContentType[]);
                            localStorage.setItem('cinematch_content_types', JSON.stringify(data.preferred_content_types));
                        }
                        if (Array.isArray(data.preferred_genres)) {
                            setPreferredGenres(data.preferred_genres);
                            localStorage.setItem('cinematch_preferred_genres', JSON.stringify(data.preferred_genres));
                        }
                    }
                } catch (err) {
                    console.error('Error loading preferences from Supabase:', err);
                    // Fallback a localStorage ya aplicado arriba
                }
            }

            setPrefsLoaded(true);
        };

        loadPrefs();
    }, [authUser?.id]);

    // ---------------------------------------------------------------------------
    // Cargar videoteca desde Supabase (con fallback y migración desde localStorage)
    // ---------------------------------------------------------------------------
    useEffect(() => {
        const loadLibrary = async () => {
            if (authUser?.id) {
                try {
                    const { data, error } = await supabase
                        .from('user_library')
                        .select('movie_data, added_at')
                        .eq('user_id', authUser.id)
                        .order('added_at', { ascending: false });

                    if (error) {
                        console.error('Error loading library from Supabase:', error);
                        const storedLikes = localStorage.getItem('cinematch_likes');
                        if (storedLikes) {
                            setLikedContent(JSON.parse(storedLikes));
                            migrateLocalStorageToSupabase(JSON.parse(storedLikes));
                        }
                    } else if (data) {
                        const movies = data.map((item: any) => item.movie_data);
                        setLikedContent(movies);

                        // Migrar localStorage a Supabase si hay datos locales (solo una vez)
                        const storedLikes = localStorage.getItem('cinematch_likes');
                        const migrationKey = `cinematch_library_migrated_${authUser.id}`;
                        if (storedLikes && !localStorage.getItem(migrationKey)) {
                            const localMovies = JSON.parse(storedLikes);
                            await migrateLocalStorageToSupabase(localMovies);
                            localStorage.setItem(migrationKey, 'true');
                        }
                    }
                } catch (error) {
                    console.error('Error loading library:', error);
                    const storedLikes = localStorage.getItem('cinematch_likes');
                    if (storedLikes) setLikedContent(JSON.parse(storedLikes));
                }
            } else {
                const storedLikes = localStorage.getItem('cinematch_likes');
                if (storedLikes) setLikedContent(JSON.parse(storedLikes));
            }
        };

        loadLibrary();
    }, [authUser?.id]);

    // ---------------------------------------------------------------------------
    // Migración one-shot: localStorage -> Supabase
    // ---------------------------------------------------------------------------
    const migrateLocalStorageToSupabase = async (localMovies: any[]) => {
        if (!authUser?.id || localMovies.length === 0) return;
        try {
            const { data: existing } = await supabase
                .from('user_library')
                .select('movie_id')
                .eq('user_id', authUser.id);

            const existingIds = new Set(existing?.map((e: any) => e.movie_id) || []);
            const toInsert = localMovies
                .filter(m => m.id && !existingIds.has(m.id.toString()))
                .map(movie => ({
                    user_id: authUser.id,
                    movie_id: movie.id.toString(),
                    movie_data: movie
                }));

            if (toInsert.length > 0) {
                const { error } = await supabase.from('user_library').insert(toInsert);
                if (error) {
                    console.error('Error migrating library to Supabase:', error);
                } else {
                }
            }
        } catch (error) {
            console.error('Error in migration:', error);
        }
    };

    // ---------------------------------------------------------------------------
    // Helper: guardar preferencias en Supabase
    // ---------------------------------------------------------------------------
    const savePrefsToSupabase = async (updates: {
        preferred_platforms?: string[];
        preferred_content_types?: string[];
        preferred_genres?: string[];
    }) => {
        if (!authUser?.id) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', authUser.id);
            if (error) console.error('Error saving preferences to Supabase:', error);
        } catch (err) {
            console.error('Error saving preferences:', err);
        }
    };

    // ---------------------------------------------------------------------------
    // Métodos del contexto
    // ---------------------------------------------------------------------------
    const login = (_email: string) => {
        router.push('/auth/login');
    };

    const logout = async () => {
        await authSignOut();
        router.push('/auth/login');
    };

    const updatePlatforms = (newPlatforms: string[]) => {
        setPlatforms(newPlatforms);
        localStorage.setItem('cinematch_platforms', JSON.stringify(newPlatforms));
        savePrefsToSupabase({ preferred_platforms: newPlatforms });
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
        savePrefsToSupabase({ preferred_content_types: newTypes });
    };

    const updatePreferredGenres = async (genres: string[]) => {
        setPreferredGenres(genres);
        localStorage.setItem('cinematch_preferred_genres', JSON.stringify(genres));
        savePrefsToSupabase({ preferred_genres: genres });
    };

    // ---------------------------------------------------------------------------
    // Videoteca: likes
    // ---------------------------------------------------------------------------
    const addLike = async (movie: any) => {
        if (likedContent.some(m => m.id === movie.id)) return;

        const tempLike = { ...movie, added_at: new Date().toISOString() };
        setLikedContent(prev => {
            const newLikes = [...prev, tempLike];
            localStorage.setItem('cinematch_likes', JSON.stringify(newLikes));
            return newLikes;
        });

        // Enriquecer con datos de plataforma si faltan
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
                setLikedContent(prev => {
                    const updated = prev.map(m => m.id === movie.id ? enrichedMovie : m);
                    localStorage.setItem('cinematch_likes', JSON.stringify(updated));
                    return updated;
                });
            } catch (error) {
                console.error('Error obteniendo información de plataforma:', error);
            }
        }

        if (authUser?.id && movie.id) {
            try {
                const { error } = await supabase
                    .from('user_library')
                    .insert({
                        user_id: authUser.id,
                        movie_id: movie.id.toString(),
                        movie_data: enrichedMovie
                    });
                if (error) console.error('Error saving to Supabase:', error);
            } catch (error) {
                console.error('Error saving library item:', error);
            }
        }
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

        if (authUser?.id) {
            try {
                const { error } = await supabase
                    .from('user_library')
                    .delete()
                    .eq('user_id', authUser.id)
                    .eq('movie_id', movieId);
                if (error) console.error('Error deleting from Supabase:', error);
            } catch (error) {
                console.error('Error deleting library item:', error);
            }
        }
    };

    // ---------------------------------------------------------------------------
    // Adapter: mapear authUser al interface esperado por consumidores
    // ---------------------------------------------------------------------------
    // Los invitados (usuarios anónimos) no tienen email
    const adaptedUser = authUser
        ? { email: authUser.email ?? '', id: authUser.id }
        : null;

    return (
        <UserContext.Provider value={{
            user: adaptedUser,
            platforms, contentTypes, preferredGenres,
            login, logout, updatePlatforms, toggleContentType, updatePreferredGenres,
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
