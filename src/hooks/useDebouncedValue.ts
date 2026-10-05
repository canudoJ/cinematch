'use client';

import { useEffect, useState } from 'react';

/** Devuelve `value` cuando lleva `delayMs` sin cambiar (búsquedas mientras se escribe) */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const id = window.setTimeout(() => setDebounced(value), delayMs);
        return () => window.clearTimeout(id);
    }, [value, delayMs]);

    return debounced;
}
