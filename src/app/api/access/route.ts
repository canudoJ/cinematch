import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, ACCESS_MAX_AGE_SECONDS, MAX_PASSWORD_LENGTH, accessToken, safeEqual } from '@/lib/siteAccess';

/** Pausa ante un fallo: frena los intentos por fuerza bruta */
const FAILURE_DELAY_MS = 700;

/** Comprueba la contraseña de la web y, si es correcta, deja la cookie de acceso */
export async function POST(request: NextRequest) {
    const password = process.env.SITE_PASSWORD;
    // Sin contraseña configurada la web es pública: no hay nada que comprobar
    if (!password) return NextResponse.json({ ok: true });

    let attempt: unknown;
    try {
        attempt = (await request.json())?.password;
    } catch {
        return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }
    if (typeof attempt !== 'string' || attempt.length === 0 || attempt.length > MAX_PASSWORD_LENGTH) {
        return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    // Se comparan los tokens (misma longitud siempre) y no las contraseñas
    const [expected, given] = await Promise.all([accessToken(password), accessToken(attempt)]);
    if (!safeEqual(expected, given)) {
        await new Promise(resolve => setTimeout(resolve, FAILURE_DELAY_MS));
        return NextResponse.json({ error: 'wrong_password' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ACCESS_COOKIE, expected, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: ACCESS_MAX_AGE_SECONDS,
    });
    return response;
}
