'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface AvatarProps {
    src?: string | null;
    name?: string | null;
    size?: number;
    /** Anillo de color de marca alrededor */
    ring?: boolean;
    className?: string;
}

/**
 * Avatar circular: la imagen si existe y carga; si no, la inicial del nombre.
 * La imagen es decorativa (alt="") porque el nombre siempre se muestra al lado.
 */
export function Avatar({ src, name, size = 40, ring = false, className = '' }: AvatarProps) {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const showImage = !!src && failedSrc !== src;
    const initial = (name?.trim()[0] ?? '?').toUpperCase();

    return (
        <span
            className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-raised)] font-bold text-[var(--secondary)] ${ring ? 'ring-2 ring-[var(--secondary)]' : ''} ${className}`}
            style={{ width: size, height: size, fontSize: size * 0.42 }}
        >
            {showImage ? (
                <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" onError={() => setFailedSrc(src)} />
            ) : (
                <span aria-hidden>{initial}</span>
            )}
        </span>
    );
}
