'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Movie, Deck } from '@/lib/data';
import { fetchDetails } from '@/services/tmdb';
import { useAuth } from '@/context/AuthProvider';

interface DeckContextType {
    decks: Deck[];
    isLoading: boolean;
    error: string | null;
    activeDeck: Deck | null;
    setActiveDeck: (deck: Deck | null) => void;
    fetchDecks: () => Promise<void>;
    fetchFriendDecks: () => Promise<Deck[]>;
    fetchPopularDecks: () => Promise<Deck[]>;
    saveDeck: (deckData: { id?: string; title: string; description?: string; tags?: string[]; items: any[]; privacy?: 'private' | 'friends' | 'public' }) => Promise<boolean>;
    deleteDeck: (deckId: string) => Promise<void>;
    incrementDeckViews: (deckId: string) => Promise<void>;
}

const DeckContext = createContext<DeckContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Helper: Normalizar tags desde DB (puede ser array, string o null)
// ---------------------------------------------------------------------------
function normalizeTags(raw: any): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter((t: any) => t && typeof t === 'string');
    if (typeof raw === 'string') return [raw];
    return [];
}

// ---------------------------------------------------------------------------
// Helper: Poblar un deck con detalles de películas desde TMDB
// Recibe la fila de DB y un Map de perfiles { id -> { username, avatar_url } }
// ---------------------------------------------------------------------------
async function populateDeck(
    d: any,
    profilesMap: Map<string, any>,
    overrides: Partial<Deck> = {}
): Promise<Deck> {
    const deckItems: any[] = d.deck_items || [];
    const creatorProfile = profilesMap.get(d.user_id) || {};

    let movies: Movie[] = [];
    if (deckItems.length > 0) {
        const results = await Promise.allSettled(
            deckItems.map((item: any) =>
                fetchDetails(item.movie_id.toString(), item.media_type || 'movie')
            )
        );
        movies = results
            .map((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    const details = result.value;
                    const mediaType = (deckItems[index]?.media_type || 'movie') as 'movie' | 'tv';
                    return {
                        id: details.id.toString(),
                        title: details.title || details.name || 'Sin título',
                        image: details.poster_path
                            ? `https://image.tmdb.org/t/p/w200${details.poster_path}`
                            : '',
                        type: mediaType,
                        rating: details.vote_average || 0,
                        year: new Date(
                            details.release_date || details.first_air_date || Date.now()
                        ).getFullYear(),
                        synopsis: details.overview || '',
                        synopsis_es: details.overview || '',
                        genres: []
                    } as Movie;
                }
                return null;
            })
            .filter((m): m is Movie => m !== null);
    }

    return {
        id: d.id,
        creatorId: d.user_id,
        creatorName: creatorProfile.username || 'Usuario',
        creatorAvatar: creatorProfile.avatar_url || undefined,
        title: d.title,
        description: d.description || '',
        likes: 0,
        tags: normalizeTags(d.tags),
        isPublic: d.privacy === 'public',
        privacy: d.privacy || 'private',
        views: d.views || 0,
        movies,
        ...overrides
    };
}

