'use client';

import SwipeDeck from '@/components/SwipeDeck';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import SocialHubModal from '@/components/SocialHubModal';
import DecksModal from '@/components/DecksModal';
import LibraryModal from '@/components/LibraryModal';
import { useLobby } from '@/context/LobbyContext';
import { useDecks } from '@/context/DeckContext';
import { Header } from '@/components/layout/Header';

export default function HomePage() {
  const searchParams = useSearchParams();
  const [showSocialHub, setShowSocialHub] = useState(false);
  const [showDecks, setShowDecks] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { lobbyId, leaveLobby } = useLobby();
  const { activeDeck } = useDecks();

  useEffect(() => {
    const open = searchParams.get('open');
    if (open === 'library') setShowLibrary(true);
    if (open === 'decks') setShowDecks(true);
    if (open === 'social') setShowSocialHub(true);
  }, [searchParams]);

  useEffect(() => {
    const handleDetailsOpened = () => setShowDetails(true);
    const handleDetailsClosed = () => setShowDetails(false);
    const handleOpenLibrary = () => setShowLibrary(true);
    const handleOpenDecks = () => setShowDecks(true);
    const handleOpenSocial = () => setShowSocialHub(true);

    window.addEventListener('cinematch:details-opened', handleDetailsOpened);
    window.addEventListener('cinematch:details-closed', handleDetailsClosed);
    window.addEventListener('cinematch:open-library', handleOpenLibrary);
    window.addEventListener('cinematch:open-decks', handleOpenDecks);
    window.addEventListener('cinematch:open-social', handleOpenSocial);

    return () => {
      window.removeEventListener('cinematch:details-opened', handleDetailsOpened);
      window.removeEventListener('cinematch:details-closed', handleDetailsClosed);
      window.removeEventListener('cinematch:open-library', handleOpenLibrary);
      window.removeEventListener('cinematch:open-decks', handleOpenDecks);
      window.removeEventListener('cinematch:open-social', handleOpenSocial);
    };
  }, []);

  const isDeckMode = activeDeck && !activeDeck.id?.startsWith('temp-');

  return (
    <main className="h-full w-full flex flex-col min-h-0 overflow-hidden px-2 sm:px-4">
      <Header
        showDetails={showDetails}
        lobbyId={lobbyId}
        leaveLobby={leaveLobby}
        activeDeck={activeDeck ?? null}
        isDeckMode={!!isDeckMode}
      />

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <SwipeDeck isOverlayBlocked={showSocialHub || showDecks || showLibrary} />
      </div>

      {showSocialHub && <SocialHubModal onClose={() => setShowSocialHub(false)} />}
      {showDecks && <DecksModal onClose={() => setShowDecks(false)} />}
      {showLibrary && <LibraryModal onClose={() => setShowLibrary(false)} />}
    </main>
  );
}
