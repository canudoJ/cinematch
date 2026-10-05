'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Layers } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useDecks } from '@/context/DeckContext';
import { useLanguage } from '@/context/LanguageContext';
import { DECK_COLUMNS, buildDeck } from '@/lib/decks';
import { fetchProfilesMap } from '@/lib/friends';
import DeckPreviewModal from '@/components/DeckPreviewModal';
import { LoadingScreen } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Deck, DeckWithItems } from '@/types';
import { buttonVariants } from '@/components/ui/Button';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Baraja compartida por enlace. Los permisos los aplica la base de datos (RLS):
 * si es privada, o de "amigos" y no lo sois, la consulta no devuelve nada.
 */
export default function DeckPage() {
    const { deckId } = useParams<{ deckId: string }>();
    const router = useRouter();
    const { t, language } = useLanguage();
    const { setActiveDeck, incrementDeckViews } = useDecks();
    const [result, setResult] = useState<{ id: string; deck: Deck | null } | null>(null);

    useEffect(() => {
        if (!UUID_RE.test(deckId)) return;
        let cancelled = false;
        void (async () => {
            const { data } = await supabase.from('decks').select(DECK_COLUMNS).eq('id', deckId).maybeSingle();
            const row = data as DeckWithItems | null;
            let deck: Deck | null = null;
            if (row) {
                const creators = await fetchProfilesMap([row.user_id]);
                deck = await buildDeck(row, creators.get(row.user_id), language, { full: true });
            }
            if (!cancelled) setResult({ id: deckId, deck });
        })();
        return () => {
            cancelled = true;
        };
    }, [deckId, language]);

    const invalid = !UUID_RE.test(deckId);
    const current = result?.id === deckId ? result : null;

    if (!invalid && !current) return <LoadingScreen label={t.loadingDeck} />;

    if (invalid || !current?.deck) {
        return (
            <div className="flex flex-1 items-center justify-center p-4">
                <EmptyState
                    icon={Layers}
                    title={t.deckNotFound}
                    hint={t.deckNotFoundHint}
                    action={<Link href="/" className={buttonVariants({ size: 'lg' })}>{t.goHomeButton}</Link>}
                />
            </div>
        );
    }

    return (
        <DeckPreviewModal
            deck={current.deck}
            onClose={() => router.push('/')}
            onPlay={deck => {
                void incrementDeckViews(deck.id);
                setActiveDeck(deck);
                router.push('/');
            }}
        />
    );
}
