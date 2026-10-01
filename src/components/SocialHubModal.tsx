import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Link from 'next/link';
import BackButton from './ui/BackButton';
import { Flame, Target, Swords } from 'lucide-react';

interface SocialHubModalProps {
    onClose: () => void;
}

export default function SocialHubModal({ onClose }: SocialHubModalProps) {
    const { t } = useLanguage();

    const gameModes = [
        {
            id: 'affinity',
            title: t.iceBreakerTitle,
            desc: t.iceBreakerDesc,
            Icon: Flame,
            path: '/affinity-test',
            color: '#ff6b6b'
        },
        {
            id: 'roulette',
            title: t.russianRouletteTitle,
            desc: t.russianRouletteDesc,
            Icon: Target,
            path: '/roulette-lobby',
            color: 'var(--secondary)'
        },
        {
            id: 'challenge',
            title: t.challengeFriendTitle,
            desc: t.challengeFriendDesc,
            Icon: Swords,
            path: '/challenge-mode',
            color: '#ffd93d'
        }
    ];

    return (
        <div
            className="social-hub-modal"
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.95)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 2000,
                overflow: 'hidden'
            }}
        >
            {/* Contenido desplazable + botón atrás anclado en esquina superior izquierda */}
            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    position: 'relative',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    WebkitOverflowScrolling: 'touch',
                    padding: '40px 20px 20px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}
                className="custom-scrollbar"
            >
                {/* Contenedor centrado para título, tarjetas y botón atrás */}
                <div
                    style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '1000px',
                        margin: '0 auto'
                    }}
                >
                    {/* BackButton alineado con el lateral izquierdo de las tarjetas */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '18px',
                            left: '0',
                            zIndex: 50
                        }}
                    >
                        <BackButton onClick={onClose} />
                    </div>

                    {/* Contenedor del título principal */}
                    <div
                        style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            marginTop: '8px',
                            marginBottom: '32px'
                        }}
                    >
                        <h1
                            className="animate-fade-in"
                            style={{
                                margin: 0,
                                fontSize: 'clamp(2rem, 5vw, 2.8rem)',
                                textAlign: 'center',
                                fontFamily:
                                    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                                fontWeight: 800,
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                                color: '#ffffff',
                                textShadow:
                                    '0 0 6px rgba(0,0,0,0.8), 0 0 18px rgba(0,229,255,0.65)',
                            }}
                        >
                            {t.socialHubTitle}
                        </h1>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '20px',
                        width: '100%',
                        maxWidth: '1000px'
                    }}>
                    {gameModes.map((mode, index) => (
                        <Link
                            key={mode.id}
                            href={mode.path}
                            className="animate-pop-in"
                            style={{
                                textDecoration: 'none',
                                animationDelay: `${index * 100}ms`
                            }}
                        >
                            <div style={{
                                background: 'var(--background)',
                                border: `1px solid ${mode.color}`,
                                borderRadius: '24px',
                                padding: '30px',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                transition: 'transform 0.2s, background 0.2s',
                                cursor: 'pointer',
                            }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-10px)';
                                    e.currentTarget.style.background = 'var(--card)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.background = 'var(--background)';
                                }}
                            >
                                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{React.createElement(mode.Icon, { size: 48, className: 'text-[var(--secondary)]', 'aria-hidden': true })}</div>
                                <h2 style={{
                                    color: 'white',
                                    marginBottom: '10px',
                                    fontSize: '1.5rem'
                                }}>
                                    {mode.title}
                                </h2>
                                <p style={{ color: '#888', lineHeight: '1.5' }}>
                                    {mode.desc}
                                </p>
                            </div>
                        </Link>
                    ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
