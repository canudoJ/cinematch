'use client';

import Link from 'next/link';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Singleton compartido
import { useAuth } from '@/context/AuthProvider'; // Contexto global
import { useFriends } from '@/hooks/useFriends';
import {
    User, Upload, LogOut, Save, Search, Users, Copy, CheckCircle, ChevronLeft, Loader2,
    UserPlus, UserMinus, X, Check, XCircle, UserCheck, Pencil
} from 'lucide-react';
import BackButton from '@/components/ui/BackButton';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { isUsernameAvailable } from '@/lib/usernameValidation';
import { useToast } from '@/components/ui/Toast';

type Tab = 'friends' | 'search' | 'invite';

export default function ProfilePage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // USAMOS EL CONTEXTO GLOBAL (¡La solución definitiva!)
    // Esto evita conflictos de sesiones múltiples
    const { user, profile, isGuest, loading: loadingSession, signOut, updateProfile } = useAuth();
    const { theme, setTheme } = useTheme();
    const { language, setLanguage, t } = useLanguage();
    const { 
        friends, 
        requests, 
        searchResults, 
        loading: friendsLoading, 
        searchLoading, 
        requestsLoading,
        sendRequest,
        sentRequests, 
        fetchFriends, 
        fetchRequests,
        searchUsers, 
        acceptRequest, 
        rejectRequest, 
        removeFriend 
    } = useFriends();
    const { showToast } = useToast();

    // Estados UI Locales
    const [username, setUsername] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [cacheBuster, setCacheBuster] = useState(Date.now());
    const [activeTab, setActiveTab] = useState<Tab>('friends');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Sincronizar estado local de inputs con datos del contexto
    useEffect(() => {
        if (profile?.username) {
            setUsername(profile.username);
        }
    }, [profile]);

    // Debounced search
    useEffect(() => {
        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
        }

        if (activeTab === 'search' && searchQuery.trim().length >= 2) {
            const timer = setTimeout(() => {
                searchUsers(searchQuery);
            }, 500);
            setSearchDebounceTimer(timer);
        } else if (activeTab === 'search' && searchQuery.trim().length === 0) {
            searchUsers('');
        }

        return () => {
            if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        };
    }, [searchQuery, activeTab]);

    // Refresh friends when tab changes
    useEffect(() => {
        if (activeTab === 'friends' && user) {
            fetchFriends();
            fetchRequests();
        }
    }, [activeTab, user]);

    // Redirección si no hay usuario 
    // (El AuthProvider ya lo gestiona en general, pero una protección extra no daña)
    useEffect(() => {
        if (!loadingSession && !user) {
            router.replace('/auth/login');
        }
    }, [user, loadingSession, router]);

    // --- MANEJADORES ---
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            if (!event.target.files || event.target.files.length === 0 || !user) return;
            setUploading(true);

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;

            // Usamos el singleton de supabase para Storage (esto es seguro)
            await supabase.storage.from('avatars').upload(fileName, file);
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

            // Actualizamos el perfil usando la función del contexto
            await updateProfile({ avatar_url: publicUrl });

            setCacheBuster(Date.now()); // Forzamos recarga de imagen

        } catch (error: any) {
            showToast('Error al subir imagen: ' + error.message, 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!user || !username.trim()) {
            return;
        }

        // Validar que el nombre de usuario sea único (excluyendo el usuario actual)
        const isAvailable = await isUsernameAvailable(username.trim(), user.id);
        if (!isAvailable) {
            return;
        }

        setSaving(true);
        try {
            await updateProfile({ username: username.trim() });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (error: any) {
        } finally {
            setSaving(false);
        }
    };

    const handleSendRequest = async (userId: string) => {
        setActionLoading(`send-${userId}`);
        try {
            await sendRequest(userId);
        } catch (error: any) {
        } finally {
            setActionLoading(null);
        }
    };

    const handleAcceptRequest = async (requestId: string) => {
        setActionLoading(`accept-${requestId}`);
        try {
            await acceptRequest(requestId);
        } catch (error: any) {
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectRequest = async (requestId: string) => {
        setActionLoading(`reject-${requestId}`);
        try {
            await rejectRequest(requestId);
        } catch (error: any) {
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemoveFriend = async (friendshipId: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar a este amigo?')) return;
        setActionLoading(`remove-${friendshipId}`);
        try {
            await removeFriend(friendshipId);
        } catch (error: any) {
        } finally {
            setActionLoading(null);
        }
    };



    // --- RENDERIZADO ---
    if (loadingSession) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center z-50">
                <Loader2 className="animate-spin text-[var(--secondary)] mb-4" size={48} />
                <p className="text-[var(--muted-foreground)] animate-pulse">{t.loadingData}</p>
            </div>
        );
    }

    if (!user) {
        // Retornamos null o un loader mientras redirige
        return null;
    }

    const avatarUrl = profile?.avatar_url
        ? `${profile.avatar_url}?t=${cacheBuster}`
        : null;

    return (
        <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6 pb-24 pt-12 relative z-10 overflow-y-auto">
            {/* Botón Atrás Global */}
            <BackButton href="/" className="absolute top-12 left-8" />

            {/* Fondo ambiental verde */}
            <div className="fixed top-[-20%] left-[-20%] w-[500px] h-[500px] bg-[var(--secondary)] opacity-5 blur-[120px] pointer-events-none rounded-full" />

            {/* Cabecera */}
            <header className="flex items-center justify-center mb-10 relative z-20 max-w-xl mx-auto animate-fade-in">
                <h1 className="heading-xl tracking-tighter italic">
                    {t.profile.toUpperCase()}
                </h1>
            </header>

            <div className="max-w-xl mx-auto relative z-10 animate-fade-in">

                {/* Avatar Glow */}
                <div className="flex flex-col items-center mb-10">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-[var(--secondary)] bg-[var(--card)] shadow-[var(--shadow-neon-cyan)] flex items-center justify-center relative transition-transform group-hover:scale-105">
                            {uploading ? (
                                <Loader2 className="animate-spin text-[var(--secondary)]" size={40} />
                            ) : avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User size={64} className="text-[var(--muted-foreground)]" />
                            )}
                        </div>
                        <div className="absolute bottom-1 right-1 bg-[var(--secondary)] text-black p-3 rounded-full shadow-lg hover:scale-110 transition-transform border-4 border-black">
                            <Upload size={18} strokeWidth={3} />
                        </div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    <p className="mt-4 text-[var(--muted-foreground)] text-sm font-medium">
                        {t.tapToChangePhoto}
                    </p>
                </div>

                {/* Aviso de invitado: la cuenta es temporal hasta que se registra */}
                {isGuest && (
                    <div className="section-card mb-10 border border-[var(--secondary)]/40">
                        <p className="font-bold mb-1">{language === 'es' ? 'Estás usando una cuenta de invitado' : 'You are using a guest account'}</p>
                        <p className="text-sm text-[var(--muted-foreground)] mb-4">
                            {language === 'es'
                                ? 'Todas las funciones están disponibles. Si cierras sesión perderás lo que has guardado, a menos que crees una cuenta.'
                                : 'Every feature is available. If you sign out you will lose what you saved unless you create an account.'}
                        </p>
                        <Link href="/auth/register" className="text-[var(--primary)] font-bold hover:underline underline-offset-4">
                            {language === 'es' ? 'Crear cuenta y conservar mis datos →' : 'Create an account and keep my data →'}
                        </Link>
                    </div>
                )}

                {/* Formulario - Nombre de usuario */}
                <div className="section-card mb-10 shadow-xl backdrop-blur-md">
                    <label className="block text-xs text-[var(--secondary)] mb-2 uppercase font-bold tracking-wider ml-1">
                        {language === 'es' ? 'Nombre de Usuario' : 'Username'}
                    </label>
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pr-10"
                                placeholder={t.chooseName}
                            />
                            <Pencil size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`w-14 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${saveSuccess ? 'bg-[var(--secondary)] border-[var(--secondary)] text-black' : 'bg-[var(--background)] border-[var(--border)] hover:border-[var(--secondary)] text-[var(--foreground)]'}`}
                        >
                            {saving ? (
                                <Loader2 className="animate-spin" size={24} />
                            ) : saveSuccess ? (
                                <CheckCircle size={24} />
                            ) : (
                                <Save size={24} color="rgba(0, 229, 255, 1)" />
                            )}
                        </button>
                    </div>
                    {saveSuccess && (
                        <p className="text-[var(--secondary)] text-xs mt-3 flex items-center gap-1 animate-pulse font-bold ml-1">
                            <CheckCircle size={12} />
                            {t.savedSuccessfully}
                        </p>
                    )}
                </div>

                {/* Nivel */}
                <div className="section-card text-center mb-10 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2 px-2">
                        <span className="text-xs font-bold text-[var(--secondary)] tracking-widest uppercase">{t.currentLevel}</span>
                        <span className="text-xs font-bold text-[var(--muted-foreground)] tracking-widest uppercase">{t.nextLevel}</span>
                    </div>
                    <div className="flex items-end justify-between mb-4">
                        <span className="text-4xl font-black text-white italic">{profile?.level || 1}</span>
                        <span className="text-xl font-bold text-[var(--muted-foreground)] italic">{(profile?.level || 1) + 1}</span>
                    </div>
                    <div className="w-full h-3 bg-[var(--background)] rounded-full overflow-hidden border border-[var(--border)]">
                        <div className="h-full bg-gradient-to-r from-[var(--secondary)] to-[var(--secondary)] w-[15%] shadow-[var(--shadow-neon-cyan)]" />
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mt-3 font-mono text-right">XP: 150 / 1000</p>
                </div>

                {/* Tabs Sociales */}
                <div className="mb-12">
                    <div className="flex p-1 bg-[var(--card)] rounded-2xl border border-[var(--border)] mb-6">
                        {(['friends', 'search', 'invite'] as Tab[]).map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${activeTab === tab ? 'bg-[var(--secondary)] text-[var(--background)] shadow-[var(--shadow-neon-cyan)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}>
                                {tab === 'search' ? t.search : tab === 'invite' ? t.invite : t.friends}
                            </button>
                        ))}
                    </div>

                    <div className="min-h-[150px] w-full py-8 bg-[var(--card)]/30 rounded-3xl border border-[var(--border)]">
                        {activeTab === 'friends' && (
                            <div className="w-full px-6 animate-fade-in">
                                {friendsLoading || requestsLoading ? (
                                    <div className="flex flex-col items-center justify-center py-8">
                                        <Loader2 className="animate-spin text-[var(--secondary)] mb-3" size={32} />
                                        <p className="text-[var(--muted-foreground)] text-sm">{t.loadingData}</p>
                                    </div>
                                ) : requests.length > 0 ? (
                                    <div className="space-y-4 mb-6">
                                        <h3 className="text-sm font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">Solicitudes Pendientes ({requests.length})</h3>
                                        {requests.map(request => (
                                            <div key={request.id} className="bg-[var(--card)]/80 p-4 rounded-xl border border-[var(--border)] flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[var(--secondary)] bg-[var(--background)] flex items-center justify-center">
                                                        {request.sender.avatar_url ? (
                                                            <img src={request.sender.avatar_url} alt={request.sender.username || 'Usuario'} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User size={24} className="text-[var(--muted-foreground)]" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white">{request.sender.username || 'Usuario sin nombre'}</p>
                                                        <p className="text-xs text-[var(--muted-foreground)]">Nivel {request.sender.level || 1}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleAcceptRequest(request.id)}
                                                        disabled={actionLoading === `accept-${request.id}`}
                                                        className="p-2 bg-[var(--secondary)] text-black rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                                                    >
                                                        {actionLoading === `accept-${request.id}` ? (
                                                            <Loader2 className="animate-spin" size={18} />
                                                        ) : (
                                                            <Check size={18} />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectRequest(request.id)}
                                                        disabled={actionLoading === `reject-${request.id}`}
                                                        className="p-2 bg-[var(--destructive)]/20 text-[var(--destructive)] border border-[var(--destructive)]/30 rounded-lg hover:bg-[var(--destructive)]/30 transition-colors disabled:opacity-50"
                                                    >
                                                        {actionLoading === `reject-${request.id}` ? (
                                                            <Loader2 className="animate-spin" size={18} />
                                                        ) : (
                                                            <X size={18} />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                                
                                {friends.length > 0 ? (
                                    <div className="space-y-3">
                                        {requests.length > 0 && <h3 className="text-sm font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-3 mt-6">{t.friends} ({friends.length})</h3>}
                                        {friends.map((friend: any) => {
                                            const friendshipId = friend.friendshipId || friend.id;
                                            return (
                                                <div key={friend.id} className="bg-[var(--card)]/80 p-4 rounded-xl border border-[var(--border)] flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[var(--secondary)] bg-[var(--background)] flex items-center justify-center">
                                                            {friend.avatar_url ? (
                                                                <img src={friend.avatar_url} alt={friend.username || 'Amigo'} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <User size={24} className="text-[var(--muted-foreground)]" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-white">{friend.username || 'Amigo sin nombre'}</p>
                                                            <p className="text-xs text-[var(--muted-foreground)]">Nivel {friend.level || 1}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveFriend(friendshipId)}
                                                        disabled={actionLoading === `remove-${friendshipId}`}
                                                        className="p-2 bg-[var(--destructive)]/20 text-[var(--destructive)] border border-[var(--destructive)]/30 rounded-lg hover:bg-[var(--destructive)]/30 transition-colors disabled:opacity-50"
                                                    >
                                                        {actionLoading === `remove-${friendshipId}` ? (
                                                            <Loader2 className="animate-spin" size={18} />
                                                        ) : (
                                                            <UserMinus size={18} />
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : !friendsLoading && !requestsLoading && requests.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Users size={40} className="opacity-20 text-white mb-3 mx-auto" />
                                        <p className="text-[var(--muted-foreground)] text-sm mb-1">
                                            {t.friendsListEmpty}
                                        </p>
                                        <p className="text-[var(--muted-foreground)] text-xs">
                                            {t.inviteFriendsOrShare}
                                        </p>
                                    </div>
                                ) : null}
                            </div>
                        )}
                        {activeTab === 'search' && (
                            <div className="w-full px-6 animate-fade-in">
                                <div className="flex gap-2 mb-4">
                                    <Input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Buscar usuario..."
                                        className="flex-1"
                                    />
                                    <button 
                                        onClick={() => searchUsers(searchQuery)}
                                        className="bg-[var(--card)] border border-[var(--border)] text-white px-4 rounded-xl hover:border-[var(--secondary)] transition-colors"
                                    >
                                        <Search size={20} />
                                    </button>
                                </div>
                                
                                {searchLoading ? (
                                    <div className="flex flex-col items-center justify-center py-8">
                                        <Loader2 className="animate-spin text-[var(--secondary)] mb-3" size={32} />
                                        <p className="text-[var(--muted-foreground)] text-sm">{t.searchingUsers}</p>
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    <div className="space-y-3">
                                        {searchResults.map(searchUser => (
                                            <div key={searchUser.id} className="bg-[var(--card)]/80 p-4 rounded-xl border border-[var(--border)] flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[var(--secondary)] bg-[var(--background)] flex items-center justify-center">
                                                        {searchUser.avatar_url ? (
                                                            <img src={searchUser.avatar_url} alt={searchUser.username || 'Usuario'} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User size={24} className="text-[var(--muted-foreground)]" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white">{searchUser.username || 'Usuario sin nombre'}</p>
                                                        <p className="text-xs text-[var(--muted-foreground)]">Nivel {searchUser.level || 1}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleSendRequest(searchUser.id)}
                                                    disabled={actionLoading === `send-${searchUser.id}` || sentRequests.has(searchUser.id)}
                                                    className={`px-4 py-2 rounded-lg font-bold transition-opacity disabled:opacity-50 flex items-center gap-2 ${
                                                        sentRequests.has(searchUser.id)
                                                            ? 'bg-[var(--background)] text-[var(--muted-foreground)] border border-[var(--border)] cursor-not-allowed'
                                                            : 'bg-[var(--secondary)] text-black hover:opacity-90'
                                                    }`}
                                                >
                                                    {actionLoading === `send-${searchUser.id}` ? (
                                                        <>
                                                            <Loader2 className="animate-spin" size={16} />
                                                            {t.sending}
                                                        </>
                                                    ) : sentRequests.has(searchUser.id) ? (
                                                        <>
                                                            {t.pendingRequest}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserPlus size={16} />
                                                            {t.add}
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : searchQuery.trim().length >= 2 ? (
                                    <div className="text-center py-8">
                                        <Search size={40} className="opacity-20 text-white mb-3 mx-auto" />
                                        <p className="text-[var(--muted-foreground)] text-sm mb-1">
                                            {t.noUsersFound}
                                        </p>
                                        <p className="text-[var(--muted-foreground)] text-xs">
                                            {t.typeAtLeast}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Search size={40} className="opacity-20 text-white mb-3 mx-auto" />
                                        <p className="text-[var(--muted-foreground)] text-sm">
                                            {t.typeAtLeast}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'invite' && (
                            <div className="text-center w-full animate-fade-in">
                                <p className="text-[var(--muted-foreground)] text-[10px] mb-3 uppercase tracking-widest font-bold">{t.friendCode}</p>
                                <div className="text-3xl font-black text-white italic tracking-widest mb-6 drop-shadow-lg">
                                    MOVIE-<span className="text-[var(--secondary)]">{user?.id ? user.id.slice(0, 5).toUpperCase() : '????'}</span>
                                </div>
                                <button onClick={() => { navigator.clipboard.writeText(`https://cinematch.app/invite/${user?.id || ''}`); showToast('Enlace copiado', 'success'); }} className="inline-flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] hover:border-[var(--secondary)] text-[var(--foreground)] px-8 py-3 rounded-xl transition-all text-xs font-bold uppercase tracking-wider hover:bg-[var(--secondary)]/10">
                                    <Copy size={16} /> Copiar Enlace
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Idioma y Tema */}
                <div className="section-card mb-10 shadow-xl backdrop-blur-md space-y-6">
                    {/* Idioma */}
                    <div>
                        <h2 className="heading-lg mb-3">
                            {t.language}
                        </h2>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setLanguage('es')}
                                className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-all ${
                                    language === 'es'
                                        ? 'bg-[var(--secondary)] text-black border-[var(--secondary)]'
                                        : 'bg-[var(--background)] text-[var(--muted-foreground)] border-[var(--border)]'
                                }`}
                            >
                                ES
                            </button>
                            <button
                                onClick={() => setLanguage('en')}
                                className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-all ${
                                    language === 'en'
                                        ? 'bg-[var(--secondary)] text-black border-[var(--secondary)]'
                                        : 'bg-[var(--background)] text-[var(--muted-foreground)] border-[var(--border)]'
                                }`}
                            >
                                EN
                            </button>
                        </div>
                    </div>

                    {/* Tema */}
                    <div>
                        <h2 className="heading-lg mb-3">
                            {t.theme}
                        </h2>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setTheme('light')}
                                className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-all ${
                                    theme === 'light'
                                        ? 'bg-[var(--secondary)] text-black border-[var(--secondary)]'
                                        : 'bg-[var(--background)] text-[var(--muted-foreground)] border-[var(--border)]'
                                }`}
                            >
                                {t.lightMode}
                            </button>
                            <button
                                onClick={() => setTheme('dark')}
                                className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-all ${
                                    theme === 'dark'
                                        ? 'bg-[var(--secondary)] text-black border-[var(--secondary)]'
                                        : 'bg-[var(--background)] text-[var(--muted-foreground)] border-[var(--border)]'
                                }`}
                            >
                                {t.darkMode}
                            </button>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => signOut()}
                    className="w-full py-5 rounded-2xl border border-[var(--destructive)]/30 text-[var(--destructive)] hover:bg-[var(--destructive)]/10 hover:border-[var(--destructive)] font-bold flex items-center justify-center gap-2 transition-all text-sm tracking-widest uppercase"
                >
                    <LogOut size={18} /> {t.signOut}
                </button>
            </div>
        </main>
    );
}
