'use client';

import React, { useRef } from 'react';

export interface TabItem<T extends string> {
    id: T;
    label: React.ReactNode;
}

interface TabsProps<T extends string> {
    items: TabItem<T>[];
    value: T;
    onChange: (id: T) => void;
    /** Nombre accesible del grupo de pestañas */
    label: string;
    /** Color de la pestaña activa (token CSS) */
    accent?: string;
    className?: string;
}

/**
 * Pestañas / control segmentado accesible: role="tablist", aria-selected
 * y navegación con flechas, Inicio y Fin.
 */
export function Tabs<T extends string>({
    items, value, onChange, label, accent = 'var(--secondary)', className = '',
}: TabsProps<T>) {
    const refs = useRef<(HTMLButtonElement | null)[]>([]);

    const focusTab = (index: number) => {
        const next = (index + items.length) % items.length;
        refs.current[next]?.focus();
        onChange(items[next].id);
    };

    return (
        <div role="tablist" aria-label={label} className={`flex gap-1.5 sm:gap-2 ${className}`}>
            {items.map((item, index) => {
                const selected = item.id === value;
                return (
                    <button
                        key={item.id}
                        ref={el => { refs.current[index] = el; }}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        tabIndex={selected ? 0 : -1}
                        onClick={() => onChange(item.id)}
                        onKeyDown={e => {
                            if (e.key === 'ArrowRight') { e.preventDefault(); focusTab(index + 1); }
                            if (e.key === 'ArrowLeft') { e.preventDefault(); focusTab(index - 1); }
                            if (e.key === 'Home') { e.preventDefault(); focusTab(0); }
                            if (e.key === 'End') { e.preventDefault(); focusTab(items.length - 1); }
                        }}
                        className="flex min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-1.5 py-2.5 text-[13px] font-bold transition-colors sm:px-3 sm:text-sm"
                        style={selected
                            ? { background: accent, borderColor: accent, color: 'var(--background)' }
                            : { background: 'var(--card)', borderColor: 'var(--border-strong)', color: 'var(--foreground)' }}
                    >
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
}