export function DeckProvider({ children }: { children: React.ReactNode }) {
    const { user, supabase, profile } = useAuth();
    const [decks, setDecks] = useState<Deck[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeDeck, setActiveDeck] = useState<Deck | null>(null);

    // ---------------------------------------------------------------------------
    // 1. CARGAR BARAJAS PROPIAS
    // ---------------------------------------------------------------------------
    const fetchDecks = async () => {
        if (!user) {
            setDecks([]);
            setIsLoading(false);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data: decksData, error: fetchError } = await supabase
                .from('decks')
                .select(`*, deck_items (movie_id, media_type)`)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (fetchError) throw new Error(`Error cargando barajas: ${fetchError.message}`);

            // Para las barajas propias usamos el profile del contexto directamente
            const selfProfile = { username: profile?.username || 'Me', avatar_url: profile?.avatar_url || null };
            const profilesMap = new Map([[user.id, selfProfile]]);

            const populatedDecks = await Promise.all(
                (decksData || []).map((d: any) => populateDeck(d, profilesMap))
            );

            setDecks(populatedDecks);
        } catch (err: any) {
            console.error('Error loading decks:', err);
            setError(err.message || 'Error desconocido al cargar barajas');
        } finally {
            setIsLoading(false);
        }
    };

    // Recargar cuando cambia el usuario o el perfil
    useEffect(() => {
        if (user?.id) {
            fetchDecks();
        } else {
            setDecks([]);
            setError(null);
        }
    }, [user?.id, profile?.username, profile?.avatar_url]);

    // ---------------------------------------------------------------------------
    // 2. GUARDAR BARAJA (crear o actualizar)
    // ---------------------------------------------------------------------------
    const saveDeck = async ({
        id,
        title,
        description,
        items,
        tags,
        privacy
    }: {
        id?: string;
        title: string;
        description?: string;
        tags?: string[];
        items: any[];
        privacy?: 'private' | 'friends' | 'public';
    }) => {
        if (!user || isSaving) return false;
        if (!title || title.trim().length === 0 || title.length > 100) return false;

        const validItems = items.filter(item => {
            const movieId = item.id || item.movie_id;
            if (!movieId) return false;
            const numId = typeof movieId === 'string' ? parseInt(movieId, 10) : movieId;
            return !isNaN(numId) && numId > 0;
        });

        if (validItems.length === 0 && !id) return false;

        const previousDecks = [...decks];
        let wasNewDeck = false;
        let newDeckId: string | null = null;

        setIsSaving(true);

        try {
            const cleanTitle = title.trim() || 'Sin título';
            const deckPayload: any = {
                title: cleanTitle,
                user_id: user.id,
                privacy: privacy ?? 'private'
            };
            if (description !== undefined) deckPayload.description = description.trim() || null;
            if (tags !== undefined) {
                deckPayload.tags = Array.isArray(tags)
                    ? tags.filter(t => t && t.trim().length > 0)
                    : [];
            }

            let currentDeckId = id;

            if (id) {
                // ACTUALIZAR
                const { error: updateError } = await supabase
                    .from('decks')
                    .update(deckPayload)
                    .eq('id', id)
                    .eq('user_id', user.id);

                if (updateError) throw new Error(`Error actualizando baraja: ${updateError.message}`);
            } else {
                // CREAR — insert + select atómico (sin race condition)
                const { data: insertedDeck, error: insertError } = await supabase
                    .from('decks')
                    .insert(deckPayload)
                    .select('id')
                    .single();

                if (insertError) throw new Error(`Error creando baraja: ${insertError.message}`);
                if (!insertedDeck?.id) throw new Error('Error obteniendo ID de la baraja creada');

                currentDeckId = insertedDeck.id;
                newDeckId = insertedDeck.id;
                wasNewDeck = true;
            }

            if (!currentDeckId) throw new Error('Error obteniendo ID de la baraja');

            // Reemplazar items (delete + insert)
            if (id) {
                const { error: deleteError } = await supabase
                    .from('deck_items')
                    .delete()
                    .eq('deck_id', currentDeckId);
                if (deleteError) console.warn('Error eliminando items antiguos (continuando):', deleteError);
            }

            if (validItems.length > 0) {
                const itemsToInsert = validItems.map(item => {
                    const movieId = item.id || item.movie_id;
                    const numMovieId = typeof movieId === 'string' ? parseInt(movieId, 10) : movieId;
                    return {
                        deck_id: currentDeckId,
                        movie_id: numMovieId,
                        media_type: item.type || item.media_type || 'movie',
                        added_at: new Date().toISOString()
                    };
                });

                const { error: itemsError } = await supabase.from('deck_items').insert(itemsToInsert);

                if (itemsError) {
                    if (wasNewDeck && newDeckId) {
                        await supabase.from('decks').delete().eq('id', newDeckId);
                    }
                    throw new Error(`Error guardando películas: ${itemsError.message}`);
                }
            }

            await fetchDecks();
            return true;
        } catch (error: any) {
            console.error('SAVE ERROR:', error);
            if (wasNewDeck) setDecks(previousDecks);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    // ---------------------------------------------------------------------------
    // 3. ELIMINAR BARAJA
    // ---------------------------------------------------------------------------
    const deleteDeck = async (deckId: string) => {
        if (!user) return;

        try {
            // Eliminar items primero (cascada manual)
            const { error: itemsError } = await supabase
                .from('deck_items')
                .delete()
                .eq('deck_id', deckId);
            if (itemsError) console.warn('Error eliminando items (continuando):', itemsError);

            const { error: deckError } = await supabase
                .from('decks')
                .delete()
                .eq('id', deckId)
                .eq('user_id', user.id);

            if (deckError) throw new Error(`Error eliminando baraja: ${deckError.message}`);

            setDecks(prev => prev.filter(d => d.id !== deckId));
            await fetchDecks();
        } catch (error: any) {
            console.error('Error deleting deck:', error);
        }
    };

    // ---------------------------------------------------------------------------
    // 4. CARGAR BARAJAS DE AMIGOS
    // ---------------------------------------------------------------------------
    const fetchFriendDecks = async (): Promise<Deck[]> => {
        if (!user) return [];

        try {
            const { data: friendships, error: friendsError } = await supabase
                .from('friendships')
                .select('requester_id, receiver_id')
                .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .eq('status', 'accepted');

            if (friendsError || !friendships?.length) return [];

            const friendIds = new Set<string>();
            friendships.forEach((f: any) => {
                friendIds.add(f.requester_id === user.id ? f.receiver_id : f.requester_id);
            });
            if (friendIds.size === 0) return [];

            const { data: decksData, error: decksError } = await supabase
                .from('decks')
                .select(`*, deck_items (movie_id, media_type)`)
                .in('user_id', Array.from(friendIds))
                .eq('privacy', 'friends')
                .order('created_at', { ascending: false });

            if (decksError || !decksData?.length) return [];

            const profilesMap = await fetchProfilesMap(decksData);

            return Promise.all(
                decksData.map((d: any) =>
                    populateDeck(d, profilesMap, { isPublic: false, privacy: 'friends' })
                )
            );
        } catch (err: any) {
            console.error('Error loading friend decks:', err);
            return [];
        }
    };

    // ---------------------------------------------------------------------------
    // 5. CARGAR BARAJAS POPULARES
    // ---------------------------------------------------------------------------
    // Públicas: visibles también sin sesión (RLS solo expone privacy = 'public')
    const fetchPopularDecks = async (): Promise<Deck[]> => {
        try {
            const { data: decksData, error: decksError } = await supabase
                .from('decks')
                .select(`*, deck_items (movie_id, media_type)`)
                .eq('privacy', 'public')
                .order('views', { ascending: false })
                .limit(50);

            if (decksError || !decksData?.length) return [];

            const profilesMap = await fetchProfilesMap(decksData);

            return Promise.all(
                decksData.map((d: any) =>
                    populateDeck(d, profilesMap, { isPublic: true, privacy: 'public' })
                )
            );
        } catch (err: any) {
            console.error('Error loading popular decks:', err);
            return [];
        }
    };

    // ---------------------------------------------------------------------------
    // Helper interno: obtener profilesMap para un array de decksData
    // ---------------------------------------------------------------------------
    const fetchProfilesMap = async (decksData: any[]): Promise<Map<string, any>> => {
        const creatorIds = Array.from(new Set(decksData.map((d: any) => d.user_id)));
        const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', creatorIds);

        const map = new Map<string, any>();
        profilesData?.forEach((p: any) => map.set(p.id, p));
        return map;
    };

    // ---------------------------------------------------------------------------
    // 6. INCREMENTAR VISTAS
    // ---------------------------------------------------------------------------
    const incrementDeckViews = async (deckId: string) => {
        if (!user) return;

        try {
            const { data: deck, error: fetchError } = await supabase
                .from('decks')
                .select('privacy, user_id, views')
                .eq('id', deckId)
                .single();

            if (fetchError || !deck) return;
            if (deck.privacy !== 'public' || deck.user_id === user.id) return;

            // Intentar RPC primero, fallback a update directo
            const { error: rpcError } = await supabase.rpc('increment_deck_views', { deck_id: deckId });
            if (rpcError) {
                await supabase
                    .from('decks')
                    .update({ views: (deck.views || 0) + 1 })
                    .eq('id', deckId);
            }
        } catch (err: any) {
            console.error('Error incrementing deck views:', err);
        }
    };

    return (
        <DeckContext.Provider value={{
            decks,
            isLoading,
            error,
            activeDeck,
            setActiveDeck,
            fetchDecks,
            fetchFriendDecks,
            fetchPopularDecks,
            saveDeck,
            deleteDeck,
            incrementDeckViews
        }}>
            {children}
        </DeckContext.Provider>
    );
}

export const useDecks = () => {
    const context = useContext(DeckContext);
    if (context === undefined) {
        throw new Error('useDecks must be used within a DeckProvider');
    }
    return context;
};
