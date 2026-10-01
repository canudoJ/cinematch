'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import { useLobby } from './LobbyContext';
import { useRouter } from 'next/navigation';

interface PendingInvite {
  id: string;
  lobby_id: string;
  sender_name: string;
}

interface RouletteInviteContextType {
  pendingInvite: PendingInvite | null;
  dismissInvite: () => void;
}

const RouletteInviteContext = createContext<RouletteInviteContextType | undefined>(undefined);

export function RouletteInviteProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const { joinLobby } = useLobby();
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('roulette-invites-' + user.id)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'roulette_invitations',
          filter: `receiver_id=eq.${user.id}`
        },
        async (payload) => {
          const row: any = payload.new;
          if (row.status !== 'pending') return;

          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', row.sender_id)
            .single();

          setPendingInvite({
            id: row.id,
            lobby_id: row.lobby_id,
            sender_name: profile?.username || 'Un amigo'
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, joinLobby]);

  const handleAccept = async () => {
    if (!pendingInvite || !user?.id) return;
    try {
      // Marcar invitación como aceptada
      const { error: updateError } = await supabase
        .from('roulette_invitations')
        .update({ status: 'accepted' })
        .eq('id', pendingInvite.id)
        .eq('receiver_id', user.id);

      if (updateError) {
        console.error('Error updating roulette invite status', updateError);
      }

      // Unirse al lobby (esto registra al usuario como miembro y abre el canal Realtime)
      await joinLobby(pendingInvite.lobby_id);

      // Guardar en localStorage por si la navegación se pierde por cualquier razón
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('lastRouletteLobbyId', pendingInvite.lobby_id);
      }

      setPendingInvite(null);

      // Forzar navegación al lobby
      router.push('/roulette-lobby');
      if (typeof window !== 'undefined') {
        // Fallback duro por si el router tarda o falla
        window.setTimeout(() => {
          window.location.assign('/roulette-lobby');
        }, 50);
      }
    } catch (error) {
      console.error('Error accepting roulette invite', error);
    }
  };

  const handleDecline = async () => {
    if (!pendingInvite || !user?.id) return;
    try {
      await supabase
        .from('roulette_invitations')
        .update({ status: 'declined' })
        .eq('id', pendingInvite.id)
        .eq('receiver_id', user.id);
    } catch (error) {
      console.error('Error declining roulette invite', error);
    } finally {
      setPendingInvite(null);
    }
  };

  const dismissInvite = () => setPendingInvite(null);

  return (
    <RouletteInviteContext.Provider value={{ pendingInvite, dismissInvite }}>
      {children}
      {pendingInvite && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2200,
            padding: '20px'
          }}
        >
          <div
            className="animate-pop-in"
            style={{
              background: 'var(--background)',
              borderRadius: '20px',
              border: '1px solid var(--secondary)',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 0 30px rgba(0,0,0,0.6)'
            }}
          >
            <h2 className="heading-lg" style={{ marginBottom: '12px' }}>
              Invitación a Ruleta Rusa
            </h2>
            <p style={{ color: '#ddd', marginBottom: '20px' }}>
              Tu amigo {pendingInvite.sender_name} te ha invitado a jugar al modo ruleta rusa.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleDecline}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  border: '1px solid #444',
                  background: '#111',
                  color: 'var(--foreground)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Rechazar
              </button>
              <button
                type="button"
                onClick={handleAccept}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--secondary)',
                  color: '#000',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </RouletteInviteContext.Provider>
  );
}

export function useRouletteInvite() {
  const ctx = useContext(RouletteInviteContext);
  if (!ctx) {
    throw new Error('useRouletteInvite must be used within RouletteInviteProvider');
  }
  return ctx;
}

