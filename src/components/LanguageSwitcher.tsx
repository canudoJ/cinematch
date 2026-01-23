'use client';

import { useLanguage } from '@/context/LanguageContext';

export default function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage();

    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            padding: '4px',
            borderRadius: '20px',
            display: 'flex',
            gap: '4px'
        }}>
            <button
                onClick={() => setLanguage('es')}
                style={{
                    background: language === 'es' ? 'var(--primary)' : 'transparent',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '16px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s',
                    fontSize: '0.8rem'
                }}
            >
                ES
            </button>
            <button
                onClick={() => setLanguage('en')}
                style={{
                    background: language === 'en' ? 'var(--primary)' : 'transparent',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '16px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s',
                    fontSize: '0.8rem'
                }}
            >
                EN
            </button>
        </div>
    );
}
