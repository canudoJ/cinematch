'use client';

import React, { useId, useState } from 'react';
import { Film, Tv, Infinity as InfinityIcon, Flame, Dices, Ghost, Frown, Laugh, FolderOpen, Check, type LucideIcon } from 'lucide-react';
import { useDecks } from '@/context/DeckContext';
import { useLanguage } from '@/context/LanguageContext';
import { PROVIDERS } from '@/lib/providers';
import { ModalShell } from '@/components/ui/ModalShell';
import CloseButton from '@/components/ui/CloseButton';
import { Button } from '@/components/ui/Button';
import type { RouletteConfig, RouletteMediaType, RouletteSourceType } from '@/types';
import type { Translations } from '@/i18n/es';

interface RouletteSetupModalProps {
    onClose: () => void;
    onCreate: (config: RouletteConfig) => void;
    creating?: boolean;
}

interface SourceOption {
    id: string;
    type: RouletteSourceType;
    value: string;
    label: string;
    icon: LucideIcon;
}

/** Nota mínima para "Sorpréndeme": evita sorpresas desagradables */
const SURPRISE_MIN_RATING = 6;

function staticSources(t: Translations): SourceOption[] {
    return [
        { id: 'trending', type: 'trending', value: '', label: t.sourceTrending, icon: Flame },
        { id: 'surprise', type: 'surprise', value: '', label: t.surpriseMe, icon: Dices },
        { id: 'horror', type: 'genre', value: '27,53', label: t.genreHorror, icon: Ghost },
        { id: 'drama', type: 'genre', value: '18', label: t.genreDrama, icon: Frown },
        { id: 'comedy', type: 'genre', value: '35', label: t.genreComedy, icon: Laugh },
    ];
}

const MEDIA_OPTIONS: { value: RouletteMediaType; icon: LucideIcon; labelKey: 'mediaMovies' | 'mediaSeries' | 'mediaBoth' }[] = [
    { value: 'movie', icon: Film, labelKey: 'mediaMovies' },
    { value: 'tv', icon: Tv, labelKey: 'mediaSeries' },
    { value: 'both', icon: InfinityIcon, labelKey: 'mediaBoth' },
];

const sectionLabel = 'eyebrow mb-2.5';

export default function RouletteSetupModal({ onClose, onCreate, creating = false }: RouletteSetupModalProps) {
    const { t } = useLanguage();
    const { decks } = useDecks();
    const titleId = useId();

    const sources: SourceOption[] = [
        ...staticSources(t),
        ...decks.map(d => ({ id: d.id, type: 'deck' as const, value: d.id, label: d.title, icon: FolderOpen })),
    ];

    const [mediaType, setMediaType] = useState<RouletteMediaType>('movie');
    const [sourceId, setSourceId] = useState(sources[0].id);
    const [providers, setProviders] = useState<string[]>([]);

    const toggleProvider = (id: string) =>
        setProviders(prev => (prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]));

    const handleCreate = () => {
        const source = sources.find(s => s.id === sourceId) ?? sources[0];
        onCreate({
            mediaType,
            sourceType: source.type,
            sourceValue: source.value,
            providers, // vacío = todas las plataformas
            minRating: source.type === 'surprise' ? SURPRISE_MIN_RATING : 0,
        });
    };

    return (
        <ModalShell onClose={onClose} labelledBy={titleId} panelClassName="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[var(--surface-border)] bg-[var(--background)]">
            <div className="flex items-center justify-between border-b border-[var(--surface-border)] p-5">
                <h2 id={titleId} className="title-section text-[var(--secondary)]">{t.roomSetupTitle}</h2>
                <CloseButton onClose={onClose} />
            </div>

            <div className="flex flex-col gap-6 overflow-y-auto p-5">
                <fieldset>
                    <legend className={sectionLabel}>{t.formatLabel}</legend>
                    <div className="flex rounded-xl bg-[var(--surface-raised)] p-1">
                        {MEDIA_OPTIONS.map(option => {
                            const Icon = option.icon;
                            const selected = mediaType === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => setMediaType(option.value)}
                                    className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-1.5 py-2.5 text-[13px] font-bold transition-colors sm:px-2 sm:text-sm ${selected ? 'bg-[var(--secondary)] text-[var(--secondary-foreground)]' : 'text-[var(--muted-foreground)]'}`}
                                >
                                    <Icon size={18} className="hidden shrink-0 sm:block" aria-hidden /> {t[option.labelKey]}
                                </button>
                            );
                        })}
                    </div>
                </fieldset>

                <fieldset>
                    <legend className={sectionLabel}>{t.contentSourceLabel}</legend>
                    <div className="grid grid-cols-3 gap-2.5">
                        {sources.map(source => {
                            const Icon = source.icon;
                            const selected = sourceId === source.id;
                            return (
                                <button
                                    key={source.id}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => setSourceId(source.id)}
                                    className={`relative flex h-[92px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-2 text-center text-[13px] font-bold transition-colors sm:text-sm ${selected ? 'border-[var(--secondary)] bg-[var(--secondary)] text-[var(--secondary-foreground)]' : 'border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--foreground)]'}`}
                                >
                                    {selected && <Check size={14} className="absolute right-2 top-2" aria-hidden />}
                                    <Icon size={28} aria-hidden />
                                    <span className="line-clamp-2 leading-tight">{source.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </fieldset>

                <fieldset>
                    <legend className={sectionLabel}>{t.platformsLabel}</legend>
                    <div className="flex flex-wrap gap-2.5">
                        {PROVIDERS.map(p => {
                            const selected = providers.includes(p.id);
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => toggleProvider(p.id)}
                                    className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold transition-opacity"
                                    style={selected
                                        ? { background: p.color, color: p.textColor, borderColor: p.color }
                                        : { background: 'var(--surface-raised)', color: 'var(--foreground)', borderColor: 'var(--border-strong)' }}
                                >
                                    {selected && <Check size={14} aria-hidden />}
                                    {p.name}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-caption mt-2">{t.platformsAnyHint}</p>
                </fieldset>
            </div>

            <div className="border-t border-[var(--surface-border)] p-5">
                <Button size="lg" className="w-full" isLoading={creating} onClick={handleCreate}>
                    {t.createRoom}
                </Button>
            </div>
        </ModalShell>
    );
}
