'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Singleton compartido
import { useAuth } from '@/context/AuthProvider'; // Contexto global
import { useFriends } from '@/hooks/useFriends';
import {
    User, Upload, LogOut, Save, Search, Users, Copy, CheckCircle, ChevronLeft, Loader2, 
    UserPlus, UserMinus, X, Check, XCircle, UserCheck
} from 'lucide-react';

import BackButton from '@/components/ui/BackButton';

type Tab = 'friends' | 'search' | 'invite';

export default function ProfilePage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // USAMOS EL CONTEXTO GLOBAL (¡La solución definitiva!)
    // Esto evita conflictos de sesiones múltiples
    const { user, profile, loading: loadingSession, signOut, updateProfile } = useAuth();
    const { 
        friends, 
        requests, 
        searchResults, 
        loading: friendsLoading, 
        searchLoading, 
        requestsLoading,
        sendRequest, 
        fetchFriends, 
        fetchRequests,
        searchUsers, 
        acceptRequest, 
        rejectRequest, 
        removeFriend 
    } = useFriends();

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
            alert('Error al subir imagen: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            await updateProfile({ username });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (error) {
            alert('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleSendRequest = async (userId: string) => {
        setActionLoading(`send-${userId}`);
        try {
            await sendRequest(userId);
            alert('Solicitud enviada');
        } catch (error: any) {
            alert(error.message || 'Error al enviar solicitud');
        } finally {
            setActionLoading(null);
        }
    };

    const handleAcceptRequest = async (requestId: string) => {
        setActionLoading(`accept-${requestId}`);
        try {
            await acceptRequest(requestId);
        } catch (error: any) {
            alert(error.message || 'Error al aceptar solicitud');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectRequest = async (requestId: string) => {
        setActionLoading(`reject-${requestId}`);
        try {
            await rejectRequest(requestId);
        } catch (error: any) {
            alert(error.message || 'Error al rechazar solicitud');
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
            alert(error.message || 'Error al eliminar amigo');
        } finally {
            setActionLoading(null);
        }
    };



    // --- RENDERIZADO ---
    if (loadingSession) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center z-50">
                <Loader2 className="animate-spin text-[var(--accent-green-alt)] mb-4" size={48} />
                <p className="text-gray-500 animate-pulse">Cargando datos...</p>
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
        <main className="min-h-screen bg-black text-white p-6 pb-24 pt-32 relative z-10 overflow-y-auto">
            {/* Botón Atrás Global */}
            <BackButton href="/" className="absolute top-6 left-6" />

            {/* Fondo ambiental verde */}
            <div className="fixed top-[-20%] left-[-20%] w-[500px] h-[500px] bg-[var(--accent-green-alt)] opacity-5 blur-[120px] pointer-events-none rounded-full" />

            {/* Cabecera */}
            <header className="flex items-center mb-10 relative z-20 max-w-xl mx-auto animate-fade-in">
                {/* Button removed here */}
                <h1 className="text-3xl font-black tracking-tighter italic">MI PERFIL</h1>
            </header>

            <div className="max-w-xl mx-auto relative z-10 animate-fade-in">

                {/* Avatar Glow */}
                <div className="flex flex-col items-center mb-10">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-[var(--accent-green-alt)] bg-[var(--bg-dark)] shadow-[0_0_40px_rgba(0,255,157,0.3)] flex items-center justify-center relative transition-transform group-hover:scale-105">
                            {uploading ? (
                                <Loader2 className="animate-spin text-[var(--accent-green-alt)]" size={40} />
                            ) : avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User size={64} className="text-gray-700" />
                            )}
                        </div>
                        <div className="absolute bottom-1 right-1 bg-[var(--accent-green-alt)] text-black p-3 rounded-full shadow-lg hover:scale-110 transition-transform border-4 border-black">
                            <Upload size={18} strokeWidth={3} />
                        </div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    <p className="mt-4 text-gray-400 text-sm font-medium">Toca para cambiar foto</p>
                </div>

                {/* Nivel */}
                <div className="text-center mb-10 bg-[var(--bg-dark)]/50 p-6 rounded-3xl border border-gray-800 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2 px-2">
                        <span className="text-xs font-bold text-[var(--accent-green-alt)] tracking-widest uppercase">Nivel Actual</span>
                        <span className="text-xs font-bold text-gray-500 tracking-widest uppercase">Siguiente Nivel</span>
                    </div>
                    <div className="flex items-end justify-between mb-4">
                        <span className="text-4xl font-black text-white italic">{profile?.level || 1}</span>
                        <span className="text-xl font-bold text-gray-600 italic">{(profile?.level || 1) + 1}</span>
                    </div>
                    <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                        <div className="h-full bg-gradient-to-r from-[var(--accent-green-alt)] to-[#00cc7d] w-[15%] shadow-[0_0_15px_var(--accent-green-alt)]" />
                    </div>
                    <p className="text-xs text-gray-500 mt-3 font-mono text-right">XP: 150 / 1000</p>
                </div>

                {/* Formulario */}
                <div className="bg-[var(--bg-dark)]/80 p-6 rounded-3xl border border-gray-800 mb-10 shadow-xl backdrop-blur-md">
                    <label className="block text-xs text-gray-500 mb-2 uppercase font-bold tracking-wider ml-1">Nombre de Usuario</label>
                    <div className="flex gap-3">
                        <input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="flex-1 bg-black/50 border border-gray-800 text-white p-4 rounded-xl focus:border-[var(--accent-green-alt)] focus:ring-1 focus:ring-[var(--accent-green-alt)]/50 focus:outline-none transition-all placeholder:text-gray-700 font-medium"
                            placeholder="Elige un nombre..."
                        />
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`w-14 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${saveSuccess ? 'bg-[var(--accent-green-alt)] border-[var(--accent-green-alt)] text-black' : 'bg-[var(--bg-darker)] border-gray-700 hover:border-[var(--accent-green-alt)] text-white'}`}
                        >
                            {saving ? <Loader2 className="animate-spin" size={24} /> : saveSuccess ? <CheckCircle size={24} /> : <Save size={24} />}
                        </button>
                    </div>
                    {saveSuccess && <p className="text-[var(--accent-green-alt)] text-xs mt-3 flex items-center gap-1 animate-pulse font-bold ml-1"><CheckCircle size={12} /> Guardado correctamente</p>}
                </div>

                {/* Tabs Sociales */}
                <div className="mb-12">
                    <div className="flex p-1 bg-[var(--bg-dark)] rounded-2xl border border-gray-800 mb-6">
                        {(['friends', 'search', 'invite'] as Tab[]).map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${activeTab === tab ? 'bg-[var(--accent-green-alt)] text-black shadow-[0_0_15px_rgba(0,255,157,0.4)]' : 'text-gray-500 hover:text-white'}`}>
                                {tab === 'search' ? 'Buscar' : tab === 'invite' ? 'Invitar' : 'Amigos'}
                            </button>
                        ))}
                    </div>

                    <div className="min-h-[150px] w-full py-8 bg-[var(--bg-dark)]/30 rounded-3xl border border-gray-800">
                        {activeTab === 'friends' && (
                            <div className="w-full px-6 animate-fade-in">
                                {friendsLoading || requestsLoading ? (
                                    <div className="flex flex-col items-center justify-center py-8">
                                        <Loader2 className="animate-spin text-[var(--accent-green-alt)] mb-3" size={32} />
                                        <p className="text-gray-500 text-sm">Cargando...</p>
                                    </div>
                                ) : requests.length > 0 ? (
                                    <div className="space-y-4 mb-6">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Solicitudes Pendientes ({requests.length})</h3>
                                        {requests.map(request => (
                                            <div key={request.id} className="bg-[var(--bg-dark)]/80 p-4 rounded-xl border border-gray-700 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[var(--accent-green-alt)] bg-[var(--bg-darker)] flex items-center justify-center">
                                                        {request.sender.avatar_url ? (
                                                            <img src={request.sender.avatar_url} alt={request.sender.username || 'Usuario'} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User size={24} className="text-gray-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white">{request.sender.username || 'Usuario sin nombre'}</p>
                                                        <p className="text-xs text-gray-400">Nivel {request.sender.level || 1}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleAcceptRequest(request.id)}
                                                        disabled={actionLoading === `accept-${request.id}`}
                                                        className="p-2 bg-[var(--accent-green-alt)] text-black rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
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
                                                        className="p-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
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
                                        {requests.length > 0 && <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 mt-6">Amigos ({friends.length})</h3>}
                                        {friends.map((friend: any) => {
                                            const friendshipId = friend.friendshipId || friend.id;
                                            return (
                                                <div key={friend.id} className="bg-[var(--bg-dark)]/80 p-4 rounded-xl border border-gray-700 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[var(--accent-green-alt)] bg-[var(--bg-darker)] flex items-center justify-center">
                                                            {friend.avatar_url ? (
                                                                <img src={friend.avatar_url} alt={friend.username || 'Amigo'} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <User size={24} className="text-gray-600" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-white">{friend.username || 'Amigo sin nombre'}</p>
                                                            <p className="text-xs text-gray-400">Nivel {friend.level || 1}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveFriend(friendshipId)}
                                                        disabled={actionLoading === `remove-${friendshipId}`}
                                                        className="p-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
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
                                        <p className="text-gray-500 text-sm">Tu lista de amigos está vacía.</p>
                                    </div>
                                ) : null}
                            </div>
                        )}
                        {activeTab === 'search' && (
                            <div className="w-full px-6 animate-fade-in">
                                <div className="flex gap-2 mb-4">
                                    <input 
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Buscar usuario..." 
                                        className="flex-1 bg-black/50 border border-gray-800 text-white p-3 rounded-xl focus:border-[var(--accent-green-alt)] focus:outline-none" 
                                    />
                                    <button 
                                        onClick={() => searchUsers(searchQuery)}
                                        className="bg-[#222] border border-gray-700 text-white px-4 rounded-xl hover:border-[var(--accent-green-alt)] transition-colors"
                                    >
                                        <Search size={20} />
                                    </button>
                                </div>
                                
                                {searchLoading ? (
                                    <div className="flex flex-col items-center justify-center py-8">
                                        <Loader2 className="animate-spin text-[var(--accent-green-alt)] mb-3" size={32} />
                                        <p className="text-gray-500 text-sm">Buscando...</p>
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    <div className="space-y-3">
                                        {searchResults.map(user => (
                                            <div key={user.id} className="bg-[var(--bg-dark)]/80 p-4 rounded-xl border border-gray-700 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[var(--accent-green-alt)] bg-[var(--bg-darker)] flex items-center justify-center">
                                                        {user.avatar_url ? (
                                                            <img src={user.avatar_url} alt={user.username || 'Usuario'} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User size={24} className="text-gray-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white">{user.username || 'Usuario sin nombre'}</p>
                                                        <p className="text-xs text-gray-400">Nivel {user.level || 1}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleSendRequest(user.id)}
                                                    disabled={actionLoading === `send-${user.id}`}
                                                    className="px-4 py-2 bg-[var(--accent-green-alt)] text-black rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    {actionLoading === `send-${user.id}` ? (
                                                        <>
                                                            <Loader2 className="animate-spin" size={16} />
                                                            Enviando...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserPlus size={16} />
                                                            Agregar
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : searchQuery.trim().length >= 2 ? (
                                    <div className="text-center py-8">
                                        <Search size={40} className="opacity-20 text-white mb-3 mx-auto" />
                                        <p className="text-gray-500 text-sm">No se encontraron usuarios.</p>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Search size={40} className="opacity-20 text-white mb-3 mx-auto" />
                                        <p className="text-gray-500 text-sm">Escribe al menos 2 caracteres para buscar.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'invite' && (
                            <div className="text-center w-full animate-fade-in">
                                <p className="text-gray-500 text-[10px] mb-3 uppercase tracking-widest font-bold">Tu Código de Amigo</p>
                                <div className="text-3xl font-black text-white italic tracking-widest mb-6 drop-shadow-lg">
                                    MOVIE-<span className="text-[var(--accent-green-alt)]">{user?.id ? user.id.slice(0, 5).toUpperCase() : '????'}</span>
                                </div>
                                <button onClick={() => { navigator.clipboard.writeText(`https://cinematch.app/invite/${user?.id || ''}`); alert('Enlace copiado'); }} className="inline-flex items-center gap-2 bg-[var(--bg-dark)] border border-gray-700 hover:border-[var(--accent-green-alt)] text-white px-8 py-3 rounded-xl transition-all text-xs font-bold uppercase tracking-wider hover:bg-[var(--accent-green-alt)]/10">
                                    <Copy size={16} /> Copiar Enlace
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => signOut()}
                    className="w-full py-5 rounded-2xl border border-red-900/30 text-red-500 hover:bg-red-500/10 hover:border-red-500 font-bold flex items-center justify-center gap-2 transition-all text-sm tracking-widest uppercase"
                >
                    <LogOut size={18} /> Cerrar Sesión
                </button>
            </div>
        </main>
    );
}