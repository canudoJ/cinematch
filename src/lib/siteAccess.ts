/**
 * Acceso privado a toda la web con una contraseña compartida (variable SITE_PASSWORD).
 * Sin la variable, la web es pública (desarrollo local).
 *
 * La cookie guarda un HMAC de la contraseña, nunca la contraseña: cambiarla
 * en el servidor invalida todos los accesos anteriores.
 */
export const ACCESS_COOKIE = 'cinematch_access';
export const ACCESS_PAGE = '/auth/acceso';
export const ACCESS_API = '/api/access';
/** 30 días */
export const ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
/** Contraseñas más largas se rechazan sin calcular nada */
export const MAX_PASSWORD_LENGTH = 200;

const TOKEN_MESSAGE = 'cinematch-site-access-v1';

/** Token de acceso derivado de la contraseña (HMAC-SHA256 en hexadecimal) */
export async function accessToken(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(TOKEN_MESSAGE));
    return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Comparación en tiempo constante (no revela cuántos caracteres coinciden) */
export function safeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

/** La pantalla de contraseña y su API quedan siempre abiertas */
export function isAccessExempt(path: string): boolean {
    return path === ACCESS_PAGE || path === ACCESS_API;
}

/** Si la cookie corresponde a la contraseña actual */
export async function hasSiteAccess(cookieValue: string | undefined, password: string): Promise<boolean> {
    if (!cookieValue) return false;
    return safeEqual(cookieValue, await accessToken(password));
}
