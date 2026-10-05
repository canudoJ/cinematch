/**
 * Valida un destino de redirección recibido por URL (?redirect=…).
 * Solo admite rutas internas del mismo origen; cualquier otra cosa
 * ("//evil.com", "/\evil.com", "https://evil.com", "javascript:…") vuelve a `fallback`.
 */
export function safeRedirect(target: string | null | undefined, fallback = '/'): string {
    if (!target || !target.startsWith('/') || target.startsWith('//') || target.includes('\\')) {
        return fallback;
    }
    try {
        const base = 'https://cinematch.internal';
        const url = new URL(target, base);
        return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : fallback;
    } catch {
        return fallback;
    }
}
