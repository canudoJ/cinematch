/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server';
import { POST as access } from '../access/route';
import { proxy } from '@/proxy';
import { ACCESS_COOKIE, accessToken, hasSiteAccess, safeEqual } from '@/lib/siteAccess';

jest.mock('@/utils/supabase/middleware', () => ({
    updateSession: jest.fn(async () => NextResponse.next()),
}));

const PASSWORD = 'zeta-demo-2026';

const accessRequest = (body: unknown) =>
    new NextRequest('http://localhost/api/access', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });

const pageRequest = (path: string, cookie?: string) =>
    new NextRequest(`http://localhost${path}`, { headers: cookie ? { cookie: `${ACCESS_COOKIE}=${cookie}` } : {} });

beforeEach(() => {
    process.env.SITE_PASSWORD = PASSWORD;
});
afterAll(() => {
    delete process.env.SITE_PASSWORD;
});

describe('token de acceso', () => {
    it('es estable para una contraseña y distinto para otra', async () => {
        expect(await accessToken(PASSWORD)).toBe(await accessToken(PASSWORD));
        expect(await accessToken(PASSWORD)).not.toBe(await accessToken('otra'));
        expect(await accessToken(PASSWORD)).toMatch(/^[0-9a-f]{64}$/);
    });

    it('la cookie solo vale para la contraseña actual', async () => {
        const token = await accessToken(PASSWORD);
        expect(await hasSiteAccess(token, PASSWORD)).toBe(true);
        expect(await hasSiteAccess(token, 'nueva-contraseña')).toBe(false);
        expect(await hasSiteAccess(undefined, PASSWORD)).toBe(false);
    });

    it('safeEqual compara contenido y longitud', () => {
        expect(safeEqual('abc', 'abc')).toBe(true);
        expect(safeEqual('abc', 'abd')).toBe(false);
        expect(safeEqual('abc', 'abcd')).toBe(false);
    });
});

describe('/api/access', () => {
    it('con la contraseña correcta deja una cookie httpOnly con el token (no la contraseña)', async () => {
        const res = await access(accessRequest({ password: PASSWORD }));
        expect(res.status).toBe(200);
        const cookie = res.cookies.get(ACCESS_COOKIE);
        expect(cookie?.value).toBe(await accessToken(PASSWORD));
        expect(cookie?.httpOnly).toBe(true);
        expect(res.headers.get('set-cookie')).not.toContain(PASSWORD);
    });

    it('con una contraseña incorrecta responde 401 y no deja cookie', async () => {
        const res = await access(accessRequest({ password: 'nope' }));
        expect(res.status).toBe(401);
        expect(res.cookies.get(ACCESS_COOKIE)).toBeUndefined();
    });

    it('rechaza cuerpos inválidos', async () => {
        expect((await access(accessRequest('{oops'))).status).toBe(400);
        expect((await access(accessRequest({ password: 123 }))).status).toBe(400);
        expect((await access(accessRequest({ password: 'x'.repeat(500) }))).status).toBe(400);
    });

    it('sin SITE_PASSWORD la web es pública', async () => {
        delete process.env.SITE_PASSWORD;
        expect((await access(accessRequest({ password: 'lo-que-sea' }))).status).toBe(200);
    });
});

describe('proxy con la web privada', () => {
    it('sin cookie, una página redirige a la pantalla de acceso conservando el destino', async () => {
        const res = await proxy(pageRequest('/profile?tab=amigos'));
        expect(res.status).toBe(307);
        const location = new URL(res.headers.get('location')!);
        expect(location.pathname).toBe('/auth/acceso');
        expect(location.searchParams.get('next')).toBe('/profile?tab=amigos');
    });

    it('sin cookie, la API responde 401 (el proxy de TMDB tampoco queda abierto)', async () => {
        const res = await proxy(pageRequest('/api/tmdb/discover/movie'));
        expect(res.status).toBe(401);
    });

    it('la pantalla de acceso y su API siempre están abiertas', async () => {
        expect((await proxy(pageRequest('/auth/acceso'))).status).toBe(200);
        expect((await proxy(pageRequest('/api/access'))).status).toBe(200);
    });

    it('con la cookie correcta deja pasar', async () => {
        const token = await accessToken(PASSWORD);
        expect((await proxy(pageRequest('/profile', token))).status).toBe(200);
        expect((await proxy(pageRequest('/api/tmdb/discover/movie', token))).status).toBe(200);
    });

    it('una cookie de una contraseña anterior ya no sirve', async () => {
        const oldToken = await accessToken('contraseña-antigua');
        expect((await proxy(pageRequest('/', oldToken))).status).toBe(307);
    });

    it('sin SITE_PASSWORD no se pide nada', async () => {
        delete process.env.SITE_PASSWORD;
        expect((await proxy(pageRequest('/'))).status).toBe(200);
    });
});
