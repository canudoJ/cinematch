'use client';

import { useState } from 'react';
import { useUser, ContentType } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

import { PROVIDERS } from '@/lib/constants';

import BackButton from '@/components/ui/BackButton';

export default function SetupPage() {
    const { updatePlatforms, toggleContentType, contentTypes } = useUser();
    const { language } = useLanguage();
    const router = useRouter();

    // Local state for UI before saving
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

    const toggleProvider = (id: string) => {
        if (selectedPlatforms.includes(id)) {
            setSelectedPlatforms(selectedPlatforms.filter(p => p !== id));
        } else {
            setSelectedPlatforms([...selectedPlatforms, id]);
        }
    };

    const handleContinue = () => {
        updatePlatforms(selectedPlatforms);
        router.push('/');
    };

    return (
        <main className="container" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px', position: 'relative' }}>
            <BackButton className="absolute top-5 left-5" />
            <div className="animate-fade-in" style={{ width: '100%', textAlign: 'center', maxWidth: '600px' }}>
                <h1 style={{ marginBottom: '10px', fontWeight: 800, fontSize: '2rem' }}>
                    {language === 'es' ? 'Tus Plataformas' : 'Your Platforms'}
                </h1>
                <p style={{ color: '#888', marginBottom: '30px' }}>
                    {language === 'es' ? 'Selecciona todo lo que te apetezca:' : 'Select everything you want:'}
                </p>

                {/* Platforms Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '40px' }}>
                    {PROVIDERS.map(p => {
                        const isSelected = selectedPlatforms.includes(p.id);
                        return (
                            <button
                                key={p.id}
                                onClick={() => toggleProvider(p.id)}
                                style={{
                                    background: isSelected ? p.color : '#1A1A1A',
                                    border: isSelected ? `2px solid ${p.color}` : '2px solid #333',
                                    padding: '10px',
                                    borderRadius: '16px',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '80px',
                                    boxShadow: isSelected ? `0 0 20px ${p.color}40` : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {p.name}
                            </button>
                        );
                    })}
                </div>

                {/* Content Type Multi-Select */}
                <div style={{ marginBottom: '40px', background: '#222', padding: '10px', borderRadius: '16px', display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => toggleContentType('movie')}
                        style={{
                            flex: 1,
                            padding: '15px',
                            borderRadius: '12px',
                            background: contentTypes.includes('movie') ? 'var(--primary)' : '#333',
                            border: 'none',
                            color: 'white',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            opacity: contentTypes.includes('movie') ? 1 : 0.7
                        }}
                    >
                        🎬 {language === 'es' ? 'Películas' : 'Movies'}
                    </button>
                    <button
                        onClick={() => toggleContentType('tv')}
                        style={{
                            flex: 1,
                            padding: '15px',
                            borderRadius: '12px',
                            background: contentTypes.includes('tv') ? '#9900FF' : '#333',
                            border: 'none',
                            color: 'white',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            opacity: contentTypes.includes('tv') ? 1 : 0.7
                        }}
                    >
                        📺 {language === 'es' ? 'Series' : 'TV Shows'}
                    </button>
                </div>

                {/* Start Button */}
                <div>
                    <button
                        onClick={handleContinue}
                        className="btn-primary"
                        disabled={selectedPlatforms.length === 0}
                        style={{
                            opacity: selectedPlatforms.length === 0 ? 0.5 : 1,
                            width: '100%',
                            padding: '20px',
                            fontSize: '1.2rem'
                        }}
                    >
                        {language === 'es' ? 'Empezar a Jugar' : 'Start Playing'}
                    </button>
                </div>
            </div>
        </main>
    );
}
