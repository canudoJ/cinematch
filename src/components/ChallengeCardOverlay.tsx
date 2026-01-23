'use client';

import React from 'react';
import { Movie } from '@/lib/data';

interface ChallengeCardOverlayProps {
    movie: Movie;
    sender: string;
    onResolve: (accepted: boolean) => void;
}

export default function ChallengeCardOverlay({ movie, sender, onResolve }: ChallengeCardOverlayProps) {
    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 50,
            animation: 'popIn 0.3s ease-out'
        }}>
            {/* Fire/Glow Effect Container */}
            <div style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 0 30px var(--accent-red-alt), 0 0 60px #e1b12c', // Fire glow
                border: '4px solid var(--accent-red-alt)'
            }}>

                {/* Header Banner */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    background: 'linear-gradient(to bottom, var(--accent-red-alt), transparent)',
                    padding: '20px',
                    textAlign: 'center',
                    zIndex: 10
                }}>
                    <div style={{
                        color: 'white', fontWeight: '900', fontSize: '1.2rem',
                        textTransform: 'uppercase', letterSpacing: '1px',
                        textShadow: '0 2px 4px black'
                    }}>
                        🔥 Retado por {sender} 🔥
                    </div>
                </div>

                {/* Movie Image */}
                <img
                    src={movie.image}
                    alt={movie.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                {/* Footer Controls */}
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(to top, black 20%, transparent)',
                    padding: '30px 20px',
                    display: 'flex', flexDirection: 'column', gap: '15px'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.8rem', textShadow: '0 2px 4px black' }}>{movie.title}</h2>
                        <span style={{ fontSize: '0.9rem', color: '#ddd' }}>{movie.year} • ¿Aceptas el reto?</span>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                        <button
                            onClick={() => onResolve(false)}
                            style={{
                                flex: 1, padding: '15px', borderRadius: '15px',
                                background: 'rgba(255, 255, 255, 0.1)', border: '2px solid rgba(255, 255, 255, 0.3)',
                                color: 'white', fontWeight: 'bold', fontSize: '1.1rem',
                                backdropFilter: 'blur(5px)'
                            }}
                        >
                            Pasar
                        </button>
                        <button
                            onClick={() => onResolve(true)}
                            style={{
                                flex: 2, padding: '15px', borderRadius: '15px',
                                background: 'linear-gradient(45deg, var(--accent-red-alt), #e1b12c)', border: 'none',
                                color: 'white', fontWeight: '900', fontSize: '1.2rem',
                                boxShadow: '0 5px 20px rgba(255, 71, 87, 0.4)',
                                transform: 'scale(1.05)'
                            }}
                        >
                            ¡ACEPTAR! 🔥
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes popIn {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
