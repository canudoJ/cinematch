import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface ModalTitlePillProps {
    id?: string;
    title: string;
    icon: LucideIcon;
    /** Color de acento (token CSS) del modo: barajas, videoteca… */
    accent: string;
    /** h1 en el título de una pantalla, h2 dentro de un modal */
    as?: 'h1' | 'h2';
    /** Clases del contenedor (por defecto, margen inferior de modal) */
    className?: string;
    /** Versión más baja para cabeceras con poco espacio */
    compact?: boolean;
}

/**
 * Título dentro de una píldora con brillo del color del modo.
 * Es el título de todos los modales y de las pantallas de juego (mismo estilo en toda la app).
 */
export function ModalTitlePill({ id, title, icon: Icon, accent, as: Heading = 'h2', className = 'mb-5', compact = false }: ModalTitlePillProps) {
    return (
        <div className={`flex min-w-0 justify-center ${className}`}>
            <div
                className={`min-w-0 max-w-full rounded-full border-2 bg-[color-mix(in_srgb,var(--background)_70%,transparent)] backdrop-blur-md ${compact ? 'px-3.5 py-1.5' : 'px-4 py-2'}`}
                style={{ borderColor: accent, boxShadow: `0 0 18px color-mix(in srgb, ${accent} 40%, transparent)` }}
            >
                <Heading id={id} className={`flex min-w-0 items-center gap-2 text-center ${compact ? 'font-display text-base font-bold sm:text-lg' : 'title-section'}`}>
                    <span className="truncate">{title}</span>
                    <Icon size={compact ? 18 : 24} className="shrink-0" style={{ color: accent }} aria-hidden />
                </Heading>
            </div>
        </div>
    );
}
