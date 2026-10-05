import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';
import { ACCESS_COOKIE, ACCESS_PAGE, hasSiteAccess, isAccessExempt } from '@/lib/siteAccess';

export async function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
    const isApi = pathname.startsWith('/api/');

    // Web privada: sin la cookie de acceso, todo (páginas y API) pide la contraseña
    const password = process.env.SITE_PASSWORD;
    if (password && !isAccessExempt(pathname) && !(await hasSiteAccess(request.cookies.get(ACCESS_COOKIE)?.value, password))) {
        if (isApi) return NextResponse.json({ error: 'locked' }, { status: 401 });
        const accessUrl = new URL(ACCESS_PAGE, request.url);
        accessUrl.searchParams.set('next', pathname + search);
        return NextResponse.redirect(accessUrl);
    }

    // Las rutas /api no usan la sesión de Supabase
    if (isApi) return NextResponse.next();
    return updateSession(request);
}

export const config = {
    // Fuera: estáticos de Next y archivos públicos (imágenes, manifest, robots…)
    matcher: ['/((?!_next/static|_next/image|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|txt|xml|webmanifest|js|map)$).*)'],
};
