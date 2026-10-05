import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isAuthPage, isPublicPath } from '@/lib/routes';

/**
 * Refresca la sesión de Supabase (cookies) y protege las rutas privadas.
 * Los invitados (usuarios anónimos) cuentan como sesión válida.
 */
export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    response = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
                },
            },
        },
    );

    // No poner lógica entre createServerClient y getUser(): puede cerrar sesiones al azar
    const { data: { user } } = await supabase.auth.getUser();
    const path = request.nextUrl.pathname;

    // Quien ya tiene cuenta no necesita login/registro (los invitados sí, para crear la suya)
    if (user && !user.is_anonymous && isAuthPage(path)) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    if (!user && !isPublicPath(path)) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('redirect', path + request.nextUrl.search);
        return NextResponse.redirect(loginUrl);
    }

    return response;
}
