'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
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
    saveDeck: (deckData: { id?: string; title: string; description?: string; tags?: string[]; items: any[] }) => Promise<boolean>;
    deleteDeck: (deckId: string) => Promise<void>;
}

const DeckContext = createContext<DeckContextType | undefined>(undefined);

export function DeckProvider({ children }: { children: React.ReactNode }) {
    const { user, supabase } = useAuth(); // Usar contexto centralizado
    const [decks, setDecks] = useState<Deck[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeDeck, setActiveDeck] = useState<Deck | null>(null);

    // 1. CARGAR BARAJAS
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
                .select(`
                    *,
                    deck_items (
                        movie_id
                    )
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (fetchError) {
                throw new Error(`Error cargando barajas: ${fetchError.message}`);
            }

            // Optimización: Cargar detalles solo si es necesario, o manejar errores individualmente
            // Limitar concurrencia o simplificar datos iniciales si son muchos
            const populatedDecks: Deck[] = await Promise.all((decksData || []).map(async (d: any) => {
                const movieIds = d.deck_items?.map((i: any) => i.movie_id) || [];

                // Si no hay items, retorno rápido
                if (movieIds.length === 0) {
                    // Asegurar que tags sea un array
                    let tagsArray: string[] = [];
                    if (d.tags) {
                        tagsArray = Array.isArray(d.tags) ? d.tags : (typeof d.tags === 'string' ? [d.tags] : []);
                    }
                    return {
                        id: d.id, creatorId: d.user_id, creatorName: 'Me', title: d.title,
                        description: d.description || '', likes: 0, tags: tagsArray, isPublic: false, movies: []
                    };
                }

                // Cargar detalles de películas (TMDB)
                // Usamos Promise.allSettled para evitar que una falla cancele todo
                const moviePromises = movieIds.map((mid: number) => fetchDetails(mid.toString(), 'movie'));
                const moviesResults = await Promise.allSettled(moviePromises);

                const movies = moviesResults
                    .map(result => result.status === 'fulfilled' ? result.value : null)
                    .filter(Boolean)
                    .map(details => ({
                        id: details.id.toString(),
                        title: details.title || details.name,
                        image: details.poster_path ? `https://image.tmdb.org/t/p/w200${details.poster_path}` : '',
                        type: 'movie',
                        rating: details.vote_average,
                        year: new Date(details.release_date || Date.now()).getFullYear()
                    } as Movie));

                // Asegurar que tags sea un array válido
                let tagsArray: string[] = [];
                if (d.tags) {
                    if (Array.isArray(d.tags)) {
                        tagsArray = d.tags.filter(tag => tag && typeof tag === 'string');
                    } else if (typeof d.tags === 'string') {
                        tagsArray = [d.tags];
                    }
                }
                
                return {
                    id: d.id,
                    creatorId: d.user_id,
                    creatorName: user.email?.split('@')[0] || 'Me',
                    title: d.title,
                    description: d.description || '',
                    likes: 0,
                    tags: tagsArray,
                    isPublic: false,
                    movies: movies
                };
            }));

            // Ordenar por fecha de creación (los nuevos primero) implícito por la query SQL
            setDecks(populatedDecks);
        } catch (err: any) {
            console.error('Error loading decks:', err);
            const errorMessage = err.message || 'Error desconocido al cargar barajas';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Recargar cuando cambia el usuario (desde AuthProvider)
    useEffect(() => {
        const userId = user?.id;
        if (userId) {
            fetchDecks();
        } else {
            setDecks([]); // Limpiar si no hay usuario
            setError(null);
        }
    }, [user?.id]); // Solo depender del ID, no del objeto completo

    const saveDeck = async ({ id, title, description, items, tags }: { id?: string; title: string; description?: string; tags?: string[]; items: any[] }) => {
        // Validación inicial
        if (!user) {
            toast.error("No has iniciado sesión.");
            return false;
        }

        if (isSaving) {
            toast.error("Ya se está guardando una baraja. Por favor espera.");
            return false;
        }

        // Validar datos
        if (!title || title.trim().length === 0) {
            toast.error("El título de la baraja es requerido.");
            return false;
        }

        if (title.length > 100) {
            toast.error("El título es demasiado largo (máximo 100 caracteres).");
            return false;
        }

        // Validar items - aceptar números o strings numéricos
        const validItems = items.filter(item => {
            const movieId = item.id || item.movie_id;
            if (!movieId) return false;
            
            // Convertir string a número si es necesario
            const numId = typeof movieId === 'string' ? parseInt(movieId, 10) : movieId;
            return !isNaN(numId) && numId > 0;
        });

        if (validItems.length === 0 && !id) {
            toast.error("Debes agregar al menos una película a la baraja.");
            return false;
        }

        // Snapshot para rollback
        const previousDeck = id ? decks.find(d => d.id === id) : null;
        const previousDecks = [...decks];
        let wasNewDeck = false;
        let newDeckId: string | null = null;

        setIsSaving(true);

        try {
            // Payload con las columnas esenciales
            // NOTA: Si obtienes un error sobre la columna 'title', ejecuta el script fix_decks_schema.sql en Supabase
            // Asegurar que el título nunca sea null o vacío
            const cleanTitle = (title || '').trim() || 'Sin título';
            
            const deckPayload: any = {
                title: cleanTitle,
                user_id: user.id,
            };
            
            // Agregar description y tags si están presentes
            if (description !== undefined) {
                deckPayload.description = description.trim() || null;
            }
            if (tags !== undefined && Array.isArray(tags) && tags.length > 0) {
                deckPayload.tags = tags.filter(tag => tag && tag.trim().length > 0);
            } else if (tags !== undefined) {
                deckPayload.tags = [];
            }

            let currentDeckId = id;

            // A. Guardar Cabecera
            if (id) {
                const { error: updateError } = await supabase
                    .from('decks')
                    .update(deckPayload)
                    .eq('id', id)
                    .eq('user_id', user.id);

                if (updateError) {
                    // Manejar errores específicos
                    let errorMsg = updateError.message;
                    if (errorMsg.includes('updated_at')) {
                        errorMsg = `Error: La columna 'updated_at' no existe o el trigger está mal configurado. Ejecuta el script fix_decks_schema.sql en Supabase para corregir el schema. Error original: ${updateError.message}`;
                    } else if (errorMsg.includes('name') || errorMsg.includes('title')) {
                        errorMsg = `Error: Problema con el schema de la tabla. Ejecuta el script fix_decks_schema.sql en Supabase para migrar el schema. Error original: ${updateError.message}`;
                    } else {
                        errorMsg = `Error actualizando baraja: ${updateError.message}. Si el error persiste, ejecuta el script fix_decks_schema.sql en Supabase.`;
                    }
                    throw new Error(errorMsg);
                }
                currentDeckId = id;
            } else {
                // Para insert, hacerlo sin select para evitar problemas de schema cache
                const { error: insertError } = await supabase
                    .from('decks')
                    .insert(deckPayload);

                if (insertError) {
                    // Si el error menciona 'name', es porque el schema cache está desactualizado
                    // o el script SQL no se ha ejecutado. El código solo usa 'title'.
                    const errorMsg = insertError.message.includes('name') 
                        ? `Error: La base de datos necesita ser actualizada. Ejecuta el script fix_decks_schema.sql en el SQL Editor de Supabase para migrar la columna 'name' a 'title'. Error original: ${insertError.message}`
                        : `Error creando baraja: ${insertError.message}. Si el error menciona la columna 'title', ejecuta el script fix_decks_schema.sql en el SQL Editor de Supabase para crear/verificar la estructura correcta de la tabla.`;
                    throw new Error(errorMsg);
                }

                // Obtener el id del último deck creado por este usuario
                const { data: lastDeck, error: fetchError } = await supabase
                    .from('decks')
                    .select('id')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (fetchError || !lastDeck?.id) {
                    throw new Error(`Error obteniendo ID de la baraja creada: ${fetchError?.message || 'ID no encontrado'}`);
                }

                currentDeckId = lastDeck.id;
                newDeckId = lastDeck.id;
                wasNewDeck = true;
            }

            if (!currentDeckId) {
                throw new Error("Error obteniendo ID de la baraja");
            }

            // B. Guardar Items
            // Si estamos editando, eliminar items antiguos primero
            if (id) {
                const { error: deleteError } = await supabase
                    .from('deck_items')
                    .delete()
                    .eq('deck_id', currentDeckId);

                if (deleteError) {
                    console.warn('Error eliminando items antiguos (continuando):', deleteError);
                    // No lanzamos error aquí, puede que no haya items antiguos
                }
            }

            // Insertar nuevos items si hay
            if (validItems.length > 0) {
                const itemsToInsert = validItems.map(item => {
                    // Convertir id a número si es string
                    const movieId = item.id || item.movie_id;
                    const numMovieId = typeof movieId === 'string' ? parseInt(movieId, 10) : movieId;
                    
                    return {
                        deck_id: currentDeckId,
                        movie_id: numMovieId,
                        media_type: item.type || item.media_type || 'movie',
                        added_at: new Date().toISOString()
                    };
                });

                const { error: itemsError } = await supabase
                    .from('deck_items')
                    .insert(itemsToInsert);

                if (itemsError) {
                    // Rollback: si es una baraja nueva, eliminarla
                    if (wasNewDeck && newDeckId) {
                        await supabase.from('decks').delete().eq('id', newDeckId);
                    }
                    throw new Error(`Error guardando películas: ${itemsError.message}`);
                }
            }

            toast.success("Baraja guardada correctamente");
            await fetchDecks(); // Recargar UI desde servidor
            return true;

        } catch (error: any) {
            console.error('SAVE ERROR:', error);
            
            // Rollback manual del estado local si es necesario
            if (wasNewDeck && previousDecks) {
                setDecks(previousDecks);
            }

            // Mensaje de error más específico
            const errorMessage = error.message || 'Error desconocido al guardar';
            toast.error(`Error guardando: ${errorMessage}`);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    // 3. DELETE DECK
    const deleteDeck = async (deckId: string) => {
        if (!user) {
            toast.error("No has iniciado sesión.");
            return;
        }

        try {
            // Primero eliminar los items relacionados (cascada manual)
            const { error: itemsError } = await supabase
                .from('deck_items')
                .delete()
                .eq('deck_id', deckId);

            if (itemsError) {
                console.warn('Error eliminando items de la baraja (continuando):', itemsError);
                // Continuamos aunque falle, puede que no haya items
            }

            // Luego eliminar la baraja
            const { error: deckError } = await supabase
                .from('decks')
                .delete()
                .eq('id', deckId)
                .eq('user_id', user.id); // Seguridad: solo eliminar si es del usuario

            if (deckError) {
                throw new Error(`Error eliminando baraja: ${deckError.message}`);
            }

            // Actualizar estado local inmediatamente
            setDecks(prev => prev.filter(d => d.id !== deckId));

            // Recargar desde servidor para asegurar persistencia
            await fetchDecks();

            toast.success("Baraja eliminada correctamente");
        } catch (error: any) {
            console.error("Error deleting deck:", error);
            toast.error(`Error eliminando baraja: ${error.message || 'Error desconocido'}`);
        }
    };

    return (
        <DeckContext.Provider value={{ decks, isLoading, error, activeDeck, setActiveDeck, fetchDecks, saveDeck, deleteDeck }}>
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