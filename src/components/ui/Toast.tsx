'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

const TOAST_DURATION_MS = 3500;

const ACCENT: Record<ToastType, string> = {
    success: 'var(--secondary)',
    error: 'var(--destructive)',
    info: 'var(--primary)',
};

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = ++nextId;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, TOAST_DURATION_MS);
    }, []);

    const value = useMemo(() => ({ showToast }), [showToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div
                role="status"
                aria-live="polite"
                className="pointer-events-none fixed bottom-[90px] left-1/2 z-[var(--z-toast)] flex -translate-x-1/2 flex-col items-center gap-2.5"
            >
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className="animate-pop-in max-w-[320px] whitespace-pre-line rounded-full bg-[var(--card)] px-[22px] py-3 text-center text-[0.9rem] font-semibold text-[var(--foreground)]"
                        style={{
                            border: `1.5px solid ${ACCENT[toast.type]}`,
                            boxShadow: `var(--shadow-lg), 0 0 12px color-mix(in srgb, ${ACCENT[toast.type]} 33%, transparent)`,
                        }}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}
