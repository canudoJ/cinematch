'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User, SupabaseClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Types
export type Profile = {
    id: string;
    username: string;
    avatar_url: string | null;
    level: number;
    is_premium: boolean;
};

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    session: Session | null;
    loading: boolean;
    error: string | null;
    supabase: SupabaseClient;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const fetchProfile = useCallback(async (userId: string) => {
        try {
            const { data, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) {
                // Si el perfil no existe, no es un error crítico - el usuario puede seguir usando la app
                if (profileError.code === 'PGRST116') {
                    console.log('Profile not found for user, will be created on first update');
                    return;
                }
                console.error('Profile fetch error:', profileError);
                // No establecer error global por problemas de perfil - no bloquea la app
                return;
            }

            if (data) {
                setProfile(data);
            }
        } catch (err: any) {
            console.error('Profile fetch error:', err);
            // No establecer error global - el perfil es opcional
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            try {
                setError(null);
                // Verificar sesión activa
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError) {
                    console.error('Error getting session:', sessionError);
                    if (mounted) {
                        setError(`Error de conexión: ${sessionError.message}`);
                        setLoading(false);
                    }
                    return;
                }

                if (mounted) {
                    if (session) {
                        setSession(session);
                        setUser(session.user);
                        // Fetch profile en background - no bloquear renderizado
                        fetchProfile(session.user.id).catch(err => {
                            console.error('Background profile fetch failed:', err);
                        });
                    }
                    // Siempre poner loading en false, incluso si fetchProfile aún está ejecutándose
                    setLoading(false);
                }
            } catch (err: any) {
                console.error('Auth initialization error:', err);
                if (mounted) {
                    setError(`Error inicializando autenticación: ${err.message || 'Error desconocido'}`);
                    setLoading(false);
                }
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            console.log('Auth Event:', event);
            setError(null);

            try {
                if (session) {
                    setSession(session);
                    setUser(session.user);
                    // Fetch profile en background para eventos de login - no bloquear renderizado
                    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                        fetchProfile(session.user.id).catch(err => {
                            console.error('Background profile fetch failed:', err);
                        });
                    }
                } else {
                    setSession(null);
                    setUser(null);
                    setProfile(null);
                }

                // Siempre poner loading en false inmediatamente - no esperar a fetchProfile
                setLoading(false);
            } catch (err: any) {
                console.error('Auth state change error:', err);
                setError(`Error en cambio de sesión: ${err.message || 'Error desconocido'}`);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [fetchProfile]); // Solo fetchProfile como dependencia (memoizado)

    const signInWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
    };

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
            // La actualización de estado ocurrirá en onAuthStateChange ('SIGNED_OUT')
            localStorage.clear(); // Opcional, si queremos limpiar caché local de app
            router.push('/auth/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const updateProfile = async (updates: Partial<Profile>) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .select();

            if (error) throw error;

            setProfile(prev => prev ? { ...prev, ...updates } : { id: user.id, ...updates } as Profile);
            router.refresh(); // Asegurar consistencia
        } catch (error) {
            console.error("Update Profile Error:", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{
            user, session, profile, loading, error, supabase,
            signInWithGoogle, signOut, updateProfile
        }}>
            {loading ? (
                <div style={{
                    height: '100vh', width: '100vw',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                    background: '#000', color: '#4bffb3'
                }}>
                    <div className="animate-pulse">Cargando Cinematch...</div>
                    {error && (
                        <div className="mt-4 text-red-500 text-sm max-w-md text-center px-4">
                            {error}
                        </div>
                    )}
                </div>
            ) : children}
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
