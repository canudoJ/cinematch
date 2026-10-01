import React, { useState } from 'react';
import { Deck, Movie } from '@/lib/data';
import { useLanguage } from '@/context/LanguageContext';
import CloseButton from './ui/CloseButton';
import MovieDetailsModal from './MovieDetailsModal';
import { Star, Link2, Play } from 'lucide-react';
import { TAG_WARM_BG, getTagIcon, getTagLabel } from '@/lib/constants';

interface DeckPreviewModalProps {
    deck: Deck;
    onClose: () => void;
    onPlay: () => void;
    onEdit?: (deck: Deck) => void;
    currentUserId?: string;
}

export default function DeckPreviewModal({ deck, onClose, onPlay, onEdit, currentUserId }: DeckPreviewModalProps) {
    const { t } = useLanguage();
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const movies = deck.movies ?? [];
    const DECKS_ACCENT = 'var(--accent-mid)'; // #c84cff

    // Función para eliminar emojis de un texto
    const removeEmojis = (text: string): string => {
        // Regex para eliminar emojis (incluye variaciones de emojis, símbolos, pictogramas, etc.)
        return text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '').trim();
    };

    const handleShareDeck = async () => {
        // Solo permitir compartir barajas públicas o de amigos
        if (deck.privacy === 'private') {
            return;
        }

        const shareUrl = `${window.location.origin}/deck/${deck.id}`;
        try {
            await navigator.clipboard.writeText(shareUrl);
        } catch (err) {
            console.error('Error copying to clipboard:', err);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: '#000', // fondo negro sólido para todo el modo detalle
            zIndex: 1100, // Higher than DecksModal
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }} className="animate-pop-in">
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {/* Hero Section */}
                <div style={{ position: 'relative', height: '300px', display: 'flex', alignItems: 'flex-end' }}>
                    {/* Background Blur */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        backgroundImage: `url(${movies[0]?.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        // Imagen muy difuminada y oscura para que apenas destaque sobre el fondo negro
                        filter: 'blur(32px) brightness(0.18)',
                        zIndex: 0
                    }} />

                    {/* Content */}
                    <div
                        style={{
                            position: 'relative',
                            zIndex: 10,
                            padding: '20px 24px',
                            paddingTop: '56px',
                            width: '100%',
                            maxWidth: '800px',
                            margin: '0 auto',
                        }}
                    >
                        {/* Close Button - esquina superior izquierda del área de contenido */}
                        <div style={{ position: 'absolute', top: 20, left: 19, zIndex: 20 }}>
                            <CloseButton onClose={onClose} />
                        </div>

                        {/* Título */}
                        <h1 style={{ 
                            margin: 0, 
                            fontSize: '2.5rem', 
                            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                            borderBottom: '1.5px solid var(--primary)',
                            paddingBottom: '2px',
                            display: 'inline-block'
                        }}>
                            {deck.title}
                        </h1>

                        {/* Descripción - se extiende en líneas hacia abajo, ancho limitado al 75% del contenedor */}
                        {deck.description && (
                            <div style={{
                                maxWidth: '75%',
                                maxHeight: '120px',
                                marginTop: '10px',
                                fontSize: '0.95rem',
                                lineHeight: 1.4,
                                color: 'var(--muted-foreground)',
                                textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                                overflowWrap: 'break-word',
                                wordBreak: 'break-word',
                                overflowY: 'auto'
                            }}>
                                {deck.description}
                            </div>
                        )}

                        {/* Etiquetas */}
                        {deck.tags && deck.tags.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                {deck.tags.map(tag => {
                                    const Icon = getTagIcon(tag);
                                    const label = getTagLabel(tag);
                                    return (
                                    <span key={tag} style={{
                                        background: TAG_WARM_BG,
                                        color: 'white',
                                        padding: '4px 8px',
                                        borderRadius: '12px',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px'
                                    }}>
                                        <Icon size={14} style={{ flexShrink: 0 }} aria-hidden />
                                        {label}
                                    </span>
                                );})}
                            </div>
                        )}

                        {/* Fila inferior: autor (izquierda) y Nº de películas (derecha) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {/* Avatar del creador */}
                                {deck.creatorAvatar ? (
                                    <img
                                        src={deck.creatorAvatar}
                                        alt={deck.creatorName}
                                        style={{
                                            width: '30px',
                                            height: '30px',
                                            borderRadius: '50%',
                                            border: '2px solid white',
                                            objectFit: 'cover',
                                            background: 'var(--muted)'
                                        }}
                                        onError={(e) => {
                                            // Si la imagen falla, ocultarla y mostrar placeholder
                                            const target = e.currentTarget as HTMLImageElement;
                                            target.style.display = 'none';
                                            const placeholder = target.nextElementSibling as HTMLElement;
                                            if (placeholder) {
                                                placeholder.style.display = 'flex';
                                            }
                                        }}
                                    />
                                ) : null}
                                <div
                                    style={{
                                        width: '30px',
                                        height: '30px',
                                        borderRadius: '50%',
                                        border: '2px solid white',
                                        background: 'var(--muted)',
                                        display: deck.creatorAvatar ? 'none' : 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontSize: '0.9rem',
                                        fontWeight: 'bold',
                                        flexShrink: 0
                                    }}
                                >
                                    {deck.creatorName ? deck.creatorName.charAt(0).toUpperCase() : '?'}
                                </div>
                                <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                                    {deck.creatorName || 'Usuario'}
                                </span>
                            </div>
                            <span style={{ color: 'var(--muted-foreground)', fontSize: '0.95rem', fontWeight: 600 }}>
                                {movies.length} {t.movieCount(movies.length)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Body Content */}
                <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
                    {/* Tracklist */}
                    <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '20px', color: 'var(--foreground)' }}>{t.contentList}</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                        {movies.map((movie, index) => (
                            <div key={movie.id} style={{
                                display: 'flex',
                                gap: '15px',
                                background: 'var(--background)',
                                padding: '10px',
                                borderRadius: '12px',
                                border: '1px solid #333'
                            }}>
                                <div style={{ width: '50px', aspectRatio: '2/3', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                                    <img src={movie.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>{movie.title}</h4>
                                    <div style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                                        <span>{movie.year}</span>
                                        <span style={{ color: DECKS_ACCENT }}><Star size={14} fill="currentColor" className="inline-block mr-0.5 -mt-0.5" style={{ color: DECKS_ACCENT }} aria-hidden /> {movie.rating != null ? movie.rating.toFixed(1) : 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Spacer for sticky footer */}
                <div style={{ height: '100px' }} />
            </div>

            {/* Sticky Footer */}
            <div style={{
                position: 'fixed',
                bottom: 0, left: 0, right: 0,
                padding: '20px',
                background: 'linear-gradient(to top, black 80%, transparent)',
                display: 'flex',
                justifyContent: 'center',
                gap: '15px',
                zIndex: 100
            }}>
                <button
                    onClick={onPlay}
                    className="flex items-center justify-center gap-2 flex-1 max-w-[400px] rounded-full py-4 px-10 text-xl font-black text-[var(--primary-foreground)] transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
                    style={{
                        background: 'var(--primary)',
                        boxShadow: 'var(--shadow-neon-pink)'
                    }}
                >
                    <Play size={22} strokeWidth={2.5} aria-hidden />
                    {t.playGame}
                </button>
                <button
                    onClick={handleShareDeck}
                    style={{
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        border: '1px solid var(--border)',
                        borderRadius: '50%',
                        width: '56px', height: '56px',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <Link2 size={24} aria-hidden />
                </button>
                {/* Botón Editar - solo visible cuando el usuario es el creador de la baraja */}
                {onEdit && currentUserId && deck.creatorId === currentUserId && (
                    <button
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            onEdit(deck);
                            onClose();
                        }}
                        style={{
                            background: 'var(--background)',
                            color: 'var(--foreground)',
                            border: '1px solid var(--border)',
                            borderRadius: '50%',
                            width: '56px', height: '56px',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        ⋮
                    </button>
                )}
            </div>
            
            {/* Movie Details Modal */}
            {selectedMovie && (
                <MovieDetailsModal
                    movie={selectedMovie}
                    onClose={() => setSelectedMovie(null)}
                />
            )}
        </div>
    );
}
