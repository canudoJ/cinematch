'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SwipeDeck from '@/components/SwipeDeck';
import SocialHubModal from '@/components/SocialHubModal';
import DecksModal from '@/components/DecksModal';
import LibraryModal from '@/components/LibraryModal';
import PreferencesModal from '@/components/PreferencesModal';
import { Header } from '@/components/layout/Header';

type Panel = 'library' | 'decks' | 'social' | 'filters';
const PANELS: Panel[] = ['library', 'decks', 'social', 'filters'];

/** El panel abierto vive en la URL (?open=…): se puede enlazar y no se reabre al recargar tras cerrarlo */
function HomeContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const requested = searchParams.get('open');
    const panel = PANELS.find(p => p === requested) ?? null;
    const close = () => router.replace('/', { scroll: false });

    // Columna centrada: en escritorio todo queda a la vista sin recorrer la pantalla de lado a lado
    return (
        <main className="mx-auto flex h-full min-h-0 w-full max-w-[620px] flex-col overflow-hidden px-2 sm:px-4">
            <Header />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <SwipeDeck isOverlayBlocked={panel !== null} />
            </div>
            {panel === 'social' && <SocialHubModal onClose={close} />}
            {panel === 'decks' && <DecksModal onClose={close} />}
            {panel === 'library' && <LibraryModal onClose={close} />}
            {panel === 'filters' && <PreferencesModal onClose={close} />}
        </main>
    );
}

export default function HomePage() {
    return (
        <Suspense fallback={null}>
            <HomeContent />
        </Suspense>
    );
}
