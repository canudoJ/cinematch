import React from 'react';
import { AlertCircle, CheckCircle, PlayCircle } from 'lucide-react';

/** Logo y lema de las pantallas de acceso */
export function AuthHeader({ subtitle }: { subtitle: string }) {
    return (
        <div className="mb-10 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary-soft)]">
                <PlayCircle size={32} className="text-[var(--primary)]" aria-hidden />
            </div>
            <h1 className="mb-2 text-5xl font-black italic tracking-tighter">CINEMATCH</h1>
            <p className="font-medium text-[var(--muted-foreground)]">{subtitle}</p>
        </div>
    );
}

/** Tarjeta translúcida que contiene el formulario */
export function AuthCard({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-3xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_80%,transparent)] p-8 shadow-2xl backdrop-blur-xl">
            {children}
        </div>
    );
}

/** Mensaje de error o de éxito del formulario (se anuncia a lectores de pantalla) */
export function FormMessage({ type, children }: { type: 'error' | 'success'; children: React.ReactNode }) {
    const error = type === 'error';
    const Icon = error ? AlertCircle : CheckCircle;
    const color = error ? 'var(--destructive)' : 'var(--secondary)';
    return (
        <div
            role={error ? 'alert' : 'status'}
            className="mb-6 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium animate-pop-in"
            style={{ color, borderColor: `color-mix(in srgb, ${color} 50%, transparent)`, background: `color-mix(in srgb, ${color} 10%, transparent)` }}
        >
            <Icon size={18} className="shrink-0" aria-hidden />
            <span>{children}</span>
        </div>
    );
}

export const authFieldLabel = 'eyebrow ml-1';
