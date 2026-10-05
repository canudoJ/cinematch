'use client';

import React from 'react';
import { Copy, Film, Gamepad2, Plus, Tv, Infinity as InfinityIcon } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useDecks } from '@/context/DeckContext';
import { useToast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import type { Player, RouletteConfig } from '@/types';
import type { Translations } from '@/i18n/es';

interface RouletteWaitingRoomProps {
    code: string;
    players: Player[];
    currentUserId: string | null;
    isHost: boolean;
    config: RouletteConfig | null;
    starting: boolean;
    onInvite: () => void;
    onStart: () => void;
}

function sourceLabel(config: RouletteConfig, t: Translations, deckTitle?: string): string {
    switch (config.sourceType) {
        case 'trending': return t.sourceTrending;
        case 'surprise': return t.sourceSurprise;
        case 'deck': return deckTitle ?? t.sourceDeck;
        case 'genre': return t.sourceGenre;
    }
}

export function RouletteWaitingRoom({
    code, players, currentUserId, isHost, config, starting, onInvite, onStart,
}: RouletteWaitingRoomProps) {
    const { t } = useLanguage();
    const { decks } = useDecks();
    const { showToast } = useToast();
    const canStartTogether = players.length >= 2;

    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(code);
            showToast(t.codeCopied, 'success');
        } catch {
            showToast(t.copyFailed, 'error');
        }
    };

    const MediaIcon = config?.mediaType === 'tv' ? Tv : config?.mediaType === 'both' ? InfinityIcon : Film;
    const mediaLabel = config?.mediaType === 'tv' ? t.mediaSeries : config?.mediaType === 'both' ? t.mediaBoth : t.mediaMovies;
    const deckTitle = config?.sourceType === 'deck' ? decks.find(d => d.id === config.sourceValue)?.title : undefined;

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-5 py-6 text-center animate-fade-in">
            <div className="flex flex-col items-center gap-2">
                <h3 className="eyebrow tracking-[0.15em]">{t.roomCode}</h3>
                <button
                    type="button"
                    onClick={copyCode}
                    aria-label={`${t.copyCode}: ${code.split('').join(' ')}`}
                    className="flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[var(--primary-soft)] px-5 py-2.5 font-mono text-2xl font-bold tracking-[0.3em] text-[var(--primary)]"
                >
                    {code}
                    <Copy size={18} aria-hidden />
                </button>
                <p className="max-w-xs text-sm text-[var(--muted-foreground)]">{t.shareCodeHint}</p>
            </div>

            <ul className="flex max-w-md flex-wrap items-start justify-center gap-5" aria-label={t.playersCount(players.length)}>
                {players.map(player => (
                    <li key={player.id} className="flex w-20 flex-col items-center gap-2 animate-pop-in">
                        <Avatar src={player.avatar} name={player.name} size={64} ring={player.isHost} />
                        <span className="w-full truncate text-sm">
                            {player.id === currentUserId ? t.youLabel : player.name || '—'}
                        </span>
                        {player.isHost && <span className="text-xs font-bold uppercase text-[var(--secondary)]">{t.hostLabel}</span>}
                    </li>
                ))}
                {isHost && (
                    <li className="flex w-20 flex-col items-center gap-2 animate-pop-in">
                        <button
                            type="button"
                            onClick={onInvite}
                            aria-label={t.inviteFriendsTitle}
                            className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--primary),var(--accent-mid))] text-[var(--primary-foreground)] shadow-[0_0_18px_var(--primary-glow)] transition-transform hover:scale-105"
                        >
                            <Plus size={32} aria-hidden />
                        </button>
                        <span className="text-sm">{t.invite}</span>
                    </li>
                )}
            </ul>

            {config && (
                <div className="flex items-center gap-2 rounded-full bg-[var(--card)] px-5 py-2.5 text-sm text-[var(--muted-foreground)]">
                    <MediaIcon size={16} aria-hidden /> {mediaLabel} · {sourceLabel(config, t, deckTitle)}
                </div>
            )}

            {isHost ? (
                <div className="flex flex-col items-center gap-3">
                    <Button size="lg" className="min-w-[240px]" disabled={!canStartTogether} isLoading={starting && canStartTogether} onClick={onStart}>
                        {canStartTogether ? t.startGame : t.waitingForPlayers}
                    </Button>
                    {!canStartTogether && (
                        <Button variant="outline" isLoading={starting} onClick={onStart}>
                            <Gamepad2 size={18} aria-hidden /> {t.playSolo}
                        </Button>
                    )}
                </div>
            ) : (
                <p className="rounded-full bg-[var(--card)] px-6 py-3 text-[var(--muted-foreground)]">{t.waitingForHost}</p>
            )}
        </div>
    );
}
