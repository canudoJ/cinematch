'use client';

import React, { createContext, useContext, useEffect, useMemo, ReactNode } from 'react';
import { useStoredValue } from '@/hooks/useStoredValue';
import { THEME_STORAGE_KEY, applyTheme, isTheme, type Theme } from '@/lib/theme';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useStoredValue<Theme>(THEME_STORAGE_KEY, 'dark', isTheme);

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return ctx;
}
