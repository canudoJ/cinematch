import React from 'react';
import { genreAccent } from '@/lib/genreColors';

interface GenreChipProps {
    genre: string;
    /** 'media': sobre un póster oscurecido · 'surface': sobre el fondo del tema (claro u oscuro) */
    on?: 'media' | 'surface';
    size?: 'sm' | 'md';
}

/** Etiqueta de género con su color propio (el mismo en toda la app) */
export function GenreChip({ genre, on = 'surface', size = 'sm' }: GenreChipProps) {
    const accent = genreAccent(genre);
    const style: React.CSSProperties = on === 'media'
        ? {
            color: `color-mix(in srgb, ${accent} 70%, var(--on-media))`,
            borderColor: `color-mix(in srgb, ${accent} 60%, transparent)`,
            background: `color-mix(in srgb, ${accent} 18%, color-mix(in srgb, var(--media-bg) 40%, transparent))`,
        }
        : {
            // Mezclado con el color de texto: legible tanto en tema claro como oscuro
            color: `color-mix(in srgb, ${accent} 65%, var(--foreground))`,
            borderColor: `color-mix(in srgb, ${accent} 45%, transparent)`,
            background: `color-mix(in srgb, ${accent} 14%, transparent)`,
        };
    return (
        <span
            className={`inline-flex items-center rounded-full border font-semibold ${size === 'md' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'} ${on === 'media' ? 'backdrop-blur-sm' : ''}`}
            style={style}
        >
            {genre}
        </span>
    );
}
