import React, { createElement } from 'react';
import type { LucideProps } from 'lucide-react';
import { getTagIcon, getTagLabel } from '@/lib/constants';

/** Icono de un tag (componente estable: el icono concreto sale de una tabla fija) */
export function TagIcon({ tag, ...props }: { tag: string } & LucideProps) {
    return createElement(getTagIcon(tag), { 'aria-hidden': true, ...props });
}

interface TagChipProps {
    tag: string;
    size?: 'sm' | 'md';
    /** 'media': sobre una imagen oscurecida · 'surface': sobre el fondo del tema */
    on?: 'media' | 'surface';
    /** Botón para quitar el tag (con su etiqueta accesible) */
    onRemove?: () => void;
    removeLabel?: string;
}

/** Etiqueta de baraja con su icono: misma píldora que los géneros, en el violeta de las barajas */
export function TagChip({ tag, size = 'sm', on = 'surface', onRemove, removeLabel }: TagChipProps) {
    const label = getTagLabel(tag);
    const textColor = on === 'media'
        ? 'color-mix(in srgb, var(--accent-mid) 55%, var(--on-media))'
        : 'color-mix(in srgb, var(--accent-mid) 70%, var(--foreground))';
    return (
        <span
            className={`inline-flex max-w-full select-none items-center gap-1.5 rounded-full border font-semibold ${size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`}
            style={{
                color: textColor,
                borderColor: 'color-mix(in srgb, var(--accent-mid) 50%, transparent)',
                background: 'color-mix(in srgb, var(--accent-mid) 16%, transparent)',
            }}
        >
            <TagIcon tag={tag} size={size === 'sm' ? 12 : 14} className="shrink-0" />
            <span className="truncate">{label}</span>
            {onRemove && (
                <button
                    type="button"
                    onClick={e => { e.stopPropagation(); onRemove(); }}
                    aria-label={removeLabel ? `${removeLabel}: ${label}` : label}
                    className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full leading-none hover:bg-[var(--surface-raised)]"
                >
                    ×
                </button>
            )}
        </span>
    );
}
