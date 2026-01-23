'use client';

import SwipeDeck from '@/components/SwipeDeck';
import { useLanguage } from '@/context/LanguageContext';
import Link from 'next/link';
import { useState } from 'react';
import SocialHubModal from '@/components/SocialHubModal';
import DecksModal from '@/components/DecksModal';
import LibraryModal from '@/components/LibraryModal';
import { useLobby } from '@/context/LobbyContext';
import { useDecks } from '@/context/DeckContext';

export default function HomePage() {
  const { t } = useLanguage();
  const [showSocialHub, setShowSocialHub] = useState(false);
  const [showDecks, setShowDecks] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const { lobbyId, leaveLobby } = useLobby();
  const { activeDeck, setActiveDeck } = useDecks();

  return (
    <main className="min-h-screen p-6 pb-20 max-w-7xl mx-auto flex flex-col">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center mb-8 relative z-20">

        {/* Left: Navigation & Menu */}
        <div className="flex items-center gap-6">
          <Link href="/setup" className={`text-4xl transition-all hover:scale-110 active:scale-95 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] ${lobbyId ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
            ⚙️
          </Link>

          {lobbyId ? (
            <button
              onClick={leaveLobby}
              className="bg-[var(--accent-red)] hover:bg-[var(--accent-red)]/80 text-white font-bold py-2 px-4 rounded-2xl shadow-[0_4px_15px_rgba(255,75,75,0.3)] flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <span className="text-2xl">🚪</span> {t.exitLobby}
            </button>
          ) : (
            <div className="flex gap-4">
              <button
                onClick={() => setShowLibrary(true)}
                className="text-4xl transition-transform hover:scale-110 active:scale-95 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] hover:brightness-110"
                title="My Library"
              >
                ❤️
              </button>
              <button
                onClick={() => setShowDecks(true)}
                className="text-4xl transition-transform hover:scale-110 active:scale-95 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] hover:brightness-110"
                title={t.decks}
              >
                🎴
              </button>
              <button
                onClick={() => setShowSocialHub(true)}
                className="text-4xl transition-transform hover:scale-110 active:scale-95 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] hover:brightness-110"
                title={t.playWithFriends}
              >
                👥
              </button>
              <Link
                href="/profile"
                className="text-4xl transition-transform hover:scale-110 active:scale-95 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] hover:brightness-110"
                title="Mi Perfil"
              >
                👤
              </Link>
            </div>
          )}
        </div>

        {/* Center: Deck Title */}
        <div className="flex justify-center px-4">
          {activeDeck && (
            <div className="bg-[var(--accent-green-alt)]/10 border border-[var(--accent-green-alt)] text-[var(--accent-green-alt)] rounded-full px-5 py-1.5 text-sm font-bold whitespace-nowrap shadow-[0_0_15px_rgba(0,255,157,0.2)] animate-in fade-in zoom-in duration-300">
              🎮 {activeDeck.title}
            </div>
          )}
        </div>

        {/* Right: Exit Deck Button */}
        <div className="flex justify-end">
          {activeDeck && (
            <button
              onClick={() => setActiveDeck(null)}
              className="bg-[var(--accent-red)]/20 hover:bg-[var(--accent-red)]/30 border border-[var(--accent-red)] text-[var(--accent-red)] rounded-xl py-2 px-4 font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 backdrop-blur-sm"
            >
              Exit 🚪
            </button>
          )}
        </div>
      </header>

      <SwipeDeck isOverlayBlocked={showSocialHub || showDecks || showLibrary} />

      {showSocialHub && <SocialHubModal onClose={() => setShowSocialHub(false)} />}
      {showDecks && <DecksModal onClose={() => setShowDecks(false)} />}
      {showLibrary && <LibraryModal onClose={() => setShowLibrary(false)} />}
    </main>
  );
}
