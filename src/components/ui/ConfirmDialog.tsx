'use client';

import React, { createContext, useCallback, useContext, useId, useMemo, useRef, useState } from 'react';
import { ModalShell } from './ModalShell';
import { Button } from './Button';
import { useLanguage } from '@/context/LanguageContext';

interface ConfirmOptions {
    title: string;
    message?: string;
    confirmLabel?: string;
    /** Acción destructiva: el botón de confirmar se pinta en rojo */
    destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Sustituye a window.confirm() con un diálogo accesible y con la estética de la app.
 * Uso: const confirm = useConfirm(); if (await confirm({ title: '…' })) { … }
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const { t } = useLanguage();
    const titleId = useId();
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const resolver = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback<ConfirmFn>(opts => {
        resolver.current?.(false); // un diálogo nuevo cancela el anterior
        setOptions(opts);
        return new Promise<boolean>(resolve => {
            resolver.current = resolve;
        });
    }, []);

    const close = useCallback((result: boolean) => {
        resolver.current?.(result);
        resolver.current = null;
        setOptions(null);
    }, []);

    const value = useMemo(() => confirm, [confirm]);

    return (
        <ConfirmContext.Provider value={value}>
            {children}
            {options && (
                <ModalShell onClose={() => close(false)} labelledBy={titleId} layer="dialog" panelClassName="modal-surface w-full max-w-sm">
                    <h2 id={titleId} className="title-section mb-2">{options.title}</h2>
                    {options.message && <p className="mb-6 text-sm text-[var(--muted-foreground)]">{options.message}</p>}
                    <div className="mt-4 flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => close(false)}>
                            {t.cancel}
                        </Button>
                        <Button
                            variant={options.destructive ? 'destructive' : 'default'}
                            className="flex-1"
                            onClick={() => close(true)}
                        >
                            {options.confirmLabel ?? t.confirm}
                        </Button>
                    </div>
                </ModalShell>
            )}
        </ConfirmContext.Provider>
    );
}

export function useConfirm(): ConfirmFn {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
    return ctx;
}
