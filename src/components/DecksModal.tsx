import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useDecks } from '@/context/DeckContext';
import { Movie, Deck } from '@/lib/data';
import { searchContent, TMDBItem } from '@/services/tmdb';

interface DecksModalProps {
    onClose: () => void;
}

import DeckPreviewModal from './DeckPreviewModal';
import DeckTagInput from './DeckTagInput';
import CloseButton from './ui/CloseButton';

export default function DecksModal({ onClose }: DecksModalProps) {
    const { t } = useLanguage();
    const { decks: myDecks, saveDeck, setActiveDeck, deleteDeck } = useDecks();

    // Decks de amigos y populares (funcionalidad futura)
    const friendDecks: Deck[] = [];
    const popularDecks: Deck[] = [];

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

    // Tabs
    const [activeTab, setActiveTab] = useState<'my' | 'friends' | 'popular'>('my'); // Default to 'my' since others are empty

    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false); // Add loading state
    const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
    const [newDeckTitle, setNewDeckTitle] = useState('');
    const [newDeckDesc, setNewDeckDesc] = useState('');
    const [newDeckTags, setNewDeckTags] = useState<string[]>([]);

    // Search & Selection State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState<'movie' | 'tv'>('movie');
    const [searchResults, setSearchResults] = useState<TMDBItem[]>([]);
    const [selectedMovies, setSelectedMovies] = useState<Movie[]>([]);
    const [isSearching, setIsSearching] = useState(false);

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
            if (!cleanTitle) {
                alert('El título de la baraja es requerido');
            }
            return;
        }

        setIsSaving(true);
        try {
            const success = await saveDeck({
                id: editingDeckId || undefined,
                title: cleanTitle,
                description: newDeckDesc,
                tags: newDeckTags,
                items: selectedMovies
            });

            if (success) {
                setIsCreating(false);
                setEditingDeckId(null);
                setNewDeckTitle('');
                setNewDeckDesc('');
                setNewDeckTags([]);
                setSelectedMovies([]);
                setSearchResults([]);
                setSearchQuery('');

                // Cambiamos a la pestaña 'my' para ver la nueva baraja
                setActiveTab('my');
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
        setNewDeckTags([]); // Tags not supported in new context yet
        setSelectedMovies(deck.movies || []); // Use hydrated movies
        setIsCreating(true);
    };

    const handlePlay = (deck: Deck) => {
        setActiveDeck(deck);
        setPreviewDeck(null); // Close preview if open
        onClose();
    };

    const renderDeckList = (decks: Deck[], emptyMessage?: string) => {
        if (decks.length === 0) {
            return <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>{emptyMessage || t.noDecks}</div>;
        }
        return (
            <div style={{ display: 'grid', gap: '15px' }}>
                {decks.map(deck => (
                    <div
                        key={deck.id}
                        className="animate-fade-in"
                        onClick={() => setPreviewDeck(deck)}
                        style={{
                            background: '#252525',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            display: 'flex',
                            height: '120px', // Fixed height for consistency
                            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                            transition: 'transform 0.2s',
                            border: '1px solid #333',
                            cursor: 'pointer',
                            position: 'relative'
                        }}
                    >
                        {/* LEFT: Dynamic Collage (Spotify Style) */}
                        <div style={{ width: '120px', height: '120px', flexShrink: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
                            {deck.movies?.slice(0, 4).map((movie, i) => (
                                <img
                                    key={i}
                                    src={movie.image}
                                    style={{
                                        width: '100%', height: '100%', objectFit: 'cover',
                                        gridColumn: (deck.movies?.length || 0) < 4 ? '1 / span 2' : 'auto', // Fallback if <4
                                        gridRow: (deck.movies?.length || 0) < 4 ? '1 / span 2' : 'auto'
                                    }}
                                />
                            ))}
                            {(deck.movies?.length || 0) === 0 && (
                                <div style={{ width: '100%', height: '100%', background: '#333', gridColumn: 'span 2', gridRow: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                                    🎴
                                </div>
                            )}
                        </div>

                        {/* CENTER: Metadata */}
                        <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            {/* Tags */}
                            {deck.tags && deck.tags.length > 0 && (
                                <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                    {deck.tags.slice(0, 3).map(tag => (
                                        <span key={tag} style={{
                                            background: 'rgba(75, 255, 179, 0.15)',
                                            color: 'var(--accent-green)',
                                            padding: '2px 6px',
                                            borderRadius: '8px',
                                            fontSize: '0.65rem',
                                            fontWeight: 'bold'
                                        }}>
                                            {tag}
                                        </span>
                                    ))}
                                    {deck.tags.length > 3 && (
                                        <span style={{
                                            color: '#888',
                                            fontSize: '0.65rem'
                                        }}>
                                            +{deck.tags.length - 3}
                                        </span>
                                    )}
                                </div>
                            )}

                            <h3 style={{ margin: '0 0 5px 0', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deck.title}</h3>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                {/* Avatar placeholder */}
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#666', flexShrink: 0 }} />

                                <div style={{ fontSize: '0.75rem', color: '#888', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.2' }}>
                                    {deck.description && <span>{deck.description}</span>}
                                    {!deck.description && <span style={{ fontStyle: 'italic', color: '#555' }}>Sin descripción</span>}
                                </div>
                            </div>
                        </div>

                        {/* Edit Button (Only for my decks) */}
                        {activeTab === 'my' && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleEdit(deck); }}
                                style={{
                                    position: 'absolute',
                                    top: '5px', right: '5px',
                                    background: 'rgba(0,0,0,0.5)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '24px', height: '24px',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1rem',
                                    lineHeight: 1,
                                    zIndex: 10
                                }}
                            >
                                ⋮
                            </button>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px', padding: '25px 10px 10px 10px', borderLeft: '1px solid #333' }}>
                            {/* Play Button */}
                            <button
                                onClick={(e) => { e.stopPropagation(); handlePlay(deck); }}
                                style={{
                                    background: 'var(--accent-green)',
                                    color: 'black',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '6px 10px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    display: 'flex', alignItems: 'center', gap: '5px'
                                }}
                            >
                                🃏 {t.playGame}
                            </button>

                            {/* Share Button (Mock) */}
                            <button
                                onClick={(e) => { e.stopPropagation(); alert(t.linkCopied); }}
                                style={{
                                    background: 'transparent',
                                    color: '#888',
                                    border: '1px solid #555',
                                    borderRadius: '8px',
                                    padding: '5px',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem'
                                }}
                            >
                                🔗 {t.share}
                            </button>
                        </div>
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
            <div className="animate-pop-in" style={{
                background: 'var(--bg-darker)',
                padding: '30px',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '600px',
                border: '1px solid #333',
                position: 'relative',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <CloseButton onClose={onClose} />

                {!isCreating ? (
                    <>
                        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>{t.decks} 🎴</h2>

                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <button
                                onClick={() => setActiveTab('popular')}
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', background: activeTab === 'popular' ? 'var(--accent-green)' : '#333', color: activeTab === 'popular' ? 'black' : '#888', border: 'none', cursor: 'pointer', fontWeight: 'bold', pointerEvents: 'none', opacity: 0.5 }}
                            >
                                {t.popularDecks} (Soon)
                            </button>
                            <button
                                onClick={() => setActiveTab('my')}
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', background: activeTab === 'my' ? 'var(--accent-green)' : '#333', color: activeTab === 'my' ? 'black' : '#888', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                {t.myDecks}
                            </button>
                            <button
                                onClick={() => setActiveTab('friends')}
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', background: activeTab === 'friends' ? 'var(--accent-green)' : '#333', color: activeTab === 'friends' ? 'black' : '#888', border: 'none', cursor: 'pointer', fontWeight: 'bold', pointerEvents: 'none', opacity: 0.5 }}
                            >
                                {t.friendsDecks} (Soon)
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {activeTab === 'my' && (
                                <button
                                    onClick={() => setIsCreating(true)}
                                    style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '2px dashed #444', background: 'none', color: 'var(--accent-green)', marginBottom: '20px', cursor: 'pointer' }}
                                >
                                    + {t.createDeck}
                                </button>
                            )}

                            {activeTab === 'popular' && renderDeckList(popularDecks)}
                            {activeTab === 'my' && renderDeckList(myDecks)}
                            {activeTab === 'friends' && renderDeckList(friendDecks, t.noFriendsDecks)}
                        </div>
                    </>
                ) : (
                    <>
                        <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>{t.createDeck}</h2>

                        <div style={{ overflowY: 'auto', paddingRight: '10px' }}>
                            {/* Metadata */}
                            <div style={{ marginBottom: '20px' }}>
                                <input
                                    type="text"
                                    value={newDeckTitle}
                                    onChange={(e) => setNewDeckTitle(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#333', border: 'none', color: 'white', fontSize: '1rem', marginBottom: '10px' }}
                                    placeholder={t.deckTitle}
                                />
                                <input
                                    type="text"
                                    value={newDeckDesc}
                                    onChange={(e) => setNewDeckDesc(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#333', border: 'none', color: 'white', fontSize: '0.9rem', marginBottom: '10px' }}
                                    placeholder={t.deckDesc}
                                />

                                <DeckTagInput tags={newDeckTags} onTagsChange={setNewDeckTags} />
                            </div>

                            {/* Search Section */}
                            <div style={{ marginBottom: '20px', borderTop: '1px solid #333', paddingTop: '20px' }}>
                                {/* ... Search inputs kept same but removed unnecessary JSX bloat for brevity in implementation ... */}
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                    <select
                                        value={searchType}
                                        onChange={(e) => setSearchType(e.target.value as 'movie' | 'tv')}
                                        style={{ padding: '10px', borderRadius: '8px', background: '#333', color: 'white', border: 'none' }}
                                    >
                                        <option value="movie">{t.movies}</option>
                                        <option value="tv">{t.tvShows}</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#333', border: 'none', color: 'white' }}
                                        placeholder={t.searchAdd}
                                    />
                                    <button
                                        onClick={handleSearch}
                                        style={{ background: 'var(--accent-green)', border: 'none', borderRadius: '8px', padding: '0 15px', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        Search
                                    </button>
                                </div>

                                {/* Results */}
                                {isSearching ? <div style={{ textAlign: 'center', color: '#666' }}>Searching...</div> : (
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
                                                        border: isSelected ? '2px solid var(--accent-green)' : 'none',
                                                        borderRadius: '8px',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    <img
                                                        src={item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image'}
                                                        alt={item.title || item.name}
                                                        style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover' }}
                                                    />
                                                    {isSelected && <div style={{ position: 'absolute', inset: 0, background: 'rgba(75, 255, 179, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>✓</div>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Selected Count */}
                            <div style={{ marginBottom: '20px', padding: '10px', background: '#252525', borderRadius: '8px' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#888' }}>{t.selectedItems} ({selectedMovies.length})</h4>
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
                                    {selectedMovies.length === 0 && <span style={{ color: '#444', fontStyle: 'italic', fontSize: '0.8rem' }}>No items selected yet.</span>}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                            <button onClick={() => setIsCreating(false)} style={{ flex: 1, padding: '15px', borderRadius: '12px', background: '#333', color: 'white', border: 'none', cursor: 'pointer' }}>{t.cancel}</button>
                            <button
                                onClick={handleCreate}
                                disabled={!newDeckTitle || selectedMovies.length === 0 || isSaving}
                                style={{
                                    flex: 1,
                                    padding: '15px',
                                    borderRadius: '12px',
                                    background: (!newDeckTitle || selectedMovies.length === 0) ? '#444' : 'var(--accent-green)',
                                    color: (!newDeckTitle || selectedMovies.length === 0) ? '#888' : 'black',
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
                                {isSaving ? 'Saving...' : (editingDeckId ? t.save : t.createDeck)} ({selectedMovies.length})
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
                                    color: 'var(--accent-red)',
                                    border: '1px solid var(--accent-red)',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                }}
                            >
                                🗑️ {t.deleteDeck}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
