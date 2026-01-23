import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from 'sonner';
import "./globals.css";
import { LanguageProvider } from '@/context/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CineMatch - Encuentra Películas Juntos",
  description: "Deja de scrollear, empieza a ver.",
};

import { AuthProvider } from '@/context/AuthProvider';
import { UserProvider } from '@/context/UserContext';
import { LobbyProvider } from '@/context/LobbyContext';
import { DeckProvider } from '@/context/DeckContext';
import { ChallengeProvider } from '@/context/ChallengeContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>
          <UserProvider>
            <LobbyProvider>
              <DeckProvider>
                <ChallengeProvider>
                  <LanguageProvider>
                    <LanguageSwitcher />
                    <Toaster position="top-center" richColors />
                    {children}
                  </LanguageProvider>
                </ChallengeProvider>
              </DeckProvider>
            </LobbyProvider>
          </UserProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
