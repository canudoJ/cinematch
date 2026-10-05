'use client';

import React, { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

export type ModalLayer = 'modal' | 'modal-nested' | 'overlay' | 'dialog';

interface ModalShellProps {
    onClose: () => void;
    children: React.ReactNode;
    /** Nombre accesible del diálogo (si no hay un título visible con id) */
    label?: string;
    /** id del título visible que nombra el diálogo */
    labelledBy?: string;
    /** Capa de z-index: los modales abiertos encima de otro usan una capa mayor */
    layer?: ModalLayer;
    /** Clases del panel; por defecto, superficie de modal centrada */
    panelClassName?: string;
    /** Cerrar al pulsar fuera del panel (por defecto sí) */
    closeOnBackdrop?: boolean;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Orden de las capas: un modal de capa mayor siempre está por encima */
const LAYER_ORDER: Record<ModalLayer, number> = { modal: 0, 'modal-nested': 1, overlay: 2, dialog: 3 };

/**
 * Modales abiertos. El de arriba es el de capa mayor y, a igual capa, el último abierto.
 * (No basta el orden de registro: React ejecuta antes el efecto del hijo que el del padre.)
 */
const openStack: { id: string; layer: number; order: number }[] = [];
let openCounter = 0;

function topModalId(): string | undefined {
    return openStack.reduce<(typeof openStack)[number] | undefined>(
        (top, entry) => (!top || entry.layer > top.layer || (entry.layer === top.layer && entry.order > top.order) ? entry : top),
        undefined,
    )?.id;
}

const subscribeNoop = () => () => {};

export function ModalShell({
    onClose,
    children,
    label,
    labelledBy,
    layer = 'modal',
    panelClassName = 'modal-surface w-full max-w-lg',
    closeOnBackdrop = true,
}: ModalShellProps) {
    const id = useId();
    const panelRef = useRef<HTMLDivElement>(null);
    const onCloseRef = useRef(onClose);
    // Montado en cliente: los portales no se pueden renderizar en el servidor
    const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!mounted) return;
        const previouslyFocused = document.activeElement as HTMLElement | null;
        openStack.push({ id, layer: LAYER_ORDER[layer], order: ++openCounter });
        document.body.style.overflow = 'hidden';

        const panel = panelRef.current;
        // Solo enfoca el modal que queda arriba (un padre no debe quitarle el foco a su hijo)
        if (topModalId() === id) {
            const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE);
            (firstFocusable ?? panel)?.focus({ preventScroll: true });
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (topModalId() !== id || !panel) return;
            if (event.key === 'Escape') {
                event.stopPropagation();
                onCloseRef.current();
                return;
            }
            if (event.key !== 'Tab') return;
            const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
            if (focusables.length === 0) {
                event.preventDefault();
                return;
            }
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            openStack.splice(openStack.findIndex(entry => entry.id === id), 1);
            if (openStack.length === 0) document.body.style.overflow = '';
            previouslyFocused?.focus?.({ preventScroll: true });
        };
    }, [id, mounted, layer]);

    if (!mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 flex items-center justify-center bg-[var(--overlay)] p-4 backdrop-blur-sm animate-fade-in"
            style={{ zIndex: `var(--z-${layer})` }}
            onMouseDown={e => {
                if (closeOnBackdrop && e.target === e.currentTarget) onClose();
            }}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={labelledBy ? undefined : label}
                aria-labelledby={labelledBy}
                tabIndex={-1}
                className={`${panelClassName} animate-pop-in outline-none`}
            >
                {children}
            </div>
        </div>,
        document.body,
    );
}
