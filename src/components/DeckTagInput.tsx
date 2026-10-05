'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { MAX_DECK_TAGS, SUGGESTED_TAGS, normalizeTag, type TagCategory } from '@/lib/constants';
import { TagChip, TagIcon } from '@/components/ui/TagChip';

interface DeckTagInputProps {
    tags: string[];
    onTagsChange: (tags: string[]) => void;
}

/** Campo de etiquetas con sugerencias (máximo MAX_DECK_TAGS) */
export default function DeckTagInput({ tags, onTagsChange }: DeckTagInputProps) {
    const { t } = useLanguage();
    const inputId = useId();
    const listId = useId();
    const [inputValue, setInputValue] = useState('');
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const full = tags.length >= MAX_DECK_TAGS;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const addTag = (raw: string) => {
        const tag = normalizeTag(raw);
        // Un campo vacío (Enter o coma sin texto) no añade nada
        if (!tag || full || tags.some(t2 => t2.toLowerCase() === tag.toLowerCase())) return;
        onTagsChange([...tags, tag]);
        setInputValue('');
        setOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            onTagsChange(tags.slice(0, -1));
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    const query = inputValue.trim().toLowerCase();
    const groups = (Object.entries(SUGGESTED_TAGS) as [TagCategory, readonly string[]][])
        .map(([category, items]) => [category, items.filter(item => item.toLowerCase().includes(query) && !tags.includes(item))] as const)
        .filter(([, items]) => items.length > 0);

    return (
        <div ref={containerRef} className="relative mb-4">
            <label htmlFor={inputId} className="eyebrow mb-1.5">
                {t.tagsLabel}
            </label>
            <div
                className="deck-tag-input-container flex min-h-[42px] cursor-text flex-wrap items-center gap-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] p-2"
                onClick={() => inputRef.current?.focus()}
            >
                {tags.map(tag => (
                    <TagChip key={tag} tag={tag} size="md" removeLabel={t.removeTag} onRemove={() => onTagsChange(tags.filter(x => x !== tag))} />
                ))}
                <input
                    id={inputId}
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-expanded={open && !full && groups.length > 0}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    className="deck-tag-input-field min-h-[26px] min-w-[60px] flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
                    value={inputValue}
                    onChange={e => { setInputValue(e.target.value); setOpen(true); }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setOpen(true)}
                    placeholder={tags.length === 0 ? t.tagsPlaceholder : ''}
                    disabled={full}
                />
            </div>

            {open && !full && groups.length > 0 && (
                <ul
                    id={listId}
                    role="listbox"
                    className="absolute inset-x-0 top-full z-dropdown mt-1.5 max-h-[200px] overflow-y-auto rounded-lg border border-[var(--surface-border)] bg-[var(--card)] shadow-[var(--shadow-lg)]"
                >
                    {groups.map(([category, items]) => (
                        <li key={category} role="presentation">
                            <div className="bg-[var(--surface-raised)] px-3 py-2 text-xs font-bold uppercase text-[var(--muted-foreground)]">
                                {t[`tagCategory_${category}`]}
                            </div>
                            <ul role="group">
                                {items.map(item => (
                                        <li
                                            key={item}
                                            role="option"
                                            aria-selected={false}
                                            tabIndex={-1}
                                            onMouseDown={e => e.preventDefault()}
                                            onClick={() => addTag(item)}
                                            className="flex cursor-pointer items-center gap-2 border-b border-[var(--surface-border)] px-3 py-2 text-sm hover:bg-[var(--surface-raised)]"
                                        >
                                            <TagIcon tag={item} size={16} className="shrink-0 text-[var(--primary)]" />
                                            {item}
                                        </li>
                                ))}
                            </ul>
                        </li>
                    ))}
                </ul>
            )}
            {full && <p className="mt-1 text-xs text-[var(--destructive)]">{t.maxTagsReached(MAX_DECK_TAGS)}</p>}
        </div>
    );
}
