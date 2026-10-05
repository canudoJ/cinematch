'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { readArray, removeKey, writeJSON } from '@/lib/storage';
import { getUserRegion } from '@/lib/region';
import { withWatchInfo } from '@/services/tmdb';
import type { ContentType, LibraryMovie, Movie, UserLibraryRow } from '@/types';

interface UserContextType {
    platforms: string[];
    contentTypes: ContentType[];
    preferredGenres: string[];
    updatePlatforms: (platforms: string[]) => void;
    updateContentTypes: (types: ContentType[]) => void;
    updatePreferredGenres: (genres: string[]) => void;
    /** Videoteca del usuario (más recientes primero) */
    likedContent: LibraryMovie[];
    addLike: (movie: Movie) => Promise<void>;
    updateLike: (movie: LibraryMovie) => Promise<void>;
    removeLike: (movieId: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

/** Claves de localStorage siempre ligadas al usuario (caché para pintar al instante) */
const keys = (userId: string) => ({
    platforms: `cinematch_platforms_${userId}`,
    contentTypes: `cinematch_content_types_${userId}`,
    genres: `cinematch_preferred_genres_${userId}`,
    likes: `cinematch_likes_${userId}`,
});

/** Claves antiguas sin usuario: podían filtrar datos de una cuenta a otra en el mismo navegador */
const LEGACY_KEYS = ['cinematch_platforms', 'cinematch_content_types', 'cinematch_preferred_genres', 'cinematch_likes'];

type PrefsPatch = {
    preferred_platforms?: string[];
    preferred_content_types?: ContentType[];
    preferred_genres?: string[];
};

export function UserProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { t } = useLanguage();
    const { showToast } = useToast();
    const userId = user?.id ?? null;

    const [platforms, setPlatforms] = useState<string[]>([]);
    const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
    const [preferredGenres, setPreferredGenres] = useState<string[]>([]);
    const [likedContent, setLikedContent] = useState<LibraryMovie[]>([]);

    // Espejos síncronos del estado: evitan carreras con toques muy rápidos
    const platformsRef = useRef<string[]>([]);
    const likedIdsRef = useRef<Set<string>>(new Set());

    // ---------------------------------------------------------------------
    // Carga inicial: caché local (instantánea) y después Supabase (fuente de verdad)
    // ---------------------------------------------------------------------
    useEffect(() => {
        LEGACY_KEYS.forEach(removeKey);

        let cancelled = false;
        const apply = (next: { platforms: string[]; types: ContentType[]; genres: string[]; likes: LibraryMovie[] }) => {
            if (cancelled) return;
            platformsRef.current = next.platforms;
            likedIdsRef.current = new Set(next.likes.map(m => String(m.id)));
            setPlatforms(next.platforms);
            setContentTypes(next.types);
            setPreferredGenres(next.genres);
            setLikedContent(next.likes);
        };

        if (!userId) {
            apply({ platforms: [], types: [], genres: [], likes: [] });
            return () => { cancelled = true; };
        }

        const k = keys(userId);
        const cached = {
            platforms: readArray<string>(k.platforms),
            types: readArray<ContentType>(k.contentTypes),
            genres: readArray<string>(k.genres),
            likes: readArray<LibraryMovie>(k.likes),
        };
        apply(cached);

        void Promise.all([
            supabase.from('profiles').select('preferred_platforms, preferred_content_types, preferred_genres').eq('id', userId).maybeSingle(),
            supabase.from('user_library').select('movie_id, movie_data, added_at').eq('user_id', userId).order('added_at', { ascending: false }),
        ]).then(([prefsRes, libraryRes]) => {
            if (cancelled) return;
            const prefs = prefsRes.data;
            const library = (libraryRes.data ?? []) as UserLibraryRow[];
            apply({
                platforms: prefs?.preferred_platforms?.length ? prefs.preferred_platforms : cached.platforms,
                types: prefs?.preferred_content_types?.length ? (prefs.preferred_content_types as ContentType[]) : cached.types,
                genres: Array.isArray(prefs?.preferred_genres) ? prefs.preferred_genres : cached.genres,
                likes: libraryRes.error ? cached.likes : library.map(row => ({ ...row.movie_data, added_at: row.added_at })),
            });
            if (prefsRes.error || libraryRes.error) console.error('Error syncing user data:', prefsRes.error ?? libraryRes.error);
        });

        return () => { cancelled = true; };
    }, [userId]);

    // Caché local de la videoteca
    useEffect(() => {
        if (userId) writeJSON(keys(userId).likes, likedContent);
    }, [userId, likedContent]);

    // ---------------------------------------------------------------------
    // Preferencias
    // ---------------------------------------------------------------------
    const savePrefs = useCallback(async (patch: PrefsPatch) => {
        if (!userId) return;
        const k = keys(userId);
        if (patch.preferred_platforms) writeJSON(k.platforms, patch.preferred_platforms);
        if (patch.preferred_content_types) writeJSON(k.contentTypes, patch.preferred_content_types);
        if (patch.preferred_genres) writeJSON(k.genres, patch.preferred_genres);

        // upsert: si el perfil aún no existe, update() no guardaría nada sin avisar
        const { error } = await supabase.from('profiles').upsert({ id: userId, ...patch });
        if (error) {
            console.error('Error saving preferences:', error.message);
            showToast(t.genericError, 'error');
        }
    }, [userId, showToast, t.genericError]);

    const updatePlatforms = useCallback((next: string[]) => {
        platformsRef.current = next;
        setPlatforms(next);
        void savePrefs({ preferred_platforms: next });
    }, [savePrefs]);

    const updateContentTypes = useCallback((next: ContentType[]) => {
        if (next.length === 0) return; // siempre al menos un tipo
        setContentTypes(next);
        void savePrefs({ preferred_content_types: next });
    }, [savePrefs]);

    const updatePreferredGenres = useCallback((genres: string[]) => {
        setPreferredGenres(genres);
        void savePrefs({ preferred_genres: genres });
    }, [savePrefs]);

    // ---------------------------------------------------------------------
    // Videoteca
    // ---------------------------------------------------------------------
    const updateLike = useCallback(async (movie: LibraryMovie) => {
        setLikedContent(prev => prev.map(m => (String(m.id) === String(movie.id) ? movie : m)));
        if (!userId) return;
        const { error } = await supabase
            .from('user_library')
            .update({ movie_data: movie })
            .eq('user_id', userId)
            .eq('movie_id', String(movie.id));
        if (error) console.error('Error updating library item:', error.message);
    }, [userId]);

    const addLike = useCallback(async (movie: Movie) => {
        const id = String(movie.id);
        if (!userId || likedIdsRef.current.has(id)) return;
        likedIdsRef.current.add(id);

        const liked: LibraryMovie = { ...movie, id, added_at: new Date().toISOString() };
        setLikedContent(prev => [liked, ...prev]);

        // Se guarda primero con lo que hay; las plataformas se añaden después con un update.
        // Así un "quitar" inmediato nunca compite con un insert retrasado.
        const { error } = await supabase
            .from('user_library')
            .upsert({ user_id: userId, movie_id: id, movie_data: liked }, { onConflict: 'user_id,movie_id', ignoreDuplicates: true });
        if (error) {
            likedIdsRef.current.delete(id);
            setLikedContent(prev => prev.filter(m => String(m.id) !== id));
            showToast(t.genericError, 'error');
            return;
        }

        if (!liked.providers?.length) {
            const enriched = await withWatchInfo(liked, getUserRegion(), platformsRef.current);
            if (likedIdsRef.current.has(id) && enriched.providers?.length) await updateLike(enriched);
        }
    }, [userId, showToast, t.genericError, updateLike]);

    const removeLike = useCallback(async (movieId: string) => {
        const id = String(movieId);
        if (!userId) return;
        let removed: LibraryMovie | undefined;
        likedIdsRef.current.delete(id);
        setLikedContent(prev => {
            removed = prev.find(m => String(m.id) === id);
            return prev.filter(m => String(m.id) !== id);
        });

        const { error } = await supabase.from('user_library').delete().eq('user_id', userId).eq('movie_id', id);
        if (error) {
            if (removed) {
                const restored = removed;
                likedIdsRef.current.add(id);
                setLikedContent(prev => [restored, ...prev]);
            }
            showToast(t.genericError, 'error');
        }
    }, [userId, showToast, t.genericError]);

    const value = useMemo<UserContextType>(() => ({
        platforms, contentTypes, preferredGenres,
        updatePlatforms, updateContentTypes, updatePreferredGenres,
        likedContent, addLike, updateLike, removeLike,
    }), [platforms, contentTypes, preferredGenres, updatePlatforms, updateContentTypes, updatePreferredGenres, likedContent, addLike, updateLike, removeLike]);

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
