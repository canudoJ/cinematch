'use client';

import React, { createContext, useContext, useEffect, useMemo, ReactNode } from 'react';
import { es, type Translations } from '@/i18n/es';
import { en } from '@/i18n/en';
import { useStoredValue } from '@/hooks/useStoredValue';
import type { AppLanguage } from '@/types';

const TRANSLATIONS: Record<AppLanguage, Translations> = { es, en };

const isLanguage = (value: string): value is AppLanguage => value === 'es' || value === 'en';

interface LanguageContextType {
    language: AppLanguage;
    setLanguage: (lang: AppLanguage) => void;
    t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useStoredValue<AppLanguage>('cinematch_language', 'es', isLanguage);

    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);

    const value = useMemo(
        () => ({ language, setLanguage, t: TRANSLATIONS[language] }),
        [language, setLanguage],
    );

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
