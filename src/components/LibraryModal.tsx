'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';
import { ChevronDown, Film, SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useUser } from '@/context/UserContext';
import { ModalShell } from '@/components/ui/ModalShell';
import CloseButton from '@/components/ui/CloseButton';
import { ModalTitlePill } from '@/components/ui/ModalTitlePill';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Poster } from '@/components/ui/Poster';
import { PROVIDERS } from '@/lib/providers';
import { getUserRegion } from '@/lib/region';
import { filterLibrary, sortLibrary, type LibrarySort } from '@/lib/library';
import { withWatchInfo } from '@/services/tmdb';
import MovieDetailsModal from './MovieDetailsModal';
import type { ContentType, LibraryMovie } from '@/types';
import { MODES } from '@/lib/modes';

/** Títulos cuyas plataformas ya se han buscado en esta sesión (aunque no tuvieran ninguna) */
const enrichAttempted = new Set<string>();

const fieldLabel = 'eyebrow';
const selectClass = 'field-select w-full';

export default function LibraryModal({ onClose }: { onClose: () => void }) {
    const { t, language } = useLanguage();
    const { likedContent, removeLike, updateLike, platforms } = useUser();
    const titleId = useId();
    const ids = { search: useId(), type: useId(), sort: useId(), filters: useId() };

    const [selected, setSelected] = useState<LibraryMovie | null>(null);
    const [query, setQuery] = useState('');
    const [type, setType] = useState<ContentType | 'all'>('all');
    const [platformFilter, setPlatformFilter] = useState<string[]>([]);
    const [sort, setSort] = useState<LibrarySort>('liked');
    const [showFilters, setShowFilters] = useState(false);

    // Completa las plataformas de los títulos guardados sin ellas (una vez por título y sesión)
    useEffect(() => {
        const pending = likedContent.filter(m => !m.providers?.length && !enrichAttempted.has(m.id));
        if (pending.length === 0) return;
        pending.forEach(m => enrichAttempted.add(m.id));
        let cancelled = false;
        const region = getUserRegion();
        void (async () => {
            for (const movie of pending) {
                if (cancelled) return;
                const enriched = await withWatchInfo(movie, region, platforms);
                if (!cancelled && enriched.providers?.length) await updateLike(enriched);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [likedContent, platforms, updateLike]);

    const visible = useMemo(
        () => sortLibrary(filterLibrary(likedContent, { query, type, platforms: platformFilter }), sort, language),
        [likedContent, query, type, platformFilter, sort, language],
    );

    const togglePlatform = (name: string) =>
        setPlatformFilter(prev => (prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]));

    return (
        <ModalShell onClose={onClose} labelledBy={titleId} panelClassName="modal-surface relative w-full max-w-[600px]">
            <div className="absolute left-3 top-3 z-10">
                <CloseButton onClose={onClose} />
            </div>
            <div className="pt-8">
                <ModalTitlePill id={titleId} title={t.library} icon={MODES.library.icon} accent={MODES.library.accent} />
            </div>

            <div className="mb-3 flex gap-2.5">
                <label htmlFor={ids.search} className="sr-only">{t.searchLibrary}</label>
                <Input id={ids.search} type="search" placeholder={t.searchTitlePlaceholder} value={query} onChange={e => setQuery(e.target.value)} className="flex-1" />
                <Button
                    variant="outline"
                    aria-expanded={showFilters}
                    aria-controls={ids.filters}
                    onClick={() => setShowFilters(open => !open)}
                    className="h-11 shrink-0"
                >
                    <SlidersHorizontal size={16} aria-hidden /> {t.filters}
                    <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} aria-hidden />
                </Button>
            </div>

            {showFilters && (
                <div id={ids.filters} className="mb-4 flex flex-col gap-4 rounded-xl border border-[var(--secondary)] bg-[var(--card)] p-3 animate-fade-in">
                    <fieldset>
                        <legend className={fieldLabel}>{t.platform}</legend>
                        <div className="flex flex-wrap gap-1.5">
                            {PROVIDERS.map(p => {
                                const active = platformFilter.includes(p.name);
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => togglePlatform(p.name)}
                                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${active ? 'border-[var(--secondary)] bg-[var(--secondary-soft)] font-bold text-[var(--secondary)]' : 'border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--foreground)]'}`}
                                    >
                                        {p.name}
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor={ids.type} className={fieldLabel}>{t.contentTypeLabel}</label>
                            <select id={ids.type} value={type} onChange={e => setType(e.target.value as ContentType | 'all')} className={selectClass}>
                                <option value="all">{t.all}</option>
                                <option value="movie">{t.movies}</option>
                                <option value="tv">{t.tvShows}</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor={ids.sort} className={fieldLabel}>{t.sortBy}</label>
                            <select id={ids.sort} value={sort} onChange={e => setSort(e.target.value as LibrarySort)} className={selectClass}>
                                <option value="liked">{t.sortLiked}</option>
                                <option value="alpha">{t.sortAlpha}</option>
                                <option value="year">{t.sortYear}</option>
                            </select>
                        </div>
                    </div>
                    {(platformFilter.length > 0 || type !== 'all') && (
                        <button type="button" onClick={() => { setPlatformFilter([]); setType('all'); }} className="text-caption self-start underline">
                            {t.clearFilters}
                        </button>
                    )}
                </div>
            )}

            {visible.length === 0 ? (
                likedContent.length === 0 ? (
                    <EmptyState
                        icon={Film}
                        title={t.noLikesYet}
                        hint={t.startSwiping}
                        action={<Button onClick={onClose}>{t.goSwiping}</Button>}
                    />
                ) : (
                    <EmptyState icon={Film} title={t.noMatches} hint={t.tryOtherSearch} />
                )
            ) : (
                <ul className="custom-scrollbar grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto pr-1 sm:grid-cols-3 sm:gap-4">
                    {visible.map(movie => (
                        <li key={movie.id}>
                            <button type="button" onClick={() => setSelected(movie)} className="library-card block w-full text-left">
                                <span className="library-card-inner block">
                                    <Poster src={movie.image} alt="" sizes="(max-width: 640px) 45vw, 180px" />
                                    <span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-[linear-gradient(transparent,black)] px-2 pb-2.5 pt-1.5 text-sm leading-tight text-[var(--on-media)] [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
                                        {movie.title}
                                    </span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {selected && (
                <MovieDetailsModal
                    movie={selected}
                    onClose={() => setSelected(null)}
                    onRemove={() => {
                        void removeLike(selected.id);
                        setSelected(null);
                    }}
                />
            )}
        </ModalShell>
    );
}
