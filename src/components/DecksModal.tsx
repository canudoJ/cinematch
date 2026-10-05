'use client';

import React, { useEffect, useId, useState } from 'react';
import { Layers, Plus, Users } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useDecks } from '@/context/DeckContext';
import { useAuth } from '@/context/AuthProvider';
import { ModalShell } from '@/components/ui/ModalShell';
import CloseButton from '@/components/ui/CloseButton';
import { ModalTitlePill } from '@/components/ui/ModalTitlePill';
import { Tabs } from '@/components/ui/Tabs';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { DeckListItem } from './decks/DeckListItem';
import { DeckEditor } from './decks/DeckEditor';
import DeckPreviewModal from './DeckPreviewModal';
import type { Deck } from '@/types';
import { MODES } from '@/lib/modes';

type Tab = 'popular' | 'my' | 'friends';

interface DecksModalProps {
    onClose: () => void;
}

export default function DecksModal({ onClose }: DecksModalProps) {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { decks: myDecks, setActiveDeck, fetchFriendDecks, fetchPopularDecks, incrementDeckViews, hydrateDeck } = useDecks();
    const titleId = useId();

    // Sin barajas propias (p. ej. un invitado) se abre en Populares para no mostrar una lista vacía
    const [tab, setTab] = useState<Tab>(() => (myDecks.length > 0 ? 'my' : 'popular'));
    /** Barajas de otras pestañas, cargadas la primera vez que se abren */
    const [remote, setRemote] = useState<Partial<Record<'popular' | 'friends', Deck[]>>>({});
    /** Vista previa: una baraja concreta o el id de una propia (se resuelve con la lista actualizada) */
    const [preview, setPreview] = useState<Deck | string | null>(null);
    /** null = listado; { deck: undefined } = crear; { deck } = editar */
    const [editor, setEditor] = useState<{ deck?: Deck } | null>(null);

    useEffect(() => {
        if (tab === 'my' || remote[tab]) return;
        let cancelled = false;
        const request = tab === 'friends' ? fetchFriendDecks() : fetchPopularDecks();
        void request.then(decks => {
            if (!cancelled) setRemote(prev => ({ ...prev, [tab]: decks }));
        });
        return () => {
            cancelled = true;
        };
    }, [tab, remote, fetchFriendDecks, fetchPopularDecks]);

    const previewDeck = typeof preview === 'string' ? myDecks.find(d => d.id === preview) ?? null : preview;

    const handlePlay = async (deck: Deck) => {
        const full = await hydrateDeck(deck);
        if (full.movies.length === 0) return;
        if (deck.privacy === 'public' && deck.creatorId !== user?.id) void incrementDeckViews(deck.id);
        setActiveDeck(full);
        setPreview(null);
        onClose();
    };

    const renderList = (decks: Deck[] | undefined, emptyTitle: string, emptyHint?: string) => {
        if (!decks) return <Spinner label={tab === 'friends' ? t.friendDecksLoading : t.loadingPopularDecks} className="py-10" />;
        if (decks.length === 0) return <EmptyState icon={tab === 'friends' ? Users : Layers} title={emptyTitle} hint={emptyHint} />;
        return (
            <ul className="grid grid-cols-1 gap-4">
                {decks.map(deck => (
                    <li key={deck.id} className="min-w-0">
                        <DeckListItem deck={deck} onOpen={() => setPreview(deck)} onPlay={() => void handlePlay(deck)} />
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <ModalShell onClose={onClose} labelledBy={titleId} panelClassName="modal-surface relative w-full max-w-[600px]">
            <div className="absolute left-4 top-4 z-10">
                <CloseButton onClose={onClose} />
            </div>

            {editor ? (
                <DeckEditor
                    deck={editor.deck}
                    onCancel={() => setEditor(null)}
                    onDone={savedId => {
                        setEditor(null);
                        setTab('my');
                        if (savedId) setPreview(savedId);
                    }}
                />
            ) : (
                <>
                    <ModalTitlePill id={titleId} title={t.decks} icon={MODES.decks.icon} accent={MODES.decks.accent} />
                    <Tabs<Tab>
                        label={t.decksTabsLabel}
                        accent="var(--accent-mid)"
                        className="mb-5"
                        value={tab}
                        onChange={setTab}
                        items={[
                            { id: 'popular', label: t.popularDecks },
                            { id: 'my', label: t.myDecks },
                            { id: 'friends', label: t.friendsDecks },
                        ]}
                    />
                    <div className="flex-1 overflow-y-auto [scrollbar-gutter:stable]" role="tabpanel">
                        {tab === 'my' && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setEditor({})}
                                    className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] p-4 font-semibold text-[var(--accent-mid)]"
                                >
                                    <Plus size={18} aria-hidden /> {t.createDeck}
                                </button>
                                {renderList(myDecks, t.noDecks, t.createFirstDeck)}
                            </>
                        )}
                        {tab === 'popular' && renderList(remote.popular, t.noPopularDecks)}
                        {tab === 'friends' && renderList(remote.friends, t.noFriendsDecks)}
                    </div>
                </>
            )}

            {previewDeck && (
                <DeckPreviewModal
                    deck={previewDeck}
                    onClose={() => setPreview(null)}
                    onPlay={deck => void handlePlay(deck)}
                    onEdit={deck => setEditor({ deck })}
                />
            )}
        </ModalShell>
    );
}
