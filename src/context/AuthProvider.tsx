'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { clearAppStorage, writeJSON } from '@/lib/storage';
import { randomCode } from '@/lib/random';
import { LoadingScreen } from '@/components/ui/Spinner';
import { useLanguage } from '@/context/LanguageContext';
import type { ContentType, Profile } from '@/types';

const PROFILE_COLUMNS = 'id, username, avatar_url, level, is_premium, preferred_genres, preferred_platforms, preferred_content_types, updated_at';

/** Plataformas que se preseleccionan a los invitados: Netflix, Prime Video, Disney+ y HBO Max */
const GUEST_DEFAULT_PLATFORMS = ['8', '119', '337', '384'];
const GUEST_DEFAULT_TYPES: ContentType[] = ['movie', 'tv'];
const UNIQUE_VIOLATION = '23505';

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    /** Usuario anónimo creado con "Probar sin registrarse" */
    isGuest: boolean;
    signInAsGuest: () => Promise<void>;
    signOut: () => Promise<void>;
    updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { t } = useLanguage();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    /** Usuario actual: descarta respuestas de perfil que llegan tarde tras cambiar de cuenta */
    const currentUserId = useRef<string | null>(null);

    const fetchProfile = useCallback(async (userId: string) => {
        const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle();
        if (currentUserId.current !== userId) return;
        if (error) {
            console.error('Error loading profile:', error.message);
            return;
        }
        setProfile((data as Profile | null) ?? null);
    }, []);

    useEffect(() => {
        // onAuthStateChange emite INITIAL_SESSION al suscribirse: no hace falta getSession()
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const nextUser = session?.user ?? null;
            const changedAccount = nextUser?.id !== currentUserId.current;
            currentUserId.current = nextUser?.id ?? null;

            // Mantener la misma referencia en los refrescos de token para no reiniciar
            // las suscripciones Realtime que dependen del usuario
            if (changedAccount || event === 'USER_UPDATED') setUser(nextUser);

            if (!nextUser) {
                setProfile(null);
            } else if (changedAccount) {
                // Sin await: no se puede llamar a Supabase de forma bloqueante dentro del callback
                void fetchProfile(nextUser.id);
            }
            setLoading(false);
        });
        return () => subscription.unsubscribe();
    }, [fetchProfile]);

    const signInAsGuest = useCallback(async () => {
        // Un invitado que ya tiene sesión la conserva: crear otra le haría perder lo guardado
        const { data: current } = await supabase.auth.getSession();
        if (current.session?.user.is_anonymous) return;

        const { data, error } = await supabase.auth.signInAnonymously();
        if (error || !data.user) throw error ?? new Error('Anonymous sign-in failed');
        const guestId = data.user.id;

        // El nombre aleatorio podría coincidir con uno existente: se reintenta
        for (let attempt = 0; attempt < 3; attempt++) {
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: guestId,
                username: `invitado_${randomCode(6).toLowerCase()}`,
                preferred_platforms: GUEST_DEFAULT_PLATFORMS,
                preferred_content_types: GUEST_DEFAULT_TYPES,
            });
            if (!profileError) break;
            if (profileError.code !== UNIQUE_VIOLATION) throw profileError;
        }

        writeJSON(`cinematch_platforms_${guestId}`, GUEST_DEFAULT_PLATFORMS);
        writeJSON(`cinematch_content_types_${guestId}`, GUEST_DEFAULT_TYPES);
        await fetchProfile(guestId);
    }, [fetchProfile]);

    const signOut = useCallback(async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        clearAppStorage();
        router.push('/auth/login');
    }, [router]);

    const updateProfile = useCallback(async (updates: Partial<Profile>) => {
        const userId = currentUserId.current;
        if (!userId) return;
        const { data, error } = await supabase
            .from('profiles')
            .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() })
            .select(PROFILE_COLUMNS)
            .single();
        if (error) throw error;
        setProfile(data as Profile);
    }, []);

    const value = useMemo<AuthContextType>(() => ({
        user,
        profile,
        loading,
        isGuest: !!user?.is_anonymous,
        signInAsGuest,
        signOut,
        updateProfile,
    }), [user, profile, loading, signInAsGuest, signOut, updateProfile]);

    return (
        <AuthContext.Provider value={value}>
            {loading ? <LoadingScreen label={t.loading} /> : children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
