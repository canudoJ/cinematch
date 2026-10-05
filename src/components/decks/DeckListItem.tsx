'use client';

import React from 'react';
import { Layers, Play } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Poster } from '@/components/ui/Poster';
import { TagChip } from '@/components/ui/TagChip';
import type { Deck } from '@/types';
import { buttonVariants } from '@/components/ui/Button';

const MAX_TAGS = 3;

/** Collage de portadas: 1 grande si hay menos de 4, cuadrícula 2×2 si hay 4 o más */
function DeckCover({ deck, label }: { deck: Deck; label: string }) {
    const covers = deck.movies.slice(0, 4);
    const grid = covers.length >= 4;
    return (
        <div
            role="img"
            aria-label={label}
            className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-[var(--background)] ${grid ? 'grid grid-cols-2 grid-rows-2' : ''}`}
        >
            {covers.length === 0 ? (
                <div className="flex h-full w-full items-center justify-center">
                    <Layers size={32} className="text-[var(--muted-foreground)]" aria-hidden />
                </div>
            ) : grid ? (
                covers.map(movie => (
                    <div key={movie.id} className="relative">
                        <Poster src={movie.image} alt="" sizes="48px" />
                    </div>
                ))
            ) : (
                <Poster src={covers[0].image} alt="" sizes="96px" />
            )}
        </div>
    );
}

interface DeckListItemProps {
    deck: Deck;
    onOpen: () => void;
    onPlay: () => void;
}

/** Fila de una baraja en los listados: abrir la vista previa o jugar directamente */
export function DeckListItem({ deck, onOpen, onPlay }: DeckListItemProps) {
    const { t } = useLanguage();
    return (
        <div className="relative flex min-h-[120px] min-w-0 gap-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-[var(--shadow-lg)] animate-fade-in">
            {/* Toda la fila abre la vista previa; el botón Jugar queda por encima */}
            <button type="button" onClick={onOpen} className="absolute inset-0 z-0" aria-label={`${t.contentList}: ${deck.title}`} />

            <DeckCover deck={deck} label={t.deckCover} />

            <div className="pointer-events-none relative flex min-w-0 flex-1 flex-col gap-1.5 overflow-hidden">
                <h3 className="line-clamp-2 font-display text-[1.1rem] font-bold leading-tight">{deck.title}</h3>
                {deck.tags.length > 0 && (
                    <div className="flex min-h-0 flex-1 flex-wrap content-start items-center gap-1 overflow-hidden">
                        {deck.tags.slice(0, MAX_TAGS).map(tag => (
                            <span key={tag} className="max-w-[130px]"><TagChip tag={tag} /></span>
                        ))}
                        {deck.tags.length > MAX_TAGS && (
                            <span className="text-xs text-[var(--muted-foreground)]">+{deck.tags.length - MAX_TAGS}</span>
                        )}
                    </div>
                )}
                <button
                    type="button"
                    onClick={onPlay}
                    className={`${buttonVariants({ size: 'sm' })} pointer-events-auto z-10 w-fit`}
                >
                    <Play size={14} className="shrink-0" fill="currentColor" aria-hidden /> {t.playGame}
                </button>
            </div>

            {deck.description && (
                <p className="text-caption pointer-events-none relative line-clamp-3 max-sm:hidden w-[125px] shrink-0 self-stretch border-l border-[var(--surface-border)] pl-2 leading-snug">
                    {deck.description}
                </p>
            )}
        </div>
    );
}
