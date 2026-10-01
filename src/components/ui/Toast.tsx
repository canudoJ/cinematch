'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

let _id = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = ++_id;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3500);
    }, []);

    const colors: Record<ToastType, string> = {
        success: 'var(--secondary)',
        error:   'var(--destructive)',
        info:    'var(--primary)',
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div style={{
                position: 'fixed', bottom: '90px', left: '50%', transform: 'translateX(-50%)',
                zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '10px', pointerEvents: 'none',
            }}>
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className="animate-pop-in"
                        style={{
                            background: 'var(--card)',
                            border: `1.5px solid ${colors[toast.type]}`,
                            color: 'var(--foreground)',
                            padding: '12px 22px',
                            borderRadius: '40px',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 12px ${colors[toast.type]}55`,
                            maxWidth: '320px',
                            textAlign: 'center',
                            whiteSpace: 'pre-line',
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
