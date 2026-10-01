import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";

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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CineMatch",
  },
  keywords: ["películas", "series", "recomendaciones", "match", "pareja", "qué ver"],
  openGraph: {
    title: "CineMatch — Encuentra Películas Juntos",
    description: "Deja de scrollear, empieza a ver. Haz match con lo que quieres ver esta noche.",
    siteName: "CineMatch",
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CineMatch",
    description: "Haz match con lo que quieres ver esta noche.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#09090b",
};

import { AuthProvider } from "@/context/AuthProvider";
import { UserProvider } from "@/context/UserContext";
import { LobbyProvider } from "@/context/LobbyContext";
import { RouletteInviteProvider } from "@/context/RouletteInviteContext";
import { DeckProvider } from "@/context/DeckContext";
import { ChallengeProvider } from "@/context/ChallengeContext";
import { AppShell } from "@/components/layout/AppShell";
import { SwipeSessionProvider } from "@/context/SwipeSessionContext";
import { ToastProvider } from "@/components/ui/Toast";
import { Analytics } from "@vercel/analytics/react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <UserProvider>
              <LobbyProvider>
                <RouletteInviteProvider>
                  <DeckProvider>
                    <ChallengeProvider>
                      <LanguageProvider>
                        <SwipeSessionProvider>
                          <ToastProvider>
                            <AppShell>{children}</AppShell>
                          </ToastProvider>
                        </SwipeSessionProvider>
                      </LanguageProvider>
                    </ChallengeProvider>
                  </DeckProvider>
                </RouletteInviteProvider>
              </LobbyProvider>
            </UserProvider>
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
