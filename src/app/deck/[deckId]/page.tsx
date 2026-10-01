'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Deck, Movie } from '@/lib/data';
import DeckPreviewModal from '@/components/DeckPreviewModal';
import { useDecks } from '@/context/DeckContext';
import { fetchDetails } from '@/services/tmdb';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function DeckPage() {
    const params = useParams();
    const router = useRouter();
    const { setActiveDeck } = useDecks();
    const [deck, setDeck] = useState<Deck | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const deckId = params?.deckId as string;

    useEffect(() => {
        if (!deckId) {
            setError('ID de baraja no válido');
            setLoading(false);
            return;
        }
        loadDeck();
    }, [deckId]);

    const loadDeck = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data: deckData, error: deckError } = await supabase
                .from('decks')
                .select(`
                    *,
                    deck_items (
                        movie_id,
                        media_type
                    ),
                    creator:profiles!decks_user_id_fkey (
                        id,
                        username,
                        avatar_url
                    )
                `)
                .eq('id', deckId)
                .single();

            if (deckError || !deckData) {
                setError('Baraja no encontrada');
                setLoading(false);
                return;
            }

            // Verificar permisos de acceso
            const { data: { user } } = await supabase.auth.getUser();
            const isPublic = deckData.privacy === 'public';
            const isOwner = user && deckData.user_id === user.id;

            // Para barajas 'friends': verificar amistad con el creador
            let isFriend = false;
            if (user && deckData.privacy === 'friends' && !isOwner) {
                const { data: friendship } = await supabase
                    .from('friendships')
                    .select('id')
                    .or(`and(requester_id.eq.${user.id},receiver_id.eq.${deckData.user_id}),and(requester_id.eq.${deckData.user_id},receiver_id.eq.${user.id})`)
                    .eq('status', 'accepted')
                    .maybeSingle();
                isFriend = !!friendship;
            }

            if (!isPublic && !isOwner && !isFriend) {
                setError('No tienes permiso para ver esta baraja');
                setLoading(false);
                return;
            }

            // Hidratar películas desde deck_items
            const movies: Movie[] = [];
            if (deckData.deck_items && Array.isArray(deckData.deck_items)) {
                const moviePromises = deckData.deck_items.map(async (item: any) => {
                    try {
                        const details = await fetchDetails(
                            item.movie_id.toString(),
                            item.media_type || 'movie'
                        );
                        if (details) {
                            return {
                                id: details.id.toString(),
                                type: item.media_type || 'movie',
                                title: details.title || details.name || 'Unknown',
                                title_es: details.title || details.name,
                                year: new Date(details.release_date || details.first_air_date || Date.now()).getFullYear(),
                                rating: details.vote_average || 0,
                                image: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : '',
                                synopsis: details.overview || '',
                                synopsis_es: details.overview,
                                genres: (details as any).genres?.map((g: any) => g.name) || []
                            } as Movie;
                        }
                    } catch (err) {
                        console.error(`Error loading movie ${item.movie_id}:`, err);
                    }
                    return null;
                });

                const results = await Promise.allSettled(moviePromises);
                results.forEach(result => {
                    if (result.status === 'fulfilled' && result.value) {
                        movies.push(result.value);
                    }
                });
            }

            const loadedDeck: Deck = {
                id: deckData.id,
                creatorId: deckData.user_id,
                creatorName: (deckData.creator as any)?.username || 'Usuario',
                creatorAvatar: (deckData.creator as any)?.avatar_url || null,
                title: deckData.title,
                description: deckData.description || '',
                movies,
                tags: deckData.tags || [],
                likes: deckData.likes || 0,
                views: deckData.views || 0,
                isPublic: deckData.privacy === 'public',
                isOfficial: false,
                privacy: deckData.privacy || 'private'
            };

            setDeck(loadedDeck);
        } catch (err: any) {
            console.error('Error loading deck:', err);
            setError(err.message || 'Error al cargar la baraja');
        } finally {
            setLoading(false);
        }
    };

    const handlePlay = () => {
        if (deck) {
            setActiveDeck(deck);
            router.push('/');
        }
    };

    const handleClose = () => {
        router.push('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="animate-spin text-[var(--secondary)] mb-4 mx-auto" size={48} />
                    <p className="text-[var(--muted-foreground)]">Cargando baraja...</p>
                </div>
            </div>
        );
    }

    if (error || !deck) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <h1 className="heading-lg mb-4 text-[var(--destructive)]">Error</h1>
                    <p className="text-[var(--muted-foreground)] mb-6">{error || 'Baraja no encontrada'}</p>
                    <Button onClick={() => router.push('/')} className="w-full">
                        Volver al inicio
                    </Button>
                </div>
            </div>
        );
    }

    return <DeckPreviewModal deck={deck} onClose={handleClose} onPlay={handlePlay} />;
}
