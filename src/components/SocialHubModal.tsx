import { useLanguage } from '@/context/LanguageContext';
import Link from 'next/link';
import BackButton from './ui/BackButton';

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
            icon: '🔥',
            path: '/affinity-test',
            color: '#ff6b6b'
        },
        {
            id: 'roulette',
            title: t.russianRouletteTitle,
            desc: t.russianRouletteDesc,
            icon: '🔫',
            path: '/roulette-lobby',
            color: 'var(--accent-green)'
        },
        {
            id: 'challenge',
            title: t.challengeFriendTitle,
            desc: t.challengeFriendDesc,
            icon: '🥊',
            path: '/challenge-mode',
            color: '#ffd93d'
        }
    ];

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
        }}>
            <BackButton
                onClick={onClose}
                className="absolute top-5 left-5"
            />

            <h1 className="animate-fade-in" style={{
                marginBottom: '40px',
                fontSize: '2.5rem',
                textAlign: 'center',
                background: 'linear-gradient(45deg, var(--accent-red), var(--accent-green))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
            }}>
                {t.socialHubTitle}
            </h1>

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
                            background: 'var(--bg-darker)',
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
                                e.currentTarget.style.background = '#252525';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.background = 'var(--bg-darker)';
                            }}
                        >
                            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>{mode.icon}</div>
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
    );
}
