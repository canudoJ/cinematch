'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { readString, writeString } from '@/lib/storage';

const CHANGE_EVENT = 'cinematch:storage';

function subscribe(onChange: () => void) {
    window.addEventListener('storage', onChange); // otras pestañas
    window.addEventListener(CHANGE_EVENT, onChange); // esta pestaña
    return () => {
        window.removeEventListener('storage', onChange);
        window.removeEventListener(CHANGE_EVENT, onChange);
    };
}

/**
 * Valor de texto persistido en localStorage y sincronizado entre pestañas.
 * Durante la hidratación devuelve `serverValue` (igual que el HTML del servidor)
 * y después el guardado, sin desajustes de hidratación.
 */
export function useStoredValue<T extends string>(
    key: string,
    serverValue: T,
    isValid: (value: string) => value is T,
): [T, (value: T) => void] {
    const getSnapshot = useCallback(() => {
        const stored = readString(key);
        return stored !== null && isValid(stored) ? stored : serverValue;
    }, [key, serverValue, isValid]);

    const value = useSyncExternalStore(subscribe, getSnapshot, () => serverValue);

    const setValue = useCallback((next: T) => {
        writeString(key, next);
        window.dispatchEvent(new Event(CHANGE_EVENT));
    }, [key]);

    return [value, setValue];
}
