'use client';

import React, { useEffect, useId, useState } from 'react';
import { Star, Link2, Play, Pencil } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthProvider';
import { useDecks } from '@/context/DeckContext';
import { useToast } from '@/components/ui/Toast';
import { ModalShell } from '@/components/ui/ModalShell';
import CloseButton from '@/components/ui/CloseButton';
import { Avatar } from '@/components/ui/Avatar';
import { Poster } from '@/components/ui/Poster';
import { TagChip } from '@/components/ui/TagChip';
import { Spinner } from '@/components/ui/Spinner';
import { formatYear } from '@/lib/movies';
import MovieDetailsModal from './MovieDetailsModal';
import type { Deck, Movie } from '@/types';
import { Button } from '@/components/ui/Button';
import { iconButtonClass } from '@/components/ui/iconButton';

interface DeckPreviewModalProps {
    deck: Deck;
    onClose: () => void;
    /** Recibe la baraja con todas sus películas cargadas */
    onPlay: (deck: Deck) => void;
    /** Solo para el creador de la baraja */
    onEdit?: (deck: Deck) => void;
}

export default function DeckPreviewModal({ deck, onClose, onPlay, onEdit }: DeckPreviewModalProps) {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { hydrateDeck } = useDecks();
    const { showToast } = useToast();
    const titleId = useId();
    const [fullDeck, setFullDeck] = useState<Deck | null>(deck.moviesLoaded ? deck : null);
    const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);

    useEffect(() => {
        if (deck.moviesLoaded) return;
        let cancelled = false;
        void hydrateDeck(deck).then(full => {
            if (!cancelled) setFullDeck(full);
        });
        return () => {
            cancelled = true;
        };
    }, [deck, hydrateDeck]);

    const movies = fullDeck?.movies ?? deck.movies;
    const isOwner = !!user && deck.creatorId === user.id;

    const handleShare = async () => {
        if (deck.privacy === 'private') {
            showToast(t.privateDeckNoShare, 'info');
            return;
        }
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/deck/${deck.id}`);
            showToast(t.deckLinkCopied, 'success');
        } catch {
            showToast(t.copyFailed, 'error');
        }
    };

    return (
        <ModalShell
            onClose={onClose}
            labelledBy={titleId}
            layer="modal-nested"
            panelClassName="relative flex h-full w-full flex-col overflow-hidden bg-[var(--background)]"
        >
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pb-5">
                <div className="relative flex min-h-[300px] items-end">
                    {movies[0]?.image && (
                        <div className="absolute inset-0 overflow-hidden" aria-hidden>
                            <Poster src={movies[0].image} alt="" sizes="100vw" className="scale-110 blur-[32px] brightness-[0.25]" />
                        </div>
                    )}
                    <div className="relative z-10 mx-auto w-full max-w-[800px] px-6 pb-5 pt-16 text-[var(--on-media)]">
                        <div className="absolute left-5 top-5 z-10">
                            <CloseButton onClose={onClose} />
                        </div>
                        <h2 id={titleId} className="inline-block border-b-[1.5px] border-[var(--primary)] pb-0.5 font-display text-[2.5rem] font-extrabold leading-tight tracking-tight [text-shadow:0_2px_10px_rgba(0,0,0,0.5)]">
                            {deck.title}
                        </h2>
                        {deck.description && (
                            <p className="mt-2.5 max-h-[120px] max-w-[75%] overflow-y-auto break-words text-[0.95rem] leading-snug opacity-80">
                                {deck.description}
                            </p>
                        )}
                        {deck.tags.length > 0 && (
                            <div className="mb-1 mt-2.5 flex flex-wrap gap-2">
                                {deck.tags.map(tag => <TagChip key={tag} tag={tag} on="media" />)}
                            </div>
                        )}
                        <div className="mt-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Avatar src={deck.creatorAvatar} name={deck.creatorName} size={30} />
                                <span className="font-bold">{deck.creatorName || t.unknownUser}</span>
                            </div>
                            <span className="text-[0.95rem] font-semibold opacity-80">
                                {deck.items.length} {t.movieCount(deck.items.length)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mx-auto max-w-[800px] p-5">
                    <h3 className="title-section mb-5 border-b border-[var(--surface-border)] pb-2.5">{t.contentList}</h3>
                    {!fullDeck && <Spinner label={t.loadingDeck} className="py-6" />}
                    <ul className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                        {movies.map(movie => (
                            <li key={movie.id}>
                                <button
                                    type="button"
                                    onClick={() => setDetailsMovie(movie)}
                                    className="flex w-full gap-4 rounded-xl border border-[var(--surface-border)] bg-[var(--card)] p-2.5 text-left transition-colors hover:border-[var(--accent-mid)]"
                                >
                                    <span className="relative aspect-[2/3] w-[50px] shrink-0 overflow-hidden rounded-lg">
                                        <Poster src={movie.image} alt="" sizes="50px" />
                                    </span>
                                    <span className="flex flex-1 flex-col justify-center">
                                        <span className="mb-1 font-semibold">{movie.title}</span>
                                        <span className="text-caption flex gap-2.5">
                                            <span>{formatYear(movie.year)}</span>
                                            <span className="inline-flex items-center gap-0.5 text-[var(--accent-mid)]">
                                                <Star size={13} fill="currentColor" aria-hidden /> {movie.rating.toFixed(1)}
                                            </span>
                                        </span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="flex shrink-0 justify-center gap-4 border-t border-[var(--surface-border)] bg-[var(--background)] px-5 py-4">
                <Button
                    size="lg"
                    disabled={!fullDeck || fullDeck.movies.length === 0}
                    onClick={() => fullDeck && onPlay(fullDeck)}
                    className="max-w-[300px] flex-1"
                >
                    <Play size={22} fill="currentColor" aria-hidden /> {t.playGame}
                </Button>
                <button
                    type="button"
                    onClick={() => void handleShare()}
                    aria-label={t.shareDeckLink}
                    className={`${iconButtonClass} h-12 w-12 sm:h-14 sm:w-14`}
                >
                    <Link2 size={24} aria-hidden />
                </button>
                {/* Solo con la baraja completa: editar una parcial borraría títulos al guardar */}
                {onEdit && isOwner && fullDeck && (
                    <button
                        type="button"
                        onClick={() => { onEdit(fullDeck); onClose(); }}
                        aria-label={t.editDeck}
                        className={`${iconButtonClass} h-12 w-12 sm:h-14 sm:w-14`}
                    >
                        <Pencil size={22} aria-hidden />
                    </button>
                )}
            </div>

            {detailsMovie && <MovieDetailsModal movie={detailsMovie} onClose={() => setDetailsMovie(null)} />}
        </ModalShell>
    );
}
