import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    hint?: string;
    /** Llamada a la acción (normalmente un <Button>) */
    action?: React.ReactNode;
    className?: string;
}

/** Estado vacío con icono, explicación y, si procede, qué hacer a continuación */
export function EmptyState({ icon: Icon, title, hint, action, className = '' }: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center gap-3 px-6 py-10 text-center ${className}`}>
            <Icon size={44} className="text-[var(--muted-foreground)] opacity-60" aria-hidden />
            <p className="font-semibold text-[var(--foreground)]">{title}</p>
            {hint && <p className="max-w-xs text-sm text-[var(--muted-foreground)]">{hint}</p>}
            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}
