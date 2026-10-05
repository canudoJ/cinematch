'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { DECK_COLUMNS, buildDeck, hydrateDeck as hydrate } from '@/lib/decks';
import { fetchProfilesMap, getFriendIds } from '@/lib/friends';
import type { Deck, DeckItemRef, DeckWithItems, Privacy } from '@/types';

export interface SaveDeckInput {
    /** Si se indica, se actualiza esa baraja; si no, se crea una nueva */
    id?: string;
    title: string;
    description?: string;
    tags?: string[];
    items: DeckItemRef[];
    privacy: Privacy;
}

const MAX_TITLE_LENGTH = 100;

interface DeckContextType {
    /** Barajas propias */
    decks: Deck[];
    /** Baraja que se está jugando (o un deck temporal, id 'temp-…', del test de afinidad) */
    activeDeck: Deck | null;
    setActiveDeck: (deck: Deck | null) => void;
    fetchDecks: () => Promise<void>;
    fetchFriendDecks: () => Promise<Deck[]>;
    fetchPopularDecks: () => Promise<Deck[]>;
    /** Carga todas las películas de una baraja de listado */
    hydrateDeck: (deck: Deck) => Promise<Deck>;
    saveDeck: (input: SaveDeckInput) => Promise<boolean>;
    deleteDeck: (deckId: string) => Promise<boolean>;
    incrementDeckViews: (deckId: string) => Promise<void>;
}

const DeckContext = createContext<DeckContextType | undefined>(undefined);

