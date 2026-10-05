import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { LanguageProvider } from '@/context/LanguageContext';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';

/** Providers de interfaz (idioma, toasts y diálogos) que necesitan casi todos los componentes */
function UiProviders({ children }: { children: React.ReactNode }) {
    return (
        <LanguageProvider>
            <ToastProvider>
                <ConfirmProvider>{children}</ConfirmProvider>
            </ToastProvider>
        </LanguageProvider>
    );
}

export function renderWithProviders(ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
    return render(ui, { wrapper: UiProviders, ...options });
}
