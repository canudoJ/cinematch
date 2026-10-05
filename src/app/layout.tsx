import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Geist, Geist_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { AuthProvider } from '@/context/AuthProvider';
import { UserProvider } from '@/context/UserContext';
import { FriendsProvider } from '@/context/FriendsContext';
import { LobbyProvider } from '@/context/LobbyContext';
import { RouletteInviteProvider } from '@/context/RouletteInviteContext';
import { DeckProvider } from '@/context/DeckContext';
import { ChallengeProvider } from '@/context/ChallengeContext';
import { AppShell } from '@/components/layout/AppShell';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

/** Tipografía de cartel para los títulos de películas */
const displayFont = Bricolage_Grotesque({
    variable: '--font-display',
    subsets: ['latin'],
    weight: ['600', '800'],
});

export const metadata: Metadata = {
    title: 'CineMatch - Encuentra Películas Juntos',
    description: 'Deja de scrollear, empieza a ver.',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'CineMatch',
    },
    keywords: ['películas', 'series', 'recomendaciones', 'match', 'pareja', 'qué ver'],
    openGraph: {
        title: 'CineMatch — Encuentra Películas Juntos',
        description: 'Deja de scrollear, empieza a ver. Haz match con lo que quieres ver esta noche.',
        siteName: 'CineMatch',
        locale: 'es_ES',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'CineMatch',
        description: 'Haz match con lo que quieres ver esta noche.',
    },
    // Demo privada: que no aparezca en buscadores
    robots: { index: false, follow: false },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    themeColor: [
        { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
        { media: '(prefers-color-scheme: light)', color: '#f0f2f5' },
    ],
};

/**
 * Orden de providers: los de interfaz (tema, idioma, toasts, diálogos) van primero
 * para que todos los contextos de datos puedan traducir y avisar de errores.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="es" suppressHydrationWarning>
            <head>
                {/* Aplica el tema guardado antes del primer pintado (evita el parpadeo) */}
                <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
            </head>
            <body className={`${geistSans.variable} ${geistMono.variable} ${displayFont.variable}`}>
                <ThemeProvider>
                    <LanguageProvider>
                        <ToastProvider>
                            <ConfirmProvider>
                                <AuthProvider>
                                    <UserProvider>
                                        <FriendsProvider>
                                            <LobbyProvider>
                                                <RouletteInviteProvider>
                                                    <DeckProvider>
                                                        <ChallengeProvider>
                                                            <AppShell>{children}</AppShell>
                                                        </ChallengeProvider>
                                                    </DeckProvider>
                                                </RouletteInviteProvider>
                                            </LobbyProvider>
                                        </FriendsProvider>
                                    </UserProvider>
                                </AuthProvider>
                            </ConfirmProvider>
                        </ToastProvider>
                    </LanguageProvider>
                </ThemeProvider>
                <Analytics />
            </body>
        </html>
    );
}
