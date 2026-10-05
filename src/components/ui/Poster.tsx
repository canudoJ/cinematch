'use client';

import React, { useState } from 'react';
import Image from 'next/image';

export const POSTER_PLACEHOLDER = '/poster-placeholder.svg';

interface PosterProps {
    src: string | null | undefined;
    /** Título de la película (texto alternativo); '' si el título ya se muestra al lado */
    alt: string;
    /** Ancho aproximado en pantalla, para que next/image sirva el tamaño justo */
    sizes?: string;
    className?: string;
    priority?: boolean;
}

/**
 * Póster que ocupa su contenedor (el padre debe tener tamaño y `position: relative`).
 * Si no hay imagen o falla la carga, muestra un placeholder local.
 */
export function Poster({ src, alt, sizes = '200px', className = '', priority = false }: PosterProps) {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const usable = src && src !== failedSrc ? src : POSTER_PLACEHOLDER;
    return (
        <Image
            src={usable}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            className={`object-cover ${className}`}
            onError={() => src && setFailedSrc(src)}
        />
    );
}
