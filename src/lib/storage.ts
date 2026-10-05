/**
 * Acceso seguro a localStorage: nunca lanza (modo privado, almacenamiento lleno,
 * JSON corrupto o ejecución en servidor) y devuelve el valor por defecto.
 */

const APP_PREFIX = 'cinematch_';

/** Claves que sobreviven al cerrar sesión (preferencias del dispositivo, no del usuario) */
const DEVICE_KEYS = new Set(['cinematch_theme', 'cinematch_language']);

function storage(): Storage | null {
    try {
        return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
        return null;
    }
}

export function readJSON<T>(key: string, fallback: T): T {
    try {
        const raw = storage()?.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
}

/** Lee un array; si lo guardado no es un array devuelve `fallback` */
export function readArray<T>(key: string, fallback: T[] = []): T[] {
    const value = readJSON<unknown>(key, fallback);
    return Array.isArray(value) ? (value as T[]) : fallback;
}

export function writeJSON(key: string, value: unknown): void {
    try {
        storage()?.setItem(key, JSON.stringify(value));
    } catch {
        // almacenamiento lleno o bloqueado: la app sigue funcionando sin caché
    }
}

export function readString(key: string): string | null {
    try {
        return storage()?.getItem(key) ?? null;
    } catch {
        return null;
    }
}

export function writeString(key: string, value: string): void {
    try {
        storage()?.setItem(key, value);
    } catch {
        // ignorado a propósito
    }
}

export function removeKey(key: string): void {
    try {
        storage()?.removeItem(key);
    } catch {
        // ignorado a propósito
    }
}

/** Borra los datos de la app ligados al usuario, conservando tema e idioma */
export function clearAppStorage(): void {
    const store = storage();
    if (!store) return;
    try {
        const keys = Array.from({ length: store.length }, (_, i) => store.key(i)).filter(
            (key): key is string => !!key && key.startsWith(APP_PREFIX) && !DEVICE_KEYS.has(key),
        );
        keys.forEach(key => store.removeItem(key));
    } catch {
        // ignorado a propósito
    }
}
