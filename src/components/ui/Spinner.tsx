import React from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
    /** Texto (traducido) que se anuncia a lectores de pantalla */
    label: string;
    /** Mostrar el texto también en pantalla */
    showLabel?: boolean;
    size?: number;
    className?: string;
}

/** Indicador de carga de marca */
export function Spinner({ label, showLabel = true, size = 32, className = '' }: SpinnerProps) {
    return (
        <div role="status" className={`flex flex-col items-center justify-center gap-3 text-[var(--muted-foreground)] ${className}`}>
            <Loader2 size={size} className="animate-spin text-[var(--secondary)]" aria-hidden />
            <span className={showLabel ? 'text-sm' : 'sr-only'}>{label}</span>
        </div>
    );
}

/** Pantalla completa de carga */
export function LoadingScreen({ label }: { label: string }) {
    return (
        <div className="flex min-h-full flex-1 items-center justify-center bg-[var(--background)] p-6">
            <Spinner label={label} size={44} />
        </div>
    );
}
