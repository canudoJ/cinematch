'use client';

import React, { useId, useState } from 'react';
import { Check, Search, Trash2, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useDecks } from '@/context/DeckContext';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Poster } from '@/components/ui/Poster';
import { Spinner } from '@/components/ui/Spinner';
import { searchContent } from '@/services/tmdb';
import { tmdbItemToMovie } from '@/lib/movies';
import { toTmdbLang } from '@/lib/region';
import DeckTagInput from '../DeckTagInput';
import type { ContentType, Deck, Movie, Privacy } from '@/types';

const MAX_TITLE = 100;

interface DeckEditorProps {
    /** Baraja a editar (con sus películas cargadas); sin ella, se crea una nueva */
    deck?: Deck | null;
    onDone: (savedDeckId?: string) => void;
    onCancel: () => void;
}

const fieldLabel = 'eyebrow';
const selectClass = 'field-select';

export function DeckEditor({ deck, onDone, onCancel }: DeckEditorProps) {
    const { t, language } = useLanguage();
    const { saveDeck, deleteDeck } = useDecks();
    const { showToast } = useToast();
    const confirm = useConfirm();
    const ids = { title: useId(), desc: useId(), privacy: useId(), type: useId(), search: useId(), heading: useId() };

    const [title, setTitle] = useState(deck?.title ?? '');
    const [description, setDescription] = useState(deck?.description ?? '');
    const [tags, setTags] = useState<string[]>(deck?.tags ?? []);
    const [privacy, setPrivacy] = useState<Privacy>(deck?.privacy ?? 'private');
    const [selected, setSelected] = useState<Movie[]>(deck?.movies ?? []);
    const [searchType, setSearchType] = useState<ContentType>('movie');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Movie[] | null>(null);
    const [searching, setSearching] = useState(false);
    const [saving, setSaving] = useState(false);

    const canSave = title.trim().length > 0 && title.length <= MAX_TITLE && selected.length > 0;

    const handleSearch = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!query.trim()) return;
        setSearching(true);
        try {
            const items = await searchContent(query, searchType, toTmdbLang(language));
            setResults(items.map(item => tmdbItemToMovie(item, searchType, language)));
        } finally {
            setSearching(false);
        }
    };

    const toggle = (movie: Movie) =>
        setSelected(prev => (prev.some(m => m.id === movie.id) ? prev.filter(m => m.id !== movie.id) : [...prev, movie]));

    const handleSave = async () => {
        if (!canSave) {
            showToast(title.length > MAX_TITLE ? t.deckTitleTooLong : t.deckNeedsTitleAndMovies, 'error');
            return;
        }
        setSaving(true);
        const ok = await saveDeck({
            id: deck?.id,
            title,
            description,
            tags,
            privacy,
            items: selected.map(m => ({ id: m.id, type: m.type })),
        });
        setSaving(false);
        showToast(ok ? t.deckSaved : t.genericError, ok ? 'success' : 'error');
        if (ok) onDone(deck?.id);
    };

    const handleDelete = async () => {
        if (!deck) return;
        if (!(await confirm({ title: t.deleteDeck, message: t.deleteConfirm, destructive: true, confirmLabel: t.deleteDeck }))) return;
        const ok = await deleteDeck(deck.id);
        showToast(ok ? t.deckDeleted : t.genericError, ok ? 'success' : 'error');
        if (ok) onDone();
    };

    return (
        <>
            <h2 id={ids.heading} className="title-section mb-4 text-center">{deck ? t.editDeckTitle : t.createDeck}</h2>

            <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-2">
                <div>
                    <label htmlFor={ids.title} className={fieldLabel}>{t.deckTitle}</label>
                    <Input id={ids.title} value={title} onChange={e => setTitle(e.target.value)} maxLength={MAX_TITLE} />
                </div>
                <div>
                    <label htmlFor={ids.desc} className={fieldLabel}>{t.deckDesc}</label>
                    <Input id={ids.desc} value={description} onChange={e => setDescription(e.target.value)} />
                </div>

                <DeckTagInput tags={tags} onTagsChange={setTags} />

                <div>
                    <label htmlFor={ids.privacy} className={fieldLabel}>{t.privacyLevel}</label>
                    <select id={ids.privacy} value={privacy} onChange={e => setPrivacy(e.target.value as Privacy)} className={`${selectClass} w-full`}>
                        <option value="private">{t.privacyPrivate}</option>
                        <option value="friends">{t.privacyFriends}</option>
                        <option value="public">{t.privacyPublic}</option>
                    </select>
                    <p className="text-caption mt-1 italic">{t.privacyDescription}</p>
                </div>

                <form onSubmit={handleSearch} className="border-t border-[var(--border)] pt-4">
                    <label htmlFor={ids.search} className={fieldLabel}>{t.searchTitlesLabel}</label>
                    <div className="flex flex-wrap gap-2.5">
                        <select
                            aria-label={t.mediaTypeLabel}
                            value={searchType}
                            onChange={e => setSearchType(e.target.value as ContentType)}
                            className={`${selectClass} shrink-0`}
                        >
                            <option value="movie">{t.movies}</option>
                            <option value="tv">{t.tvShows}</option>
                        </select>
                        <Input id={ids.search} value={query} onChange={e => setQuery(e.target.value)} placeholder={t.searchAdd} className="min-w-[160px] flex-1" />
                        <Button type="submit" variant="default" isLoading={searching}>
                            <Search size={16} aria-hidden /> {t.search}
                        </Button>
                    </div>
                </form>

                {searching ? (
                    <Spinner label={t.searching} size={24} />
                ) : results && results.length === 0 ? (
                    <p className="text-center text-sm text-[var(--muted-foreground)]">{t.noSearchResults}</p>
                ) : results ? (
                    <ul className="grid max-h-[220px] grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2.5 overflow-y-auto">
                        {results.map(movie => {
                            const isSelected = selected.some(m => m.id === movie.id);
                            return (
                                <li key={movie.id}>
                                    <button
                                        type="button"
                                        role="checkbox"
                                        aria-checked={isSelected}
                                        aria-label={movie.title}
                                        onClick={() => toggle(movie)}
                                        className={`relative block aspect-[2/3] w-full overflow-hidden rounded-lg border-2 ${isSelected ? 'border-[var(--accent-mid)]' : 'border-transparent'}`}
                                    >
                                        <Poster src={movie.image} alt="" sizes="80px" />
                                        {isSelected && (
                                            <span className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--accent-mid)_35%,transparent)]">
                                                <Check size={32} strokeWidth={3} className="text-[var(--on-media)]" aria-hidden />
                                            </span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                ) : null}

                <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-2.5">
                    <h3 className="eyebrow mb-2.5">{t.selectedItems} ({selected.length})</h3>
                    {selected.length === 0 ? (
                        <p className="text-caption italic">{t.noItemsSelected}</p>
                    ) : (
                        <ul className="flex gap-2.5 overflow-x-auto pb-1 pt-2">
                            {selected.map(m => (
                                <li key={m.id} className="relative aspect-[2/3] w-[50px] shrink-0">
                                    <span className="relative block h-full w-full overflow-hidden rounded">
                                        <Poster src={m.image} alt="" sizes="50px" />
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => toggle(m)}
                                        aria-label={t.removeSelected(m.title)}
                                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--destructive)] text-[var(--on-media)]"
                                    >
                                        <X size={12} aria-hidden />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {deck && (
                    <Button variant="danger" className="w-full" onClick={() => void handleDelete()}>
                        <Trash2 size={18} aria-hidden /> {t.deleteDeck}
                    </Button>
                )}
            </div>

            {/* Acciones fuera del scroll: siempre visibles */}
            <div className="mt-4 flex gap-2.5 border-t border-[var(--surface-border)] pt-4">
                <Button variant="outline" size="lg" className="flex-1" onClick={onCancel}>{t.cancel}</Button>
                <Button
                    size="lg"
                    variant="default"
                    className="flex-1"
                    disabled={!canSave}
                    isLoading={saving}
                    onClick={() => void handleSave()}
                >
                    {saving ? t.saving : deck ? t.save : t.createDeck}
                </Button>
            </div>
        </>
    );
}
