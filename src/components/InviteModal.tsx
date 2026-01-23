'use client';

import React, { useState } from 'react';
import { useUser, ContentType } from '@/context/UserContext';
import { useLobby } from '@/context/LobbyContext';
import { useLanguage } from '@/context/LanguageContext';
import { PROVIDERS } from '@/lib/constants';
import CloseButton from './ui/CloseButton';

interface InviteModalProps {
    onClose: () => void;
    onStartGame: () => void;
}

export default function InviteModal({ onClose, onStartGame }: InviteModalProps) {
    const { t } = useLanguage();
    const { platforms: userPlatforms, contentTypes: userTypes } = useUser();
    const { createLobby, lobbyId, players, simulateGuestJoin } = useLobby();

    // Local state for Group Config (defaults to User's config)
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(userPlatforms);
    const [selectedTypes, setSelectedTypes] = useState<ContentType[]>(userTypes);
    const [step, setStep] = useState<'config' | 'lobby'>('config');

    // Platforms with Styles & Fixed IDs
    const platforms = PROVIDERS.map(p => ({
        ...p,
        label: p.name // Map 'name' to 'label' to match component usage
    }));

    const togglePlatform = (pid: string) => {
        if (selectedPlatforms.includes(pid)) {
            setSelectedPlatforms(prev => prev.filter(p => p !== pid));
        } else {
            setSelectedPlatforms(prev => [...prev, pid]);
        }
    };

    const toggleType = (type: ContentType) => {
        if (selectedTypes.includes(type)) {
            if (selectedTypes.length === 1) return;
            setSelectedTypes(prev => prev.filter(t => t !== type));
        } else {
            setSelectedTypes(prev => [...prev, type]);
        }
    };

    const handleCreateLobby = () => {
        createLobby({
            platforms: selectedPlatforms,
            contentTypes: selectedTypes
        });
        setStep('lobby');
        // Trigger the fake guest join
        simulateGuestJoin();
    };

    // Logic for "Start Game" button
    const canStart = players.length > 1; // Needs at least 1 guest + host

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
            <div style={{
                background: 'var(--bg-darker)',
                padding: '30px',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '400px',
                border: '1px solid #333',
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                <CloseButton onClose={onClose} />

                {step === 'config' && (
                    <div className="animate-pop-in">
                        <h2 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '1.5rem' }}>{t.groupSetup}</h2>

                        <div style={{ marginBottom: '25px' }}>
                            <label style={{ display: 'block', color: '#888', marginBottom: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}>{t.selectContent}</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => toggleType('movie')}
                                    style={{
                                        flex: 1,
                                        padding: '15px',
                                        borderRadius: '12px',
                                        background: selectedTypes.includes('movie') ? 'var(--primary)' : '#333',
                                        border: selectedTypes.includes('movie') ? '1px solid var(--primary)' : '1px solid #444',
                                        color: selectedTypes.includes('movie') ? 'black' : '#888',
                                        fontWeight: 'bold',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    🎬 {t.movies}
                                </button>
                                <button
                                    onClick={() => toggleType('tv')}
                                    style={{
                                        flex: 1,
                                        padding: '15px',
                                        borderRadius: '12px',
                                        background: selectedTypes.includes('tv') ? '#9900FF' : '#333',
                                        border: selectedTypes.includes('tv') ? '1px solid #9900FF' : '1px solid #444',
                                        color: selectedTypes.includes('tv') ? 'white' : '#888',
                                        fontWeight: 'bold',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    📺 {t.tvShows}
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: '30px' }}>
                            <label style={{ display: 'block', color: '#888', marginBottom: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}>{t.yourPlatform}</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                {platforms.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => togglePlatform(p.id)}
                                        style={{
                                            padding: '15px',
                                            borderRadius: '12px',
                                            background: selectedPlatforms.includes(p.id) ? p.color : '#333',
                                            color: selectedPlatforms.includes(p.id) ? p.textColor : '#888',
                                            border: 'none',
                                            fontWeight: 'bold',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            opacity: selectedPlatforms.includes(p.id) ? 1 : 0.6,
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {/* Visual Indicator */}
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: selectedPlatforms.includes(p.id) ? 'currentColor' : '#555' }}></div>
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleCreateLobby}
                            className="btn-primary"
                            style={{ width: '100%', padding: '15px', fontSize: '1.1rem', borderRadius: '12px' }}
                        >
                            {t.createLobby}
                        </button>
                    </div>
                )}

                {step === 'lobby' && (
                    <div className="animate-pop-in" style={{ textAlign: 'center' }}>
                        <h2 style={{ marginBottom: '10px' }}>{t.waitingForPlayers}</h2>
                        <p style={{ color: '#888', marginBottom: '20px' }}>{t.shareCode}</p>

                        <div style={{
                            background: '#333',
                            padding: '20px',
                            borderRadius: '16px',
                            fontSize: '2rem',
                            letterSpacing: '8px',
                            fontWeight: '900',
                            marginBottom: '30px',
                            color: 'var(--primary)',
                            border: '2px dashed #444'
                        }}>
                            {lobbyId}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '40px' }}>
                            {/* Host */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: '10px', margin: '0 auto' }}>
                                    {players[0]?.avatar}
                                </div>
                                <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{t.you}</span>
                            </div>

                            {/* Guest or Placeholder */}
                            {players[1] ? (
                                <div className="animate-pop-in" style={{ textAlign: 'center' }}>
                                    <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'var(--accent-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: '10px', margin: '0 auto' }}>
                                        {players[1].avatar}
                                    </div>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{players[1].name}</span>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ width: '70px', height: '70px', borderRadius: '50%', border: '2px dashed #666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: '10px', color: '#666', margin: '0 auto' }}>
                                        ⏳
                                    </div>
                                    <span style={{ fontSize: '0.9rem', color: '#666' }}>Esperando...</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={onStartGame}
                            disabled={!canStart}
                            style={{
                                width: '100%',
                                padding: '20px',
                                borderRadius: '16px',
                                border: 'none',
                                fontWeight: '900',
                                fontSize: '1.2rem',
                                background: canStart ? 'var(--primary)' : '#333', // GREEN when ready, GRAY otherwise
                                color: canStart ? '#000' : '#666',
                                cursor: canStart ? 'pointer' : 'not-allowed',
                                transform: canStart ? 'scale(1.02)' : 'scale(1)',
                                boxShadow: canStart ? '0 0 20px rgba(75, 255, 179, 0.4)' : 'none',
                                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                            }}
                        >
                            {canStart ? t.startGame : t.waitingForPlayers}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
