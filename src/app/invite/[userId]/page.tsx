'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase, Profile } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';
import { useFriends } from '@/hooks/useFriends';
import BackButton from '@/components/ui/BackButton';
import { Loader2, User, CheckCircle, XCircle, UserPlus } from 'lucide-react';

export default function InvitePage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { sendRequest, friends, fetchFriends } = useFriends();
    const [invitedUser, setInvitedUser] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState<'none' | 'already_friends' | 'request_exists' | 'sent' | 'error'>('none');
    const [errorMessage, setErrorMessage] = useState('');

    // Extraer userId de forma segura - evitar enumeración de params
    // useParams() devuelve un objeto sincrónico en client components
    const userId = React.useMemo(() => {
        try {
            if (!params) return null;
            // Acceder directamente a la propiedad sin enumerar el objeto
            const id = 'userId' in params ? params.userId : null;
            if (!id) return null;
            return Array.isArray(id) ? id[0] : String(id);
        } catch (error) {
            console.error('Error extracting userId from params:', error);
            return null;
        }
    }, [params]);

    useEffect(() => {
        if (!authLoading && userId) {
            if (!user) {
                // Redirect to login if not authenticated
                router.replace(`/auth/login?redirect=/invite/${userId}`);
                return;
            }

            loadInviteData();
        }
    }, [user, authLoading, userId, router]);

    const loadInviteData = async () => {
        if (!user || !userId) return;

        setLoading(true);
        try {
            // Fetch invited user profile
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, level, is_premium')
                .eq('id', userId)
                .single();

            if (error || !profile) {
                setErrorMessage('Usuario no encontrado');
                setStatus('error');
                setLoading(false);
                return;
            }

            setInvitedUser({ ...profile, is_premium: (profile as any).is_premium ?? false } as Profile);

            // Check if already friends
            const { data: friendship } = await supabase
                .from('friendships')
                .select('id, status, requester_id, receiver_id')
                .or(`and(requester_id.eq.${user.id},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${user.id})`)
                .maybeSingle();

            if (friendship) {
                if (friendship.status === 'accepted') {
                    setStatus('already_friends');
                } else if (friendship.status === 'pending') {
                    setStatus('request_exists');
                }
            }

            // Refresh friends list to get latest data
            await fetchFriends();
        } catch (error: any) {
            console.error('Error loading invite data:', error);
            setErrorMessage(error.message || 'Error al cargar datos');
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    const handleSendRequest = async () => {
        if (!user || !invitedUser) return;

        setSending(true);
        setErrorMessage('');

        try {
            await sendRequest(invitedUser.id);
            setStatus('sent');
        } catch (error: any) {
            console.error('Error sending request:', error);
            setErrorMessage(error.message || 'Error al enviar solicitud');
            setStatus('error');
        } finally {
            setSending(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center z-50">
                <Loader2 className="animate-spin text-[var(--secondary)] mb-4" size={48} />
                <p className="text-[var(--muted-foreground)] animate-pulse">Cargando...</p>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect
    }

    return (
        <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6 pb-24 pt-32 relative z-10 overflow-y-auto">
            <BackButton href="/profile" className="absolute top-6 left-6" />

            {/* Fondo ambiental verde */}
            <div className="fixed top-[-20%] left-[-20%] w-[500px] h-[500px] bg-[var(--secondary)] opacity-5 blur-[120px] pointer-events-none rounded-full" />

            <div className="max-w-xl mx-auto relative z-10 animate-fade-in">
                <header className="flex items-center mb-10 relative z-20">
                    <h1 className="text-3xl font-black tracking-tighter italic">INVITACIÓN</h1>
                </header>

                {status === 'error' ? (
                    <div className="bg-[var(--card)]/80 p-8 rounded-3xl border border-[var(--destructive)]/30 text-center">
                        <XCircle className="mx-auto mb-4 text-[var(--destructive)]" size={48} />
                        <h2 className="text-xl font-bold mb-2 text-[var(--foreground)]">Error</h2>
                        <p className="text-[var(--muted-foreground)] mb-6">{errorMessage}</p>
                        <button
                            onClick={() => router.push('/profile')}
                            className="bg-[var(--secondary)] text-[var(--background)] px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
                        >
                            Volver al Perfil
                        </button>
                    </div>
                ) : invitedUser ? (
                    <div className="bg-[var(--card)]/80 p-8 rounded-3xl border border-[var(--border)] text-center">
                        {/* Avatar */}
                        <div className="flex justify-center mb-6">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[var(--secondary)] bg-[var(--card)] shadow-[var(--shadow-neon-cyan)] flex items-center justify-center">
                                {invitedUser.avatar_url ? (
                                    <img src={invitedUser.avatar_url} alt={invitedUser.username || 'Usuario'} className="w-full h-full object-cover" />
                                ) : (
                                    <User size={48} className="text-[var(--muted-foreground)]" />
                                )}
                            </div>
                        </div>

                        {/* Username */}
                        <h2 className="text-2xl font-black mb-2 text-[var(--foreground)]">{invitedUser.username || 'Usuario sin nombre'}</h2>
                        <p className="text-[var(--muted-foreground)] mb-8">Nivel {invitedUser.level || 1}</p>

                        {/* Status Messages */}
                        {status === 'already_friends' && (
                            <div className="mb-6 p-4 bg-[var(--secondary)]/10 border border-[var(--secondary)]/30 rounded-xl">
                                <CheckCircle className="mx-auto mb-2 text-[var(--secondary)]" size={32} />
                                <p className="text-[var(--secondary)] font-bold">Ya son amigos</p>
                            </div>
                        )}

                        {status === 'request_exists' && (
                            <div className="mb-6 p-4 bg-[var(--muted)]/50 border border-[var(--border)] rounded-xl">
                                <Loader2 className="mx-auto mb-2 text-[var(--muted-foreground)] animate-spin" size={32} />
                                <p className="text-[var(--muted-foreground)] font-bold">Solicitud pendiente</p>
                            </div>
                        )}

                        {status === 'sent' && (
                            <div className="mb-6 p-4 bg-[var(--secondary)]/10 border border-[var(--secondary)]/30 rounded-xl">
                                <CheckCircle className="mx-auto mb-2 text-[var(--secondary)]" size={32} />
                                <p className="text-[var(--secondary)] font-bold">¡Solicitud enviada!</p>
                            </div>
                        )}

                        {/* Action Button */}
                        {status === 'none' && (
                            <button
                                onClick={handleSendRequest}
                                disabled={sending}
                                className="w-full bg-[var(--secondary)] text-[var(--background)] px-6 py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {sending ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={20} />
                                        Enviar Solicitud de Amistad
                                    </>
                                )}
                            </button>
                        )}

                        {status !== 'none' && (
                            <button
                                onClick={() => router.push('/profile')}
                                className="w-full bg-[var(--background)] border-2 border-[var(--border)] text-[var(--foreground)] px-6 py-4 rounded-xl font-bold hover:border-[var(--secondary)] transition-colors"
                            >
                                Volver al Perfil
                            </button>
                        )}

                        {errorMessage && (
                            <p className="mt-4 text-[var(--destructive)] text-sm">{errorMessage}</p>
                        )}
                    </div>
                ) : (
                    <div className="bg-[var(--card)]/80 p-8 rounded-3xl border border-[var(--border)] text-center">
                        <p className="text-[var(--muted-foreground)]">Cargando información del usuario...</p>
                    </div>
                )}
            </div>
        </main>
    );
}
