'use client';

import { useEffect } from 'react';

/**
 * Último recurso: se muestra si falla el propio layout (por ejemplo, un provider).
 * Sustituye al layout entero, así que no puede usar contextos ni la hoja de estilos:
 * estilos en línea y texto bilingüe.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error('Global error boundary:', error);
    }, [error]);

    return (
        <html lang="es">
            <body style={{ margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#fafafa', fontFamily: 'system-ui, sans-serif' }}>
                <div role="alert" style={{ maxWidth: 420, padding: 24, textAlign: 'center' }}>
                    <h1 style={{ color: '#00e5ff' }}>Algo ha salido mal · Something went wrong</h1>
                    <p style={{ color: '#a3a3a3' }}>Recarga la página para continuar. · Reload the page to continue.</p>
                    <button
                        type="button"
                        onClick={reset}
                        style={{ marginTop: 16, padding: '12px 24px', borderRadius: 999, border: 'none', background: '#ff0055', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                    >
                        Reintentar · Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
