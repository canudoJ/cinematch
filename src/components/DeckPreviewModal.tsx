import React from 'react';
import { Deck, Movie } from '@/lib/data';
import { useLanguage } from '@/context/LanguageContext';
import CloseButton from './ui/CloseButton';

interface DeckPreviewModalProps {
    deck: Deck;
    onClose: () => void;
    onPlay: () => void;
}

export default function DeckPreviewModal({ deck, onClose, onPlay }: DeckPreviewModalProps) {
    const { t } = useLanguage();

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            zIndex: 1100, // Higher than DecksModal
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }} className="animate-pop-in">
            {/* Close Button */}
            <CloseButton onClose={onClose} />

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {/* Hero Section */}
                <div style={{ position: 'relative', height: '300px', display: 'flex', alignItems: 'flex-end' }}>
                    {/* Background Blur */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        backgroundImage: `url(${deck.movies[0]?.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'blur(20px) brightness(0.4)',
                        zIndex: 0
                    }} />

                    {/* Content */}
                    <div style={{ position: 'relative', zIndex: 10, padding: '20px', width: '100%' }}>
                        {/* Tags */}
                        {deck.tags && deck.tags.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                                {deck.tags.map(tag => (
                                    <span key={tag} style={{
                                        background: 'rgba(75, 255, 179, 0.2)',
                                        color: 'var(--accent-green)',
                                        padding: '4px 8px',
                                        borderRadius: '12px',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold'
                                    }}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        <h1 style={{ margin: 0, fontSize: '2.5rem', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{deck.title}</h1>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                            {deck.creatorAvatar && <img src={deck.creatorAvatar} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '2px solid white' }} />}
                            <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>{deck.creatorName}</span>
                            <span style={{ color: '#aaa' }}>•</span>
                            <span style={{ color: '#aaa' }}>{deck.movies.length} available</span>
                        </div>
                    </div>
                </div>

                {/* Body Content */}
                <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
                    {/* Description */}
                    {deck.description && (
                        <div style={{ marginBottom: '30px', lineHeight: '1.6', color: '#ddd', fontSize: '1.1rem' }}>
                            {deck.description}
                        </div>
                    )}

                    {/* Tracklist */}
                    <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>Content List</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                        {deck.movies.map((movie, index) => (
                            <div key={movie.id} style={{
                                display: 'flex',
                                gap: '15px',
                                background: 'var(--bg-darker)',
                                padding: '10px',
                                borderRadius: '12px',
                                border: '1px solid #333'
                            }}>
                                <div style={{ width: '50px', aspectRatio: '2/3', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                                    <img src={movie.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>{movie.title}</h4>
                                    <div style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', color: '#888' }}>
                                        <span>{movie.year}</span>
                                        <span style={{ color: '#f5c518' }}>★ {movie.rating.toFixed(1)}</span>
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
                    style={{
                        background: 'var(--accent-green)',
                        color: 'black',
                        border: 'none',
                        borderRadius: '30px',
                        padding: '16px 40px',
                        fontSize: '1.2rem',
                        fontWeight: '900',
                        cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(75, 255, 179, 0.4)',
                        flex: 1,
                        maxWidth: '400px'
                    }}
                >
                    🃏 {t.playGame}
                </button>
                <button
                    onClick={() => alert(t.linkCopied)}
                    style={{
                        background: '#222',
                        color: 'white',
                        border: '1px solid #444',
                        borderRadius: '50%',
                        width: '56px', height: '56px',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    🔗
                </button>
            </div>
        </div>
    );
}
