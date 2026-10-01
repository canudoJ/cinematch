import React, { useState } from 'react';
import { useFriends } from '@/hooks/useFriends';
import CloseButton from './ui/CloseButton';
import { User, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';

interface RouletteInviteFriendsModalProps {
    lobbyId: string | null;
    onClose: () => void;
}

export default function RouletteInviteFriendsModal({ lobbyId, onClose }: RouletteInviteFriendsModalProps) {
    const { friends, loading } = useFriends();
    const { user } = useAuth();
    const [selected, setSelected] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const toggleFriend = (id: string) => {
        setSelected(prev => {
            if (prev.includes(id)) {
                return prev.filter(x => x !== id);
            }
            if (prev.length >= 5) return prev;
            return [...prev, id];
        });
    };

    const handleInvite = async () => {
        if (!user || !lobbyId || selected.length === 0) {
            onClose();
            return;
        }

        setSubmitting(true);
        try {
            const rows = selected.map(receiverId => ({
                lobby_id: lobbyId,
                sender_id: user.id,
                receiver_id: receiverId,
                status: 'pending'
            }));

            const { error } = await supabase
                .from('roulette_invitations')
                .insert(rows);

            if (error) {
                console.error('Error sending roulette invitations', error);
            }
        } finally {
            setSubmitting(false);
            onClose();
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2100,
                padding: '20px'
            }}
        >
            <div
                className="animate-pop-in"
                style={{
                    background: 'var(--background)',
                    width: '100%',
                    maxWidth: '480px',
                    borderRadius: '24px',
                    border: '1px solid #333',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '90vh'
                }}
            >
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="heading-lg" style={{ margin: 0 }}>
                        Invitar amigos
                    </h2>
                    <CloseButton onClose={onClose} className="relative top-0 right-0" size="sm" />
                </div>

                <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
                    {loading ? (
                        <p style={{ color: '#888' }}>Cargando amigos...</p>
                    ) : friends.length === 0 ? (
                        <p style={{ color: '#888' }}>Aún no tienes amigos añadidos.</p>
                    ) : (
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {friends.map((f: any) => {
                                const isSelected = selected.includes(f.id);
                                return (
                                    <li key={f.id}>
                                        <button
                                            type="button"
                                            onClick={() => toggleFriend(f.id)}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '10px 12px',
                                                borderRadius: '14px',
                                                border: isSelected ? '1px solid var(--secondary)' : '1px solid #333',
                                                background: isSelected ? 'var(--secondary)' : 'var(--card, #111)',
                                                color: isSelected ? '#000' : 'var(--foreground)',
                                                cursor: 'pointer',
                                                gap: '10px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div
                                                    style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '50%',
                                                        overflow: 'hidden',
                                                        background: '#222',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    {f.avatar_url ? (
                                                        <img
                                                            src={f.avatar_url}
                                                            alt={f.username || 'Amigo'}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                    ) : (
                                                        <User size={20} className="text-[var(--muted-foreground)]" aria-hidden />
                                                    )}
                                                </div>
                                                <div style={{ textAlign: 'left' }}>
                                                    <div style={{ fontWeight: 600 }}>{f.username || 'Amigo'}</div>
                                                </div>
                                            </div>
                                            <div>
                                                {isSelected ? (
                                                    <Check size={20} aria-hidden />
                                                ) : (
                                                    <div
                                                        style={{
                                                            width: '18px',
                                                            height: '18px',
                                                            borderRadius: '50%',
                                                            border: '2px solid #555'
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div style={{ padding: '16px 20px', borderTop: '1px solid #333', display: 'flex', gap: '10px' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '12px',
                            border: '1px solid #444',
                            background: '#111',
                            color: 'var(--foreground)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                        }}
                    >
                        <X size={18} aria-hidden />
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleInvite}
                        disabled={submitting || selected.length === 0}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'var(--destructive)',
                            color: 'white',
                            fontWeight: 700,
                            cursor: selected.length === 0 ? 'not-allowed' : 'pointer',
                            opacity: selected.length === 0 ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                        }}
                    >
                        <Check size={18} aria-hidden />
                        Invitar
                    </button>
                </div>
            </div>
        </div>
    );
}

