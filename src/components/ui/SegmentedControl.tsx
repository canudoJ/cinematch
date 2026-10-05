'use client';

import React from 'react';

interface SegmentedControlProps<T extends string> {
    label: string;
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
}

/** Selector de una opción entre varias (idioma, tema…), accesible como grupo de radio */
export function SegmentedControl<T extends string>({ label, value, options, onChange }: SegmentedControlProps<T>) {
    return (
        <div role="radiogroup" aria-label={label} className="flex gap-3">
            {options.map(option => {
                const checked = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        onClick={() => onChange(option.value)}
                        className={`flex-1 rounded-xl border py-2 text-sm font-bold transition-colors ${checked
                            ? 'border-[var(--secondary)] bg-[var(--secondary)] text-[var(--secondary-foreground)]'
                            : 'border-[var(--border-strong)] bg-[var(--background)] text-[var(--foreground)]'}`}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
