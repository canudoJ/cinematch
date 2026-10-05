import React from 'react';
import { Avatar } from './Avatar';

interface UserRowProps {
    name: string;
    avatarUrl?: string | null;
    subtitle?: string;
    /** Botones de acción a la derecha */
    actions?: React.ReactNode;
}

/** Fila de usuario (amigo, solicitud, resultado de búsqueda) */
export function UserRow({ name, avatarUrl, subtitle, actions }: UserRowProps) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5">
            <div className="flex min-w-0 items-center gap-3">
                <Avatar src={avatarUrl} name={name} size={44} ring />
                <div className="min-w-0">
                    <p className="truncate font-bold">{name}</p>
                    {subtitle && <p className="text-caption truncate">{subtitle}</p>}
                </div>
            </div>
            {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </div>
    );
}