export function DeckProvider({ children }: { children: React.ReactNode }) {
    const { user, profile } = useAuth();
    const { language } = useLanguage();
    const userId = user?.id ?? null;

    /** Barajas propias junto a su dueño: al cambiar de cuenta nunca se muestran las de otro */
    const [ownDecks, setOwnDecks] = useState<{ owner: string | null; list: Deck[] }>({ owner: null, list: [] });
    const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
    const isSavingRef = useRef(false);
    /** Solo se aplica la respuesta de la petición más reciente */
    const latestRequest = useRef(0);

    const fetchDecks = useCallback(async () => {
        if (!userId) return;
        const requestId = ++latestRequest.current;
        const { data, error } = await supabase
            .from('decks')
            .select(DECK_COLUMNS)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Error loading decks:', error.message);
            return;
        }
        const built = await Promise.all(
            ((data ?? []) as DeckWithItems[]).map(row => buildDeck(row, undefined, language)),
        );
        if (requestId === latestRequest.current) setOwnDecks({ owner: userId, list: built });
    }, [userId, language]);

    useEffect(() => {
        void fetchDecks();
    }, [fetchDecks]);

    // Sin sesión no hay barajas propias; el autor de las propias es siempre el perfil actual
    const decks = useMemo(() => (
        userId && ownDecks.owner === userId
            ? ownDecks.list.map(d => ({ ...d, creatorName: profile?.username ?? '', creatorAvatar: profile?.avatar_url ?? undefined }))
            : []
    ), [userId, ownDecks, profile?.username, profile?.avatar_url]);

    const buildFromRows = useCallback(async (rows: DeckWithItems[]) => {
        const creators = await fetchProfilesMap(rows.map(r => r.user_id));
        return Promise.all(rows.map(row => buildDeck(row, creators.get(row.user_id), language)));
    }, [language]);

    const fetchFriendDecks = useCallback(async (): Promise<Deck[]> => {
        if (!userId) return [];
        const friendIds = await getFriendIds(userId);
        if (friendIds.length === 0) return [];
        const { data, error } = await supabase
            .from('decks')
            .select(DECK_COLUMNS)
            .in('user_id', friendIds)
            .in('privacy', ['friends', 'public'])
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Error loading friend decks:', error.message);
            return [];
        }
        return buildFromRows((data ?? []) as DeckWithItems[]);
    }, [userId, buildFromRows]);

    // Públicas: visibles también sin sesión (RLS solo expone privacy = 'public')
    const fetchPopularDecks = useCallback(async (): Promise<Deck[]> => {
        const { data, error } = await supabase
            .from('decks')
            .select(DECK_COLUMNS)
            .eq('privacy', 'public')
            .order('views', { ascending: false })
            .limit(30);
        if (error) {
            console.error('Error loading popular decks:', error.message);
            return [];
        }
        return buildFromRows((data ?? []) as DeckWithItems[]);
    }, [buildFromRows]);

    const hydrateDeck = useCallback((deck: Deck) => hydrate(deck, language), [language]);

    const saveDeck = useCallback(async ({ id, title, description, tags, items, privacy }: SaveDeckInput) => {
        const cleanTitle = title.trim();
        if (!userId || isSavingRef.current) return false;
        if (!cleanTitle || cleanTitle.length > MAX_TITLE_LENGTH) return false;

        // Sin duplicados (deck_items tiene UNIQUE(deck_id, movie_id)) ni IDs inválidos
        const uniqueItems = [...new Map(
            items.filter(i => /^\d+$/.test(String(i.id))).map(i => [String(i.id), i]),
        ).values()];
        if (uniqueItems.length === 0 && !id) return false;

        isSavingRef.current = true;
        try {
            const payload = {
                user_id: userId,
                title: cleanTitle,
                description: description?.trim() || null,
                tags: (tags ?? []).filter(t => t.trim().length > 0),
                privacy,
            };

            let deckId = id;
            if (deckId) {
                const { error } = await supabase.from('decks').update(payload).eq('id', deckId).eq('user_id', userId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('decks').insert(payload).select('id').single();
                if (error) throw error;
                deckId = (data as { id: string }).id;
            }

            // 1) Añadir los títulos nuevos (los existentes se ignoran)
            if (uniqueItems.length > 0) {
                const { error } = await supabase.from('deck_items').upsert(
                    uniqueItems.map(item => ({ deck_id: deckId, movie_id: Number(item.id), media_type: item.type })),
                    { onConflict: 'deck_id,movie_id', ignoreDuplicates: true },
                );
                if (error) {
                    if (!id) await supabase.from('decks').delete().eq('id', deckId); // no dejar barajas vacías a medias
                    throw error;
                }
            }
            // 2) Solo después, quitar los que ya no están: si el paso 1 falla, no se pierde nada
            if (id) {
                let removal = supabase.from('deck_items').delete().eq('deck_id', deckId);
                if (uniqueItems.length > 0) removal = removal.not('movie_id', 'in', `(${uniqueItems.map(i => Number(i.id)).join(',')})`);
                const { error } = await removal;
                if (error) throw error;
            }

            await fetchDecks();
            return true;
        } catch (err) {
            console.error('Error saving deck:', err);
            return false;
        } finally {
            isSavingRef.current = false;
        }
    }, [userId, fetchDecks]);

    const deleteDeck = useCallback(async (deckId: string) => {
        if (!userId) return false;
        // deck_items se borra en cascada
        const { error } = await supabase.from('decks').delete().eq('id', deckId).eq('user_id', userId);
        if (error) {
            console.error('Error deleting deck:', error.message);
            return false;
        }
        setOwnDecks(prev => ({ ...prev, list: prev.list.filter(d => d.id !== deckId) }));
        setActiveDeck(prev => (prev?.id === deckId ? null : prev));
        return true;
    }, [userId]);

    /** La función de BD solo cuenta barajas públicas; no se cuentan las visitas propias */
    const incrementDeckViews = useCallback(async (deckId: string) => {
        if (ownDecks.list.some(d => d.id === deckId)) return;
        const { error } = await supabase.rpc('increment_deck_views', { deck_id: deckId });
        if (error) console.error('Error incrementing deck views:', error.message);
    }, [ownDecks]);

    const value = useMemo<DeckContextType>(() => ({
        decks, activeDeck, setActiveDeck, fetchDecks, fetchFriendDecks, fetchPopularDecks,
        hydrateDeck, saveDeck, deleteDeck, incrementDeckViews,
    }), [decks, activeDeck, fetchDecks, fetchFriendDecks, fetchPopularDecks, hydrateDeck, saveDeck, deleteDeck, incrementDeckViews]);

    return <DeckContext.Provider value={value}>{children}</DeckContext.Provider>;
}

export const useDecks = () => {
    const context = useContext(DeckContext);
    if (context === undefined) {
        throw new Error('useDecks must be used within a DeckProvider');
    }
    return context;
};
