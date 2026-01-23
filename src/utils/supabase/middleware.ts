import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = ['/', '/auth/login', '/auth/register', '/auth/callback']

// Rutas de autenticación
const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/callback']

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
                    cookiesToSet.forEach(({ name, value, options }) =>
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

    // Logging para debugging en desarrollo
    if (process.env.NODE_ENV === 'development') {
        console.log(`[Middleware] Path: ${path}, User: ${user ? user.id : 'none'}`)
    }

    // Si hay error de autenticación pero no es crítico, continuar
    if (authError && authError.message !== 'JWT expired') {
        if (process.env.NODE_ENV === 'development') {
            console.warn('[Middleware] Auth error:', authError.message)
        }
    }

    // Redirigir usuarios autenticados que intentan acceder a rutas de auth
    if (AUTH_ROUTES.includes(path) && user) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    // Proteger rutas privadas: si no hay usuario y no es ruta pública, redirigir a login
    const isPublicRoute = PUBLIC_ROUTES.includes(path) || path.startsWith('/auth')
    
    if (!user && !isPublicRoute) {
        return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    return supabaseResponse
}
