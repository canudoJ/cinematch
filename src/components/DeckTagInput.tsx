import React, { useState, useRef, useEffect } from 'react';
import { TAG_WARM_BG, getTagIcon, getTagLabel } from '@/lib/constants';

interface DeckTagInputProps {
    tags: string[];
    onTagsChange: (tags: string[]) => void;
    placeholder?: string;
}

const SUGGESTED_TAGS: Record<string, string[]> = {
    Moods: ['Chill', 'Risas', 'Llorar', 'Tensión', 'Mind-bending'],
    Occasions: ['Cita', 'Amigos', 'Domingo', 'Maratón'],
    Genres: ['Terror', 'Sci-Fi', 'Fantasía', 'Anime', 'Clásicos']
};

export default function DeckTagInput({ tags, onTagsChange, placeholder = "Add tags (e.g. Chill, Sci-Fi)..." }: DeckTagInputProps) {
    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const addTag = (tag: string) => {
        if (tags.length >= 5) return;

        let formattedTag = tag.trim();
        // Normalizar: si coincide con un tag conocido, usar su nombre canónico (sin emoji)
        const allSuggestions = Object.values(SUGGESTED_TAGS).flat();
        const match = allSuggestions.find(s => s.toLowerCase().includes(formattedTag.replace(/[\p{Emoji}\p{Symbol}]/gu, '').trim().toLowerCase()));
        if (match) {
            formattedTag = match;
        } else {
            formattedTag = formattedTag.replace(/[\p{Emoji}\p{Symbol}]/gu, '').trim();
        }

        if (formattedTag && !tags.includes(formattedTag)) {
            onTagsChange([...tags, formattedTag]);
        }
        setInputValue('');
        setShowSuggestions(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            onTagsChange(tags.slice(0, -1));
        }
    };

    const removeTag = (indexToRemove: number) => {
        onTagsChange(tags.filter((_, index) => index !== indexToRemove));
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', marginBottom: '15px' }}>
            <div
                className="deck-tag-input-container"
                onClick={() => inputRef.current?.focus()}
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    padding: '8px',
                    background: '#333',
                    borderRadius: '8px',
                    minHeight: '42px',
                    border: '1px solid #444',
                    cursor: 'text'
                }}
            >
                {tags.map((tag, index) => {
                    const Icon = getTagIcon(tag);
                    const label = getTagLabel(tag);
                    return (
                    <span key={index} style={{
                        background: TAG_WARM_BG,
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.8rem',
                        userSelect: 'none'
                    }}>
                        <Icon size={14} style={{ flexShrink: 0 }} aria-hidden />
                        {label}
                        <button
                            onClick={(e) => { e.stopPropagation(); removeTag(index); }}
                            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, fontSize: '1rem', lineHeight: 1 }}
                        >
                            ×
                        </button>
                    </span>
                );})}

                <input
                    ref={inputRef}
                    type="text"
                    className="deck-tag-input-field"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder={tags.length === 0 ? placeholder : ''}
                    disabled={tags.length >= 5}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        flex: 1,
                        minWidth: '60px',
                        minHeight: '26px',
                        outline: 'none',
                        fontSize: '0.9rem',
                        cursor: 'text'
                    }}
                />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && (tags.length < 5) && (
                <div style={{
                    position: 'absolute',
                    top: '100%', left: 0, right: 0,
                    background: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '8px',
                    marginTop: '5px',
                    zIndex: 200,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                }}>
                    {Object.entries(SUGGESTED_TAGS).map(([category, items]) => {
                        const filteredItems = items.filter(item =>
                            item.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(item)
                        );

                        if (filteredItems.length === 0) return null;

                        return (
                            <div key={category}>
                                <div style={{ padding: '8px 12px', fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 'bold', background: '#222' }}>
                                    {category}
                                </div>
                                {filteredItems.map(item => {
                                    const ItemIcon = getTagIcon(item);
                                    return (
                                    <div
                                        key={item}
                                        onClick={() => addTag(item)}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem',
                                            color: '#ddd',
                                            borderBottom: '1px solid #333',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#333'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <ItemIcon size={16} style={{ flexShrink: 0, color: 'var(--primary)' }} aria-hidden />
                                        {item}
                                    </div>
                                );})}
                            </div>
                        );
                    })}
                </div>
            )}
            {tags.length >= 5 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--destructive)', marginTop: '4px' }}>
                    Max 5 tags allowed.
                </div>
            )}
        </div>
    );
}
