import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useDecks } from '@/context/DeckContext';
import { useAuth } from '@/context/AuthProvider';
import { Movie, Deck } from '@/lib/data';
import { searchContent, TMDBItem } from '@/services/tmdb';
import DeckPreviewModal from './DeckPreviewModal';
import DeckTagInput from './DeckTagInput';
import CloseButton from './ui/CloseButton';
import { Layers, Check, Trash2, Play } from 'lucide-react';
import { getTagIcon, getTagLabel } from '@/lib/constants';

interface DecksModalProps {
    onClose: () => void;
}

export default function DecksModal({ onClose }: DecksModalProps) {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { decks: myDecks, saveDeck, setActiveDeck, deleteDeck, fetchFriendDecks, fetchPopularDecks, incrementDeckViews, fetchDecks } = useDecks();

    // Acento del modo Barajas (morado) + variantes para fondos/brillos
    const DECKS_ACCENT = 'var(--accent-mid)'; // #c84cff
    const DECKS_ACCENT_TEXT_ON = '#0a0a0a';
    const DECKS_ACCENT_GLOW = 'rgba(200, 76, 255, 0.35)';
    const DECKS_ACCENT_SOFT_BG = 'rgba(200, 76, 255, 0.14)';
    const DECKS_ACCENT_SOFT_BG_2 = 'rgba(200, 76, 255, 0.22)';

    // Función para eliminar emojis de un texto
    const removeEmojis = (text: string): string => {
        // Regex para eliminar emojis (incluye variaciones de emojis, símbolos, pictogramas, etc.)
        return text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '').trim();
    };

    // Decks de amigos y populares
    const [friendDecks, setFriendDecks] = useState<Deck[]>([]);
    const [popularDecks, setPopularDecks] = useState<Deck[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [loadingPopular, setLoadingPopular] = useState(false);
    const [loadedTabs, setLoadedTabs] = useState<Set<'friends' | 'popular'>>(new Set());

    const handleDelete = async () => {
        if (!editingDeckId) return;
        if (confirm(t.deleteConfirm)) {
            await deleteDeck(editingDeckId);
            setEditingDeckId(null);
            setIsCreating(false);
            // Reset form
            setNewDeckTitle('');
            setNewDeckDesc('');
            setNewDeckTags([]);
            setSelectedMovies([]);
            setSearchQuery('');
        }
    };

    // Preview State
    const [previewDeck, setPreviewDeck] = useState<Deck | null>(null);
    const [pendingPreviewDeckId, setPendingPreviewDeckId] = useState<string | null>(null);

    // Tabs
    // Sin barajas propias (p. ej. un invitado) se abre en Populares para no mostrar una lista vacía
    const [activeTab, setActiveTab] = useState<'my' | 'friends' | 'popular'>(() => (myDecks.length > 0 ? 'my' : 'popular'));

    // Cargar decks de amigos y populares cuando se cambia de pestaña
    useEffect(() => {
        if (activeTab === 'friends' && !loadedTabs.has('friends') && !loadingFriends) {
            setLoadingFriends(true);
            fetchFriendDecks().then(decks => {
                setFriendDecks(decks);
                setLoadingFriends(false);
                setLoadedTabs(prev => new Set(prev).add('friends'));
            }).catch((err) => {
                console.error('Error loading friend decks:', err);
                setLoadingFriends(false);
                setLoadedTabs(prev => new Set(prev).add('friends')); // Marcar como cargado incluso si falla
            });
        }
        if (activeTab === 'popular' && !loadedTabs.has('popular') && !loadingPopular) {
            setLoadingPopular(true);
            fetchPopularDecks().then(decks => {
                setPopularDecks(decks);
                setLoadingPopular(false);
                setLoadedTabs(prev => new Set(prev).add('popular'));
            }).catch((err) => {
                console.error('Error loading popular decks:', err);
                setLoadingPopular(false);
                setLoadedTabs(prev => new Set(prev).add('popular')); // Marcar como cargado incluso si falla
            });
        }
    }, [activeTab, loadedTabs, loadingFriends, loadingPopular]);

    // Efecto para abrir el preview de la baraja editada después de guardar
    useEffect(() => {
        if (pendingPreviewDeckId && myDecks.length > 0) {
            const savedDeck = myDecks.find(d => d.id === pendingPreviewDeckId);
            if (savedDeck) {
                setPreviewDeck(savedDeck);
                setPendingPreviewDeckId(null);
            }
        }
    }, [pendingPreviewDeckId, myDecks]);

    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false); // Add loading state
    const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
    const [newDeckTitle, setNewDeckTitle] = useState('');
    const [newDeckDesc, setNewDeckDesc] = useState('');
    const [newDeckTags, setNewDeckTags] = useState<string[]>([]);
    const [newDeckPrivacy, setNewDeckPrivacy] = useState<'private' | 'friends' | 'public'>('private');

    // Search & Selection State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState<'movie' | 'tv'>('movie');
    const [searchButtonBelow, setSearchButtonBelow] = useState(false);
    const searchSectionRef = useRef<HTMLDivElement>(null);
    const [searchResults, setSearchResults] = useState<TMDBItem[]>([]);
    const [selectedMovies, setSelectedMovies] = useState<Movie[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Detectar si el input de búsqueda no tiene espacio: botón pasa a la fila inferior
    useEffect(() => {
        const el = searchSectionRef.current;
        if (!el || !isCreating) return;
        const MIN_WIDTH_FOR_INLINE = 420; // select ~110 + input 180 + button ~90 + gaps 40
        const check = () => {
            const w = el.offsetWidth;
            setSearchButtonBelow(w < MIN_WIDTH_FOR_INLINE);
        };
        check();
        const ro = new ResizeObserver(check);
        ro.observe(el);
        return () => ro.disconnect();
    }, [isCreating]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        const results = await searchContent(searchQuery, searchType);
        setSearchResults(results || []);
        setIsSearching(false);
    };

    const toggleSelection = (item: TMDBItem) => {
        // Convert TMDBItem to Movie
        const movieId = item.id.toString();
        const exists = selectedMovies.find(m => m.id === movieId);

        if (exists) {
            // Remove
            setSelectedMovies(prev => prev.filter(m => m.id !== movieId));
        } else {
            // Add (Convert to internal Movie format)
            const newMovie: Movie = {
                id: movieId,
                type: searchType, // 'movie' | 'tv'
                title: item.title || item.name || 'Unknown',
                title_es: item.title || item.name,
                year: new Date(item.release_date || item.first_air_date || Date.now()).getFullYear(),
                rating: item.vote_average,
                image: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : '',
                synopsis: item.overview,
                synopsis_es: item.overview,
                genres: [] // Not crucial for deck play
            };
            setSelectedMovies(prev => [...prev, newMovie]);
        }
    };

    const handleCreate = async () => {
        // Validación básica - asegurar que el título esté limpio y no vacío
        const cleanTitle = (newDeckTitle || '').trim();
        if (!cleanTitle || selectedMovies.length === 0) {
            return;
        }

        setIsSaving(true);
        try {
            const deckIdBeingEdited = editingDeckId; // Guardar el ID antes de limpiarlo
            const success = await saveDeck({
                id: editingDeckId || undefined,
                title: cleanTitle,
                description: newDeckDesc,
                tags: newDeckTags,
                items: selectedMovies,
                privacy: newDeckPrivacy
            });

            if (success) {
                setIsCreating(false);
                setNewDeckTitle('');
                setNewDeckDesc('');
                setNewDeckTags([]);
                setNewDeckPrivacy('private');
                setSelectedMovies([]);
                setSearchResults([]);
                setSearchQuery('');

                // Cambiamos a la pestaña 'my' para ver la nueva baraja
                setActiveTab('my');
                
                // Si se estaba editando una baraja existente, abrir su preview después de recargar
                if (deckIdBeingEdited) {
                    setPendingPreviewDeckId(deckIdBeingEdited);
                    // Recargar los decks para obtener la versión actualizada
                    await fetchDecks();
                }
                
                setEditingDeckId(null);
            }
        } catch (error) {
            console.error('HandleCreate Error:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (deck: Deck) => {
        setEditingDeckId(deck.id);
        setNewDeckTitle(deck.title);
        setNewDeckDesc(deck.description || '');
        setNewDeckTags(deck.tags || []); // Load tags if available
        setNewDeckPrivacy(deck.privacy || 'private');
        setSelectedMovies(deck.movies || []); // Use hydrated movies
        setIsCreating(true);
    };

    const handlePlay = async (deck: Deck) => {
        try {
            // Validar que el deck tenga películas
            if (!deck.movies || deck.movies.length === 0) {
                return;
            }

            // Incrementar vistas si es un deck público que no es del usuario actual
            if (deck.privacy === 'public' && user && deck.creatorId !== user.id) {
                try {
                    await incrementDeckViews(deck.id);
                } catch (error) {
                    // No bloquear si falla el incremento de vistas
                    console.warn('Error incrementando vistas:', error);
                }
            }

            // Validar que el deck tenga al menos una película válida
            const validMovies = deck.movies.filter(m => m.id && m.title);
            if (validMovies.length === 0) {
                return;
            }

            // Crear una copia del deck con solo películas válidas para evitar errores
            const validDeck: Deck = {
                ...deck,
                movies: validMovies
            };

            setActiveDeck(validDeck);
            setPreviewDeck(null); // Close preview if open
            onClose();
        } catch (error) {
            console.error('Error al iniciar el deck:', error);
        }
    };

    /** Botón Jugar: siempre visible completo (icono + texto) */
    function DeckPlayButton({ onClick, label }: { onClick: (e: React.MouseEvent) => void; label: string }) {
        return (
            <button
                onClick={onClick}
                style={{
                    background: DECKS_ACCENT,
                    color: DECKS_ACCENT_TEXT_ON,
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: 'clamp(0.6rem, 1.6vw, 0.8rem)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 1,
                    minWidth: '80px',
                    whiteSpace: 'nowrap',
                    justifyContent: 'center'
                }}
            >
                <Play size={12} aria-hidden style={{ flexShrink: 0 }} />
                <span>{label}</span>
            </button>
        );
    }

    const renderDeckList = (decks: Deck[], emptyMessage?: string) => {
        if (decks.length === 0) {
            return (
                <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                    <Layers size={32} className="mx-auto mb-2.5 text-[var(--muted-foreground)]" aria-hidden />
                    <p style={{ marginBottom: '5px', fontWeight: 600 }}>
                        {emptyMessage || t.noDecks}
                    </p>
                    {!emptyMessage && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                            {t.createFirstDeck}
                        </p>
                    )}
                </div>
            );
        }
        return (
            <div style={{ display: 'grid', gap: '15px' }}>
                {decks.map(deck => (
                    <div
                        key={deck.id}
                        className="animate-fade-in"
                        onClick={() => setPreviewDeck(deck)}
                        style={{
                            background: 'var(--card)',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            display: 'flex',
                            height: '120px', // Fixed height for consistency
                            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                            transition: 'transform 0.2s',
                            border: '1px solid var(--border)',
                            cursor: 'pointer',
                            position: 'relative',
                            minWidth: 0,
                            padding: '12px',
                            gap: '12px'
                        }}
                    >
                        {/* Contenedor izquierdo: solo imágenes (collage 2x2) */}
                        <div
                            aria-label="Portada de la baraja"
                            style={{
                                flexShrink: 0,
                                width: '96px',
                                minWidth: '96px',
                                height: '96px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gridTemplateRows: '1fr 1fr',
                                backgroundColor: 'var(--background)'
                            }}
                        >
                            {deck.movies?.slice(0, 4).map((movie, i) => (
                                <img
                                    key={i}
                                    src={movie.image}
                                    alt={movie.title}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        gridColumn: (deck.movies?.length || 0) < 4 ? '1 / span 2' : 'auto',
                                        gridRow: (deck.movies?.length || 0) < 4 ? '1 / span 2' : 'auto'
                                    }}
                                />
                            ))}
                            {(deck.movies?.length || 0) === 0 && (
                                <div style={{ width: '100%', height: '100%', background: 'var(--background)', gridColumn: 'span 2', gridRow: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Layers size={32} className="text-[var(--muted-foreground)]" aria-hidden />
                                </div>
                            )}
                        </div>

                        {/* CENTER: Título (prioridad alta), etiquetas (prioridad baja), botones (siempre visibles) */}
                        <div style={{ 
                            flex: 1, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            minWidth: 0,
                            gap: '6px',
                            overflow: 'hidden'
                        }}>
                            {/* Título - siempre visible, un poco más grande */}
                            <h3 style={{ 
                                margin: 0, 
                                fontSize: 'clamp(1rem, 2.4vw, 1.1rem)', 
                                whiteSpace: 'nowrap', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                color: 'var(--foreground)',
                                minWidth: 0,
                                flexShrink: 0,
                                fontWeight: '600',
                                lineHeight: '1.2'
                            }}>{deck.title}</h3>

                            {/* Tags - prioridad baja: se ocultan/recortan si falta espacio para botones */}
                            {deck.tags && deck.tags.length > 0 && (
                                <div style={{ 
                                    display: 'flex', 
                                    gap: '4px', 
                                    flexWrap: 'wrap', 
                                    alignItems: 'center',
                                    flex: '1 1 0',
                                    minHeight: 0,
                                    overflow: 'hidden',
                                    alignContent: 'flex-start'
                                }}>
                                    {deck.tags.slice(0, 3).map(tag => {
                                        const Icon = getTagIcon(tag);
                                        const label = getTagLabel(tag);
                                        return (
                                        <span key={tag} style={{
                                            background: DECKS_ACCENT_SOFT_BG,
                                            color: DECKS_ACCENT,
                                            padding: '2px 6px',
                                            borderRadius: '8px',
                                            fontSize: '0.65rem',
                                            fontWeight: 'bold',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: '120px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <Icon size={12} style={{ flexShrink: 0 }} aria-hidden />
                                            {label}
                                        </span>
                                    );})}
                                    {deck.tags.length > 3 && (
                                        <span style={{
                                            color: 'var(--muted-foreground)',
                                            fontSize: '0.65rem',
                                            flexShrink: 0
                                        }}>
                                            +{deck.tags.length - 3}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Botones - siempre visibles, nunca se ocultan */}
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', flexShrink: 0 }}>
                                {/* Play Button: solo icono si el texto no cabe */}
                                <DeckPlayButton
                                    label={t.playGame}
                                    onClick={(e) => { e.stopPropagation(); handlePlay(deck); }}
                                />
                            </div>
                        </div>

                        {/* RIGHT: Descripción - Se oculta en móvil cuando falta espacio */}
                        {deck.description && (
                            <div 
                                className="deck-description"
                                style={{
                                    flexShrink: 0,
                                    width: '125px',
                                    minWidth: '125px',
                                    maxWidth: '125px',
                                    fontSize: '0.75rem',
                                    color: 'var(--muted-foreground)',
                                    lineHeight: '1.3',
                                    overflow: 'hidden',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    textAlign: 'left',
                                    alignSelf: 'stretch',
                                    paddingLeft: '8px',
                                    borderLeft: '1px solid rgba(255, 255, 255, 0.12)'
                                }}
                            >
                                {deck.description}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    if (previewDeck) {
        return (
            <DeckPreviewModal
                deck={previewDeck}
                onClose={() => setPreviewDeck(null)}
                onPlay={() => handlePlay(previewDeck)}
                onEdit={handleEdit}
                currentUserId={user?.id}
            />
        );
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <div className="animate-pop-in modal-surface" style={{
                width: '100%',
                maxWidth: '600px',
                position: 'relative'
            }}>
                <CloseButton onClose={onClose} />

                {!isCreating ? (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
                            <div
                                style={{
                                    borderRadius: '999px',
                                    border: `2px solid ${DECKS_ACCENT}`,
                                    padding: '8px 16px',
                                    boxShadow: `0 0 18px ${DECKS_ACCENT_GLOW}`,
                                }}
                            >
                                <h2 className="heading-lg" style={{ textAlign: 'center', margin: 0 }}>
                                    {t.decks}{' '}
                                    <Layers
                                        size={24}
                                        className="inline-block ml-1 -mt-0.5"
                                        style={{ color: DECKS_ACCENT }}
                                        aria-hidden
                                    />
                                </h2>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', minWidth: 0 }}>
                            <button
                                onClick={() => setActiveTab('popular')}
                                style={{
                                    flex: 1,
                                    padding: '8px 6px',
                                    borderRadius: '8px',
                                    border: `1px solid ${DECKS_ACCENT}`,
                                    background: activeTab === 'popular' ? DECKS_ACCENT : 'var(--card)',
                                    color: activeTab === 'popular' ? DECKS_ACCENT_TEXT_ON : 'white',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    minWidth: 0,
                                    whiteSpace: 'nowrap',
                                    fontSize: 'clamp(0.7rem, 1.8vw, 0.85rem)',
                                    lineHeight: '1.2'
                                }}
                            >
                                {t.popularDecks}
                            </button>
                            <button
                                onClick={() => setActiveTab('my')}
                                style={{
                                    flex: 1,
                                    padding: '8px 6px',
                                    borderRadius: '8px',
                                    border: `1px solid ${DECKS_ACCENT}`,
                                    background: activeTab === 'my' ? DECKS_ACCENT : 'var(--card)',
                                    color: activeTab === 'my' ? DECKS_ACCENT_TEXT_ON : 'white',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    minWidth: 0,
                                    whiteSpace: 'nowrap',
                                    fontSize: 'clamp(0.7rem, 1.8vw, 0.85rem)',
                                    lineHeight: '1.2'
                                }}
                            >
                                {t.myDecks}
                            </button>
                            <button
                                onClick={() => setActiveTab('friends')}
                                style={{
                                    flex: 1,
                                    padding: '8px 6px',
                                    borderRadius: '8px',
                                    border: `1px solid ${DECKS_ACCENT}`,
                                    background: activeTab === 'friends' ? DECKS_ACCENT : 'var(--card)',
                                    color: activeTab === 'friends' ? DECKS_ACCENT_TEXT_ON : 'white',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    minWidth: 0,
                                    whiteSpace: 'nowrap',
                                    fontSize: 'clamp(0.7rem, 1.8vw, 0.85rem)',
                                    lineHeight: '1.2'
                                }}
                            >
                                {t.friendsDecks}
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', scrollbarGutter: 'stable' }}>
                            {activeTab === 'my' && (
                                <button
                                    onClick={() => setIsCreating(true)}
                                    style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '2px dashed var(--border)', background: 'none', color: DECKS_ACCENT, marginBottom: '20px', cursor: 'pointer' }}
                                >
                                    + {t.createDeck}
                                </button>
                            )}

                            {activeTab === 'popular' && (
                                loadingPopular ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted-foreground)' }}>{t.loadingPopularDecks}</div>
                                ) : (
                                    renderDeckList(popularDecks, popularDecks.length === 0 ? 'Aún no hay decks públicos populares.' : undefined)
                                )
                            )}
                            {activeTab === 'my' && renderDeckList(myDecks)}
                            {activeTab === 'friends' && (
                                loadingFriends ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted-foreground)' }}>Cargando decks de amigos...</div>
                                ) : (
                                    renderDeckList(friendDecks, t.noFriendsDecks)
                                )
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <h2 className="heading-lg" style={{ textAlign: 'center', marginBottom: '10px' }}>{t.createDeck}</h2>

                        <div style={{ overflowY: 'auto', paddingRight: '10px' }}>
                            {/* Metadata */}
                            <div
                                style={{
                                    marginBottom: '20px',
                                    position: 'relative',
                                    zIndex: 10,
                                    pointerEvents: 'auto'
                                }}
                            >
                                <input
                                    type="text"
                                    value={newDeckTitle}
                                    onChange={(e) => setNewDeckTitle(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '1rem', marginBottom: '10px' }}
                                    placeholder={t.deckTitle}
                                />
                                <input
                                    type="text"
                                    value={newDeckDesc}
                                    onChange={(e) => setNewDeckDesc(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        background: 'var(--background)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--foreground)',
                                        fontSize: '0.9rem',
                                        marginBottom: '10px',
                                        position: 'relative',
                                        zIndex: 20,
                                        pointerEvents: 'auto'
                                    }}
                                    placeholder={t.deckDesc}
                                />

                                <DeckTagInput tags={newDeckTags} onTagsChange={setNewDeckTags} />

                                {/* Privacy Selector */}
                                <div style={{ marginTop: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#888' }}>
                                        {t.privacyLevel}
                                    </label>
                                    <select
                                        value={newDeckPrivacy}
                                        onChange={(e) => setNewDeckPrivacy(e.target.value as 'private' | 'friends' | 'public')}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '8px',
                                            background: 'var(--card)',
                                            border: `1px solid ${DECKS_ACCENT}`,
                                            color: 'white',
                                            fontSize: '0.9rem',
                                            cursor: 'pointer',
                                            outline: 'none',
                                            boxShadow: 'none'
                                        }}
                                    >
                                        <option value="private">{t.privacyPrivate}</option>
                                        <option value="friends">{t.privacyFriends}</option>
                                        <option value="public">{t.privacyPublic}</option>
                                    </select>
                                    <p style={{ marginTop: '5px', fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>
                                        {t.privacyDescription}
                                    </p>
                                </div>
                            </div>

                            {/* Search Section */}
                            <div ref={searchSectionRef} style={{ marginBottom: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px', width: '100%', minWidth: 0 }}>
                                    <div style={{ display: 'flex', gap: '10px', width: '100%', minWidth: 0, overflow: 'hidden' }}>
                                        <select
                                            value={searchType}
                                            onChange={(e) => setSearchType(e.target.value as 'movie' | 'tv')}
                                            style={{
                                                padding: '10px',
                                                borderRadius: '8px',
                                                border: `1px solid ${DECKS_ACCENT}`,
                                                background: 'var(--card)',
                                                color: 'white',
                                                flexShrink: 0
                                            }}
                                        >
                                            <option value="movie">{t.movies}</option>
                                            <option value="tv">{t.tvShows}</option>
                                        </select>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                            style={{
                                                flex: 1,
                                                minWidth: 0,
                                                padding: '10px',
                                                borderRadius: '8px',
                                                background: 'var(--background)',
                                                border: '1px solid var(--border)',
                                                color: 'var(--foreground)',
                                                fontSize: '0.9rem',
                                                overflow: 'hidden'
                                            }}
                                            placeholder={t.searchAdd}
                                        />
                                        {!searchButtonBelow && (
                                            <button
                                                onClick={handleSearch}
                                                style={{ background: DECKS_ACCENT, color: DECKS_ACCENT_TEXT_ON, border: 'none', borderRadius: '8px', padding: '0 15px', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0 }}
                                            >
                                                {t.searchAdd.split(' ')[0]}
                                            </button>
                                        )}
                                    </div>
                                    {searchButtonBelow && (
                                        <button
                                            onClick={handleSearch}
                                            style={{ background: DECKS_ACCENT, color: DECKS_ACCENT_TEXT_ON, border: 'none', borderRadius: '8px', padding: '10px 15px', fontWeight: 'bold', cursor: 'pointer', alignSelf: 'flex-start' }}
                                        >
                                            {t.searchAdd.split(' ')[0]}
                                        </button>
                                    )}
                                </div>

                                {/* Results */}
                                {isSearching ? <div style={{ textAlign: 'center', color: 'var(--muted-foreground)' }}>Searching...</div> : (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                                        gap: '10px',
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        marginBottom: '20px'
                                    }}>
                                        {searchResults.map(item => {
                                            const isSelected = selectedMovies.some(m => m.id === item.id.toString());
                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => toggleSelection(item)}
                                                    style={{
                                                        position: 'relative',
                                                        cursor: 'pointer',
                                                        opacity: isSelected ? 0.5 : 1,
                                                        border: isSelected ? `2px solid ${DECKS_ACCENT}` : 'none',
                                                        borderRadius: '8px',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    <img
                                                        src={item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image'}
                                                        alt={item.title || item.name}
                                                        style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover' }}
                                                    />
                                                    {isSelected && <div style={{ position: 'absolute', inset: 0, background: DECKS_ACCENT_SOFT_BG_2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={32} style={{ color: DECKS_ACCENT }} strokeWidth={3} aria-hidden /></div>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Selected Count */}
                            <div style={{ marginBottom: '20px', padding: '10px', background: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>{t.selectedItems} ({selectedMovies.length})</h4>
                                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
                                    {selectedMovies.map(m => (
                                        <div key={m.id} style={{ flexShrink: 0, width: '50px', position: 'relative' }}>
                                            <img src={m.image} alt={m.title} style={{ width: '100%', borderRadius: '4px' }} />
                                            <button
                                                onClick={() => toggleSelection({ id: parseInt(m.id) } as any)}
                                                style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', borderRadius: '50%', width: '15px', height: '15px', border: 'none', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    {selectedMovies.length === 0 && <span style={{ color: 'var(--muted-foreground)', fontStyle: 'italic', fontSize: '0.8rem' }}>{t.noItemsSelected}</span>}
                                </div>
                            </div>

                            {/* Actions - dentro del área con scroll */}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button onClick={() => setIsCreating(false)} style={{ flex: 1, padding: '15px', borderRadius: '12px', background: '#333', color: 'white', border: 'none', cursor: 'pointer' }}>{t.cancel}</button>
                                <button
                                    onClick={handleCreate}
                                    disabled={!newDeckTitle || selectedMovies.length === 0 || isSaving}
                                    style={{
                                        flex: 1,
                                        padding: '15px',
                                        borderRadius: '12px',
                                        background: (!newDeckTitle || selectedMovies.length === 0) ? 'var(--background)' : DECKS_ACCENT,
                                        color: (!newDeckTitle || selectedMovies.length === 0) ? 'var(--muted-foreground)' : DECKS_ACCENT_TEXT_ON,
                                        border: 'none',
                                        cursor: (!newDeckTitle || selectedMovies.length === 0 || isSaving) ? 'not-allowed' : 'pointer',
                                        fontWeight: 'bold',
                                        transform: 'scale(1)',
                                        transition: 'transform 0.1s',
                                        opacity: isSaving ? 0.7 : 1
                                    }}
                                    onMouseDown={(e) => {
                                        if (!(!newDeckTitle || selectedMovies.length === 0 || isSaving)) {
                                            e.currentTarget.style.transform = 'scale(0.98)';
                                        }
                                    }}
                                    onMouseUp={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                >
                                    {isSaving ? 'Saving...' : (editingDeckId ? t.save : t.createDeck)}
                                </button>
                            </div>

                            {editingDeckId && (
                                <button
                                    onClick={handleDelete}
                                    style={{
                                        marginTop: '15px',
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        background: 'rgba(255, 75, 75, 0.1)',
                                        color: 'var(--destructive)',
                                        border: '1px solid var(--destructive)',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}
                                >
                                    <Trash2 size={18} className="inline-block mr-1 -mt-0.5" aria-hidden /> {t.deleteDeck}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
