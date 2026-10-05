'use client';

import React, { useId, useState } from 'react';
import { Check, Film, SlidersHorizontal, Tv } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import { ModalShell } from '@/components/ui/ModalShell';
import CloseButton from '@/components/ui/CloseButton';
import { ModalTitlePill } from '@/components/ui/ModalTitlePill';
import { Button } from '@/components/ui/Button';
import { PROVIDERS } from '@/lib/providers';
import { TMDB_GENRES } from '@/lib/constants';
import { genreName } from '@/lib/movies';
import type { ContentType } from '@/types';

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter(x => x !== item) : [...list, item]);

/** Casilla sin seleccionar: borde visible para que se distinga del fondo */
const idleOption = 'border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--foreground)] hover:border-[var(--muted-foreground)]';

/** Grupo de opciones con su título dentro del recuadro */
function OptionGroup({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
    const titleId = useId();
    return (
        <section role="group" aria-labelledby={titleId} className="rounded-2xl border border-[var(--surface-border)] p-4">
            <h3 id={titleId} className="font-display text-lg font-bold">{title}</h3>
            {hint && <p className="mt-1 text-sm text-[var(--muted-foreground)]">{hint}</p>}
            <div className="mt-3">{children}</div>
        </section>
    );
}

/**
 * Filtros del feed de descubrir: plataformas, tipo de contenido y géneros.
 * Se edita un borrador y se guarda al aplicar; mientras no se toca, refleja lo guardado.
 */
export default function PreferencesModal({ onClose }: { onClose: () => void }) {
    const { platforms, contentTypes, preferredGenres, updatePlatforms, updateContentTypes, updatePreferredGenres } = useUser();
    const { language, t } = useLanguage();
    const { showToast } = useToast();
    const titleId = useId();

    const [draftPlatforms, setDraftPlatforms] = useState<string[] | null>(null);
    const [draftTypes, setDraftTypes] = useState<ContentType[] | null>(null);
    const [draftGenres, setDraftGenres] = useState<string[] | null>(null);
    const selectedPlatforms = draftPlatforms ?? platforms;
    const selectedTypes = draftTypes ?? contentTypes;
    const selectedGenres = draftGenres ?? preferredGenres;
    const canApply = selectedPlatforms.length > 0 && selectedTypes.length > 0;

    const handleApply = () => {
        if (!canApply) {
            showToast(t.setupNeedsPlatform, 'error');
            return;
        }
        updatePlatforms(selectedPlatforms);
        updateContentTypes(selectedTypes);
        updatePreferredGenres(selectedGenres);
        showToast(t.preferencesSaved, 'success');
        onClose();
    };

    const typeOptions: { type: ContentType; label: string; icon: typeof Film; color: string }[] = [
        { type: 'movie', label: t.movies, icon: Film, color: 'var(--primary)' },
        { type: 'tv', label: t.tvShows, icon: Tv, color: 'var(--secondary)' },
    ];

    return (
        <ModalShell onClose={onClose} labelledBy={titleId} panelClassName="modal-surface relative w-full max-w-[600px]">
            <div className="absolute left-3 top-3 z-10">
                <CloseButton onClose={onClose} />
            </div>
            {/* Título y opciones se desplazan juntos: en pantallas bajas solo queda fijo el botón de aplicar */}
            <div className="custom-scrollbar -mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 pb-1">
                <div className="pt-8">
                    <ModalTitlePill id={titleId} title={t.filters} icon={SlidersHorizontal} accent="var(--secondary)" />
                    <p className="-mt-2 text-center text-sm text-[var(--muted-foreground)]">{t.selectEverything}</p>
                </div>
                <OptionGroup title={t.platformsLabel}>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {PROVIDERS.map(p => {
                            const selected = selectedPlatforms.includes(p.id);
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => setDraftPlatforms(toggle(selectedPlatforms, p.id))}
                                    className={`relative flex h-14 items-center justify-center rounded-xl border-2 px-2 text-sm font-bold transition-all ${selected ? '' : idleOption}`}
                                    style={selected
                                        ? { background: p.color, borderColor: p.color, color: p.textColor, boxShadow: `0 0 16px color-mix(in srgb, ${p.color} 25%, transparent)` }
                                        : undefined}
                                >
                                    {selected && <Check size={14} className="absolute right-2 top-2" aria-hidden />}
                                    {p.name}
                                </button>
                            );
                        })}
                    </div>
                </OptionGroup>

                <OptionGroup title={t.contentTypeLabel}>
                    <div className="flex gap-3">
                        {typeOptions.map(({ type, label, icon: Icon, color }) => {
                            const selected = selectedTypes.includes(type);
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => setDraftTypes(toggle(selectedTypes, type))}
                                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 py-3 font-semibold transition-all ${selected ? 'text-[var(--primary-foreground)]' : idleOption}`}
                                    style={selected ? { background: color, borderColor: color } : undefined}
                                >
                                    <Icon size={20} aria-hidden /> {label}
                                </button>
                            );
                        })}
                    </div>
                </OptionGroup>

                <OptionGroup title={t.genresOptional} hint={t.genresHint}>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2.5">
                        {TMDB_GENRES.map(genre => {
                            const id = String(genre.id);
                            const selected = selectedGenres.includes(id);
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => setDraftGenres(toggle(selectedGenres, id))}
                                    className={`rounded-xl border-2 px-2 py-2 text-center text-sm font-medium transition-all ${selected
                                        ? 'border-[var(--secondary)] bg-[var(--secondary)] text-[var(--secondary-foreground)]'
                                        : idleOption}`}
                                >
                                    {genreName(genre.id, language)}
                                </button>
                            );
                        })}
                    </div>
                </OptionGroup>
            </div>

            <div className="mt-4 border-t border-[var(--surface-border)] pt-4">
                <Button size="lg" onClick={handleApply} disabled={!canApply} className="w-full">
                    {t.applyFilters}
                </Button>
            </div>
        </ModalShell>
    );
}
