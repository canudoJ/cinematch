import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rutas exactas visibles sin sesión
const PUBLIC_ROUTES = ['/']

// Prefijos visibles sin sesión: auth, barajas compartidas por enlace y el proxy de JustWatch
const PUBLIC_PREFIXES = ['/auth', '/deck/', '/api/justwatch']

// Rutas de autenticación (un usuario con sesión no necesita verlas)
const AUTH_ROUTES = ['/auth/login', '/auth/register']

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname

    // Si hay error de autenticación pero no es crítico, continuar
    if (authError && authError.message !== 'JWT expired') {
        if (process.env.NODE_ENV === 'development') {
            console.warn('[Middleware] Auth error:', authError.message)
        }
    }

    // Redirigir usuarios con cuenta que intentan acceder al login.
    // Los invitados sí pueden entrar al login/registro para crear su cuenta.
    if (AUTH_ROUTES.includes(path) && user && !user.is_anonymous) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    // Proteger rutas privadas: sin sesión → login, recordando a dónde volver
    const isPublicRoute = PUBLIC_ROUTES.includes(path) || PUBLIC_PREFIXES.some(p => path.startsWith(p))

    if (!user && !isPublicRoute) {
        const loginUrl = new URL('/auth/login', request.url)
        loginUrl.searchParams.set('redirect', path + request.nextUrl.search)
        return NextResponse.redirect(loginUrl)
    }

    return supabaseResponse
}
