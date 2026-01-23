import React, { useState } from 'react';
import { useUser } from '@/context/UserContext';
import { useDecks } from '@/context/DeckContext';
import { useLanguage } from '@/context/LanguageContext';
import { PROVIDERS } from '@/lib/constants';
import CloseButton from './ui/CloseButton';

export interface RouletteConfig {
    mediaType: 'movie' | 'tv' | 'both';
    sourceType: 'trending' | 'surprise' | 'genre' | 'deck';
    sourceValue: string; // genre ID string or deck ID
    providers: string[];
    minRating: number;
}

interface RouletteSetupModalProps {
    onClose: () => void;
    onCreate: (config: RouletteConfig) => void;
}

const SOURCES = [
    { id: 'trending', label: '🔥 Trending', value: 'trending', type: 'trending' },
    { id: 'surprise', label: '🎲 Sorpréndeme', value: 'surprise', type: 'surprise' },
    { id: 'horror', label: '👻 Terror', value: '27,53', type: 'genre' },
    { id: 'drama', label: '😢 Drama', value: '18', type: 'genre' },
    { id: 'comedy', label: '😂 Comedia', value: '35', type: 'genre' },
];

export default function RouletteSetupModal({ onClose, onCreate }: RouletteSetupModalProps) {
    const { t } = useLanguage();
    const { platforms: userPlatforms } = useUser();
    const { decks: myDecks } = useDecks();

    // State
    const [mediaType, setMediaType] = useState<'movie' | 'tv' | 'both'>('movie');
    const [selectedSource, setSelectedSource] = useState<any>(SOURCES[0]);
    const [selectedProviders, setSelectedProviders] = useState<string[]>(PROVIDERS.map(p => p.id)); // Default: ALL

    // Combine static sources with decks
    const allSources = [
        ...SOURCES,
        ...myDecks.map(d => ({
            id: d.id,
            label: `📂 ${d.title}`,
            value: d.id,
            type: 'deck'
        }))
    ];

    const toggleProvider = (pid: string) => {
        if (selectedProviders.includes(pid)) {
            setSelectedProviders(prev => prev.filter(p => p !== pid));
        } else {
            setSelectedProviders(prev => [...prev, pid]);
        }
    };

    const handleCreate = () => {
        const config: RouletteConfig = {
            mediaType,
            sourceType: selectedSource.type as any,
            sourceValue: selectedSource.value,
            providers: selectedProviders,
            minRating: selectedSource.type === 'surprise' ? 6.0 : 0
        };
        onCreate(config);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
            <div className="animate-pop-in" style={{
                background: 'var(--bg-darker)', width: '100%', maxWidth: '500px',
                borderRadius: '24px', border: '1px solid #333', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', maxHeight: '90vh'
            }}>
                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Configurar Sala</h2>
                    <CloseButton onClose={onClose} className="relative top-0 right-0" size="sm" />
                </div>

                <div style={{ padding: '20px', overflowY: 'auto' }}>

                    {/* 1. Format */}
                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', color: '#888', marginBottom: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}>FORMATO</label>
                        <div style={{ display: 'flex', background: '#333', borderRadius: '12px', padding: '4px' }}>
                            {(['movie', 'tv', 'both'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setMediaType(type)}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
                                        background: mediaType === type ? 'var(--accent-green)' : 'transparent',
                                        color: mediaType === type ? 'black' : '#aaa',
                                        transition: 'all 0.2s',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    {type === 'movie' ? '🎬 Películas' : type === 'tv' ? '📺 Series' : '♾️ Ambos'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 2. Source */}
                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', color: '#888', marginBottom: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}>FUENTE DE CONTENIDO</label>
                        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'thin', scrollbarColor: '#444 #222' }}>
                            {allSources.map(src => (
                                <div
                                    key={src.id}
                                    onClick={() => setSelectedSource(src)}
                                    style={{
                                        flexShrink: 0, width: '120px', height: '100px',
                                        background: selectedSource.id === src.id ? 'var(--accent-green)' : '#333',
                                        color: selectedSource.id === src.id ? 'black' : 'white',
                                        borderRadius: '16px', padding: '15px',
                                        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center',
                                        cursor: 'pointer', border: '2px solid transparent',
                                        borderColor: selectedSource.id === src.id ? 'var(--accent-green)' : '#444'
                                    }}
                                >
                                    <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>{src.label.split(' ')[0]}</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', lineHeight: '1.2' }}>{src.label.split(' ').slice(1).join(' ')}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 3. Platforms */}
                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', color: '#888', marginBottom: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}>PLATAFORMAS DISPONIBLES</label>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {PROVIDERS.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => toggleProvider(p.id)}
                                    style={{
                                        padding: '5px 12px', borderRadius: '20px', fontSize: '0.85rem',
                                        background: selectedProviders.includes(p.id) ? p.color : '#222',
                                        color: selectedProviders.includes(p.id) ? p.textColor : '#666',
                                        border: selectedProviders.includes(p.id) ? `1px solid ${p.color}` : '1px solid #444',
                                        fontWeight: 'bold', cursor: 'pointer', opacity: selectedProviders.includes(p.id) ? 1 : 0.6,
                                        display: 'flex', alignItems: 'center', gap: '6px'
                                    }}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                <div style={{ padding: '20px', borderTop: '1px solid #333' }}>
                    <button
                        onClick={handleCreate}
                        style={{
                            width: '100%', padding: '16px', borderRadius: '12px',
                            background: 'var(--accent-red-alt)', color: 'white', border: 'none',
                            fontSize: '1.1rem', fontWeight: '900', cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(255, 71, 87, 0.3)'
                        }}
                    >
                        CREAR SALA
                    </button>
                </div>
            </div>
        </div>
    );
}
