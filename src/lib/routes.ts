/** Rutas exactas visibles sin sesión */
const PUBLIC_PATHS = new Set(['/']);

/** Prefijos visibles sin sesión: pantallas de acceso y barajas compartidas por enlace */
const PUBLIC_PREFIXES = ['/auth/', '/deck/'];

/** Pantallas de acceso: un usuario con cuenta no necesita verlas */
const AUTH_PAGES = new Set(['/auth/login', '/auth/register']);

const normalize = (path: string) => (path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path);

export function isPublicPath(path: string): boolean {
    const p = normalize(path);
    return PUBLIC_PATHS.has(p) || PUBLIC_PREFIXES.some(prefix => p.startsWith(prefix));
}

export function isAuthPage(path: string): boolean {
    return AUTH_PAGES.has(normalize(path));
}
